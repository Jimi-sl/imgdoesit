// Contentful Configuration
const CONTENTFUL_SPACE_ID = 'xdddd10ff6v5'; // Replace with your Contentful Space ID
const CONTENTFUL_ACCESS_TOKEN = 'wz4K0E8_IdR2Gb0j9QkQS9txumikzNc5lY2TzUQHHtk'; // Replace with your Contentful Access Token
const COMMENT_CONTENT_TYPE = 'comment';
// Comment submission no longer talks to Contentful's Management API directly from here -
// it posts to the Cloudflare Worker's /api/comments route instead, which holds the
// write-capable management token server-side. See cloudflare-worker.js.

// Get post ID from the page (set server-side by the Worker, since /blog/<slug>
// URLs carry no ?id= param) or fall back to the query string for direct/old links.
function getPostIdFromUrl() {
    if (window.__POST_ID__) return window.__POST_ID__;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Convert Rich Text to HTML
function richTextToHtml(richText) {
    if (!richText || !richText.content) return '';
    
    let html = '';
    richText.content.forEach(node => {
        if (node.nodeType === 'paragraph') {
            html += '<p>';
            if (node.content) {
                node.content.forEach(textNode => {
                    if (textNode.value) {
                        html += textNode.value;
                    }
                });
            }
            html += '</p>';
        } else if (node.nodeType === 'heading-1' && node.content) {
            html += '<h2>';
            node.content.forEach(textNode => {
                if (textNode.value) html += textNode.value;
            });
            html += '</h2>';
        } else if (node.nodeType === 'heading-2' && node.content) {
            html += '<h3>';
            node.content.forEach(textNode => {
                if (textNode.value) html += textNode.value;
            });
            html += '</h3>';
        }
    });
    return html;
}

// Fetch single blog post
async function fetchBlogPost(postId) {
    try {
        const response = await fetch(`https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/entries/${postId}?access_token=${CONTENTFUL_ACCESS_TOKEN}`);
        const post = await response.json();

        // Fetch linked assets (for featured image)
        const assetsResponse = await fetch(`https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/entries?access_token=${CONTENTFUL_ACCESS_TOKEN}&sys.id=${postId}`);
        const assetsData = await assetsResponse.json();
        const assets = assetsData.includes?.Asset || [];

        displayBlogPost(post, assets);
    } catch (error) {
        console.error('Error fetching blog post:', error);
        document.getElementById('blog-post-content').innerHTML = '<p>Unable to load blog post. Please try again later.</p>';
    }
}

// Display single blog post
function displayBlogPost(post, assets) {
    const postContent = document.getElementById('blog-post-content');
    const fields = post.fields;

    // Get featured image from Contentful assets or fallback
    const defaultImage = 'https://www.imgdoesit.com/img/sun.jpeg';
    let ogImage = defaultImage;
    if (assets && assets.length > 0 && assets[0].fields?.file?.url) {
        ogImage = 'https:' + assets[0].fields.file.url;
    } else if (fields.featuredImage?.sys?.id) {
        // If there's a linked asset reference, try to resolve it
        const matched = assets.find(a => a.sys.id === fields.featuredImage.sys.id);
        if (matched?.fields?.file?.url) ogImage = 'https:' + matched.fields.file.url;
    }
    
    // Update page title
    document.title = fields.title + ' - ImgDoesIt';
    
    // Convert rich text to plain text for meta description
    const plainText = richTextToPlainText(fields.body);
    const metaDescription = plainText ? plainText.substring(0, 155) : 'Read this article from ImgDoesIt.';
    
    // Update meta tags dynamically
    updateMetaTag('name', 'description', metaDescription);
    updateMetaTag('property', 'og:title', fields.title + ' - ImgDoesIt');
    updateMetaTag('property', 'og:description', metaDescription);
    updateMetaTag('property', 'og:image', ogImage);
    updateMetaTag('property', 'og:url', window.location.href);
    updateMetaTag('property', 'twitter:title', fields.title + ' - ImgDoesIt');
    updateMetaTag('property', 'twitter:description', metaDescription);
    updateMetaTag('property', 'twitter:image', ogImage);
    updateMetaTag('property', 'twitter:url', window.location.href);
    
    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = window.location.href;
    
    // Convert rich text to HTML
    const formattedContent = richTextToHtml(fields.body);
    
    postContent.innerHTML = `
        <h1>${fields.title}</h1>
        <div class="blog-post-body">${formattedContent}</div>
    `;

    fetchComments(post.sys.id);
}

// Helper function to update meta tags
function updateMetaTag(attr, attrValue, content) {
    let element = document.querySelector(`meta[${attr}="${attrValue}"]`);
    if (element) {
        element.setAttribute('content', content);
    }
}

// Helper function to convert Rich Text to plain text
function richTextToPlainText(richText) {
    if (!richText || !richText.content) return '';
    
    let text = '';
    richText.content.forEach(node => {
        if (node.nodeType === 'paragraph' && node.content) {
            node.content.forEach(textNode => {
                if (textNode.value) {
                    text += textNode.value + ' ';
                }
            });
        }
    });
    return text.trim();
}

// Fetch published comments for a blog post
async function fetchComments(postId) {
    const commentsList = document.getElementById('comments-list');
    try {
        const response = await fetch(
            `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/entries?access_token=${CONTENTFUL_ACCESS_TOKEN}&content_type=${COMMENT_CONTENT_TYPE}&fields.postId=${postId}&order=-sys.createdAt`
        );
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            commentsList.innerHTML = data.items.map(item => `
                <div class="comment">
                    <div class="comment-header">
                        <strong>${escapeHtml(item.fields.name)}</strong>
                        <span>${new Date(item.sys.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <p>${escapeHtml(item.fields.body)}</p>
                </div>
            `).join('');
        } else {
            commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        commentsList.innerHTML = '<p>Unable to load comments.</p>';
    }
}

// Submit a new comment (saved as draft in Contentful for moderation)
async function submitComment() {
    const name = document.getElementById('comment-name').value.trim();
    const body = document.getElementById('comment-body').value.trim();
    const status = document.getElementById('comment-status');
    const submitBtn = document.getElementById('comment-submit');

    if (!name || !body) {
        status.textContent = 'Please fill in your name and comment.';
        status.className = 'comment-error';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    status.textContent = '';

    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, body, postId })
        });

        if (response.ok) {
            status.textContent = 'Comment submitted! It will appear once approved.';
            status.className = 'comment-success';
            document.getElementById('comment-name').value = '';
            document.getElementById('comment-body').value = '';
        } else {
            throw new Error('Failed to submit');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        status.textContent = 'Failed to submit comment. Please try again.';
        status.className = 'comment-error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load blog post when page loads
const postId = getPostIdFromUrl();
if (postId) {
    fetchBlogPost(postId);
} else {
    document.getElementById('blog-post-content').innerHTML = '<p>Blog post not found.</p>';
}
