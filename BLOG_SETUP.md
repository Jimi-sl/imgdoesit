# Blog Setup Instructions - Contentful Integration

## What You've Got
- Blog listing page: `blog.html`
- Individual blog post page: `blog-post.html`
- Blog JavaScript files: `js/blog.js` and `js/blog-post.js`
- Blog CSS: `css/blog.css`
- Navigation updated with Blog link

## Contentful Setup Steps

### 1. Create Contentful Account
- Go to https://www.contentful.com/
- Sign up for a free account
- Create a new space (name it whatever you like, e.g., "ImgDoesIt Blog")

### 2. Create Content Model
In Contentful, create a new Content Type called "Blog Post" with these fields:

**Content Type ID:** `blogPost` (important - must match exactly)

**Fields:**
1. **Title** (Short text, required)
   - Field ID: `title`
   
2. **Publish Date** (Date and time, required)
   - Field ID: `publishDate`
   
3. **Author** (Short text, optional)
   - Field ID: `author`
   
4. **Featured Image** (Media, optional)
   - Field ID: `featuredImage`
   
5. **Content** (Long text, required)
   - Field ID: `content`

### 3. Get Your API Credentials
1. Go to Settings → API keys
2. Click "Add API key"
3. Copy these two values:
   - **Space ID**
   - **Content Delivery API - access token**

### 4. Update Your Code
Open these two files and replace the placeholder values:

**File: `js/blog.js`**
```javascript
const CONTENTFUL_SPACE_ID = 'YOUR_SPACE_ID'; // Replace with your actual Space ID
const CONTENTFUL_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Replace with your actual Access Token
```

**File: `js/blog-post.js`**
```javascript
const CONTENTFUL_SPACE_ID = 'YOUR_SPACE_ID'; // Replace with your actual Space ID
const CONTENTFUL_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Replace with your actual Access Token
```

### 5. Create Your First Blog Post
1. In Contentful, go to Content
2. Click "Add entry" → "Blog Post"
3. Fill in:
   - Title: Your blog post title
   - Publish Date: Choose a date
   - Author: Your name (optional)
   - Featured Image: Upload an image (optional)
   - Content: Write your blog post content
4. Click "Publish" (top right)

### 6. Upload to GoDaddy
Upload these files to your GoDaddy hosting:
- `blog.html`
- `blog-post.html`
- `js/blog.js`
- `js/blog-post.js`
- `css/blog.css`
- Updated `index.htm` (with Blog link in navigation)

### 7. Test
- Visit `yoursite.com/blog.html`
- You should see your blog posts
- Click "Read More" to view individual posts

## How to Add New Blog Posts
1. Log into Contentful
2. Go to Content → Add entry → Blog Post
3. Fill in the fields
4. Click Publish
5. Your website will automatically fetch and display the new post (no code changes needed!)

## Troubleshooting
- If posts don't show: Check browser console (F12) for errors
- Verify Space ID and Access Token are correct
- Make sure blog posts are "Published" in Contentful (not just saved as drafts)
- Check that Content Type ID is exactly `blogPost`

## Free Tier Limits
Contentful free tier includes:
- 25,000 records
- 2 users
- 48 API calls per second
- More than enough for a small business blog

## Need Help?
- Contentful Documentation: https://www.contentful.com/developers/docs/
- Contentful Support: Available in your Contentful dashboard
