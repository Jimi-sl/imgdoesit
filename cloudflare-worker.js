// Cloudflare Worker for Dynamic Meta Tags + SEO Rendering + Comment Submission Proxy
//
// - GET  /blog-post.html?id=...  -> injects real title/description/OG/image tags AND the
//                                    actual post title+body into the HTML (instead of the
//                                    client-JS-only "Loading post..." placeholder), plus
//                                    Article structured data, so crawlers see real content
//                                    on the first request without running JS
// - GET  /sitemap.xml             -> generated live from Contentful, so every blog post is
//                                    discoverable instead of just the static pages
// - POST /api/comments           -> creates a Contentful comment entry server-side, so the
//                                    write-capable management token never reaches the browser
//
// Requires three Worker Routes pointed at this script (see CLOUDFLARE_WORKER_SETUP.md):
//   *imgdoesit.com/blog-post.html*
//   *imgdoesit.com/sitemap.xml*
//   *imgdoesit.com/api/comments*
//
// CONTENTFUL_MANAGEMENT_TOKEN is intentionally NOT defined in this file. Add it as an
// encrypted variable (secret) on the Worker in the Cloudflare dashboard instead
// (Settings > Variables > Add variable > Encrypt). Cloudflare injects it as a global
// of the same name at runtime, which is why handleCommentSubmission below references it
// without declaring it.

// Read-only Content Delivery API token - safe to keep public, used only for reads.
const CONTENTFUL_SPACE_ID = 'xdddd10ff6v5';
const CONTENTFUL_ACCESS_TOKEN = 'wz4K0E8_IdR2Gb0j9QkQS9txumikzNc5lY2TzUQHHtk';
const COMMENT_CONTENT_TYPE = 'comment';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/api/comments' && request.method === 'POST') {
    return handleCommentSubmission(request);
  }

  if (url.pathname === '/sitemap.xml') {
    return handleSitemap(request);
  }

  // Only intercept blog-post.html requests with an ID parameter
  if (url.pathname === '/blog-post.html' && url.searchParams.has('id')) {
    const postId = url.searchParams.get('id');

    try {
      // Fetch the original HTML from origin, bypassing the worker to avoid loop
      const originUrl = new URL(request.url);
      originUrl.searchParams.delete('id');
      const response = await fetch(originUrl.toString(), {
        headers: request.headers,
        redirect: 'follow',
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
      
      // If origin returns 404 or error, pass through
      if (!response.ok) {
        return response;
      }
      
      let html = await response.text();

      // Fetch blog post data from Contentful, including linked assets (featured image)
      const contentfulUrl = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/entries/${postId}?access_token=${CONTENTFUL_ACCESS_TOKEN}&include=1`;
      const postResponse = await fetch(contentfulUrl);

      if (!postResponse.ok) {
        // If Contentful fails, return original HTML
        return new Response(html, response);
      }

      const postData = await postResponse.json();

      if (postData.fields) {
        const title = postData.fields.title || 'Blog Post';
        const description = extractDescription(postData.fields.body);
        const fullTitle = `${title} - ImgDoesIt`;
        const escapedTitle = escapeHtml(fullTitle);
        const escapedDescription = escapeHtml(description);
        const assets = postData.includes?.Asset || [];
        const ogImage = findFeaturedImageUrl(postData.fields, assets);
        const bodyHtml = richTextToHtml(postData.fields.body);

        // Replace meta tags in HTML
        html = html.replace(
          /<title>.*?<\/title>/,
          `<title>${escapedTitle}</title>`
        );

        html = html.replace(
          /<meta name="description" content=".*?">/,
          `<meta name="description" content="${escapedDescription}">`
        );

        html = html.replace(
          /<meta property="og:title" content=".*?">/,
          `<meta property="og:title" content="${escapedTitle}">`
        );

        html = html.replace(
          /<meta property="og:description" content=".*?">/,
          `<meta property="og:description" content="${escapedDescription}">`
        );

        html = html.replace(
          /<meta property="og:image" content=".*?">/,
          `<meta property="og:image" content="${ogImage}">`
        );

        html = html.replace(
          /<meta property="og:url" content=".*?">/,
          `<meta property="og:url" content="${url.href}">`
        );

        html = html.replace(
          /<meta property="twitter:url" content=".*?">/,
          `<meta property="twitter:url" content="${url.href}">`
        );

        html = html.replace(
          /<meta property="twitter:title" content=".*?">/,
          `<meta property="twitter:title" content="${escapedTitle}">`
        );

        html = html.replace(
          /<meta property="twitter:description" content=".*?">/,
          `<meta property="twitter:description" content="${escapedDescription}">`
        );

        html = html.replace(
          /<meta property="twitter:image" content=".*?">/,
          `<meta property="twitter:image" content="${ogImage}">`
        );

        // Update canonical URL
        html = html.replace(
          /<link rel="canonical" href=".*?">/,
          `<link rel="canonical" href="${url.href}">`
        );

        // Render the actual post into the page instead of leaving the
        // client-JS-only "Loading post..." placeholder for crawlers that
        // don't execute JavaScript (or execute it late/unreliably).
        html = html.replace(
          /<div id="blog-post-content" class="entry">[\s\S]*?<\/div>/,
          `<div id="blog-post-content" class="entry">\n                <h1>${escapeHtml(title)}</h1>\n                <div class="blog-post-body">${bodyHtml}</div>\n            </div>`
        );

        // Article structured data for rich results
        const articleLd = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: title,
          description,
          image: ogImage,
          datePublished: postData.sys.createdAt,
          dateModified: postData.sys.updatedAt,
          author: { '@type': 'Organization', name: 'ImgDoesIt' },
          publisher: { '@type': 'Organization', name: 'ImgDoesIt' },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url.href }
        };
        const articleLdJson = JSON.stringify(articleLd).replace(/</g, '\\u003c');
        html = html.replace(
          '</head>',
          `<script type="application/ld+json">${articleLdJson}</script>\n    </head>`
        );
      }

      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': 'text/html;charset=UTF-8',
          'cache-control': 'public, max-age=3600'
        }
      });
      
    } catch (error) {
      // If anything fails, try to return original page
      console.error('Worker error:', error);
      return fetch(request);
    }
  }
  
  // For all other requests, pass through to origin
  return fetch(request);
}

// Creates a Contentful comment entry using the management token, which lives only
// as a Worker secret - it never gets sent to or read by the browser.
async function handleCommentSubmission(request) {
  try {
    const data = await request.json();
    const name = String(data.name || '').trim().slice(0, 50);
    const body = String(data.body || '').trim().slice(0, 500);
    const postId = String(data.postId || '').trim();

    if (!name || !body || !postId) {
      return jsonResponse({ error: 'Missing name, body, or postId.' }, 400);
    }

    const response = await fetch(
      `https://api.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/master/entries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}`,
          'Content-Type': 'application/vnd.contentful.management.v1+json',
          'X-Contentful-Content-Type': COMMENT_CONTENT_TYPE
        },
        body: JSON.stringify({
          fields: {
            name: { 'en-US': name },
            body: { 'en-US': body },
            postId: { 'en-US': postId }
          }
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Contentful comment creation failed: ${response.status} ${errorBody}`);
      return jsonResponse({ error: 'Failed to submit comment.' }, 502);
    }

    return jsonResponse({ success: true }, 201);
  } catch (error) {
    console.error('Comment submission error:', error);
    return jsonResponse({ error: 'Invalid request.' }, 400);
  }
}

// Generates sitemap.xml live from Contentful so every blog post is listed,
// not just the static pages. Falls back to the committed static file on error.
async function handleSitemap(request) {
  try {
    const siteUrl = 'https://www.imgdoesit.com';
    const contentfulUrl = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/entries?access_token=${CONTENTFUL_ACCESS_TOKEN}&content_type=blogPost&order=-sys.updatedAt`;
    const res = await fetch(contentfulUrl);
    const data = res.ok ? await res.json() : { items: [] };
    const posts = data.items || [];

    const staticEntries = [
      `  <url>\n    <loc>${siteUrl}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
      `  <url>\n    <loc>${siteUrl}/blog.html</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    ];

    const postEntries = posts.map(post => {
      const lastmod = (post.sys.updatedAt || post.sys.createdAt || '').slice(0, 10);
      return `  <url>\n    <loc>${siteUrl}/blog-post.html?id=${post.sys.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...postEntries].join('\n')}\n</urlset>\n`;

    return new Response(xml, {
      headers: {
        'content-type': 'application/xml;charset=UTF-8',
        'cache-control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return fetch(request);
  }
}

// Picks the featured image the same way the client does: first linked asset,
// falling back to the explicit featuredImage reference, then a site default.
function findFeaturedImageUrl(fields, assets) {
  const defaultImage = 'https://www.imgdoesit.com/img/sun.jpeg';
  if (assets.length > 0 && assets[0]?.fields?.file?.url) {
    return `https:${assets[0].fields.file.url}`;
  }
  const featuredId = fields.featuredImage?.sys?.id;
  if (featuredId) {
    const matched = assets.find(a => a.sys.id === featuredId);
    if (matched?.fields?.file?.url) return `https:${matched.fields.file.url}`;
  }
  return defaultImage;
}

// Server-side mirror of the client's richTextToHtml() in js/blog-post.js,
// escaping text content since this now renders directly into the response.
function richTextToHtml(richText) {
  if (!richText || !richText.content) return '';

  let html = '';
  for (const node of richText.content) {
    if (node.nodeType === 'paragraph') {
      html += '<p>';
      if (node.content) {
        for (const textNode of node.content) {
          if (textNode.value) html += escapeHtml(textNode.value);
        }
      }
      html += '</p>';
    } else if (node.nodeType === 'heading-1' && node.content) {
      html += '<h2>';
      for (const textNode of node.content) {
        if (textNode.value) html += escapeHtml(textNode.value);
      }
      html += '</h2>';
    } else if (node.nodeType === 'heading-2' && node.content) {
      html += '<h3>';
      for (const textNode of node.content) {
        if (textNode.value) html += escapeHtml(textNode.value);
      }
      html += '</h3>';
    }
  }
  return html;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

// Helper function to escape HTML entities
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Helper function to extract description from Contentful Rich Text
function extractDescription(richText) {
  if (!richText || !richText.content) {
    return 'Read this article from ImgDoesIt about software development, technology, and IT solutions.';
  }
  
  let text = '';
  for (const node of richText.content) {
    if (node.nodeType === 'paragraph' && node.content) {
      for (const textNode of node.content) {
        if (textNode.value) {
          text += textNode.value + ' ';
        }
      }
      if (text.length > 155) break;
    }
  }
  
  text = text.trim();
  if (text.length > 155) {
    text = text.substring(0, 152) + '...';
  }
  
  return text || 'Read this article from ImgDoesIt about software development, technology, and IT solutions.';
}
