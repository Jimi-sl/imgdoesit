// Cloudflare Worker for Dynamic Meta Tags
// This intercepts blog-post.html requests and injects proper meta tags

// Your Contentful credentials
const CONTENTFUL_SPACE_ID = 'xdddd10ff6v5';
const CONTENTFUL_ACCESS_TOKEN = 'wz4K0E8_IdR2Gb0j9QkQS9txumikzNc5lY2TzUQHHtk';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  
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
      
      // Fetch blog post data from Contentful
      const contentfulUrl = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/entries/${postId}?access_token=${CONTENTFUL_ACCESS_TOKEN}`;
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
        
        // Update canonical URL
        html = html.replace(
          /<link rel="canonical" href=".*?">/,
          `<link rel="canonical" href="${url.href}">`
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
