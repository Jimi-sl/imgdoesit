// Contentful Configuration
const CONTENTFUL_SPACE_ID = 'xdddd10ff6v5'; // Replace with your Contentful Space ID
const CONTENTFUL_ACCESS_TOKEN = 'wz4K0E8_IdR2Gb0j9QkQS9txumikzNc5lY2TzUQHHtk'; // Replace with your Contentful Access Token
const CONTENTFUL_API_URL = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/entries?access_token=${CONTENTFUL_ACCESS_TOKEN}&content_type=blogPost`;

// Store posts for filtering
let allPosts = [];

// Turns a post title into a URL slug. Keep this identical to the copy of
// slugify() in cloudflare-worker.js, which resolves these URLs back to posts.
function slugify(text) {
    const slug = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (slug.length <= 80) return slug;
    return slug.slice(0, 80).replace(/-[^-]*$/, '');
}

// Fetch blog posts from Contentful
async function fetchBlogPosts() {
    try {
        const response = await fetch(CONTENTFUL_API_URL);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            allPosts = data.items;
            displayBlogPosts(allPosts);
        } else {
            document.getElementById('blog-body').innerHTML = '<p>No blog posts available yet.</p>';
        }
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        document.getElementById('blog-body').innerHTML = '<p>Unable to load blog posts. Please try again later.</p>';
    }
}

// Convert Rich Text to plain text for excerpt
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

// Display blog posts
function displayBlogPosts(posts) {
    const blogBody = document.getElementById('blog-body');
    blogBody.innerHTML = '';
    
    posts.forEach(post => {
        const fields = post.fields;
        const postCard = document.createElement('div');
        postCard.className = 'blog-card';
        
        // Convert rich text to plain text for excerpt
        const plainText = richTextToPlainText(fields.body);
        const excerpt = plainText ? plainText.substring(0, 150) + '...' : 'Read more...';
        
        postCard.innerHTML = `
            <div class="blog-card-content">
                <h3>${fields.title}</h3>
                <p class="blog-excerpt">${excerpt}</p>
                <a href="blog/${slugify(fields.title)}" class="blog-read-more">Read More</a>
            </div>
        `;
        
        blogBody.appendChild(postCard);
    });
}

// Load blog posts when page loads
if (document.getElementById('blog-body')) {
    fetchBlogPosts();
}

// Search functionality
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            displayBlogPosts(allPosts);
            return;
        }
        const filtered = allPosts.filter(post => {
            const title = (post.fields.title || '').toLowerCase();
            const body = richTextToPlainText(post.fields.body).toLowerCase();
            return title.includes(query) || body.includes(query);
        });
        if (filtered.length > 0) {
            displayBlogPosts(filtered);
        } else {
            document.getElementById('blog-body').innerHTML = '<p>No posts found matching your search.</p>';
        }
    });
}
