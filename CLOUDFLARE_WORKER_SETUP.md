# Cloudflare Worker Setup Guide

## What This Does
Intercepts blog post page requests and injects the correct title and description 
into meta tags so Twitter, Facebook, and LinkedIn show proper previews when shared.

## Setup Steps

### 1. Log into Cloudflare
- Go to https://dash.cloudflare.com/
- Select your domain (imgdoesit.com)

### 2. Create the Worker
- In the left sidebar, click **"Workers & Pages"**
- Click **"Create"**
- Click **"Create Worker"**
- Name it: `imgdoesit-blog-meta`
- Click **"Deploy"**

### 3. Add the Code
- After deploying, click **"Edit Code"**
- Delete the default code
- Copy and paste the entire contents of `cloudflare-worker.js` into the editor
- Click **"Save and Deploy"**

### 4. Add the Route
- Go back to your domain dashboard
- Click **"Workers Routes"** (under Workers & Pages)
- Click **"Add Route"**
- Route: `*imgdoesit.com/blog-post.html*`
- Worker: Select `imgdoesit-blog-meta`
- Click **"Save"**

### 5. Test It
- Open a blog post URL in your browser (should work as normal)
- Test social sharing preview:
  - Twitter: https://cards-dev.twitter.com/validator
  - Facebook: https://developers.facebook.com/tools/debug/
  - LinkedIn: https://www.linkedin.com/post-inspector/

## How It Works
1. Someone shares a blog post link on social media
2. The social media bot requests the page
3. Cloudflare Worker intercepts the request
4. Worker fetches the blog post title from Contentful
5. Worker injects the correct title and description into meta tags
6. Social media bot reads the correct meta tags
7. Proper preview is shown with the blog post title and description

## Free Tier Limits
- 100,000 requests per day (more than enough)
- 10ms CPU time per request
- No credit card required

## Troubleshooting
- If previews still show generic text, clear the cache:
  - Facebook: Use the debug tool and click "Scrape Again"
  - Twitter: Wait a few minutes for cache to clear
- Check the Worker logs in Cloudflare dashboard for errors
- Make sure the route pattern matches exactly
