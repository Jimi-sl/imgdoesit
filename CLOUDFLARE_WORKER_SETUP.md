# Cloudflare Worker Setup Guide

## What This Does
1. Intercepts blog post page requests and injects the correct title and description
   into meta tags so Twitter, Facebook, and LinkedIn show proper previews when shared.
2. Proxies comment submissions to Contentful's Management API, so the write-capable
   management token lives only as an encrypted Worker secret and is never shipped to
   the browser.

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

### 4. Add the Routes
- Go back to your domain dashboard
- Click **"Workers Routes"** (under Workers & Pages)
- Click **"Add Route"**
- Route: `*imgdoesit.com/blog-post.html*`
- Worker: Select `imgdoesit-blog-meta`
- Click **"Save"**
- Click **"Add Route"** again
- Route: `*imgdoesit.com/api/comments*`
- Worker: Select `imgdoesit-blog-meta`
- Click **"Save"**

### 5. Add the Management Token as a Secret
- Open the `imgdoesit-blog-meta` Worker
- Go to **Settings > Variables**
- Under "Environment Variables", click **"Add variable"**
- Name: `CONTENTFUL_MANAGEMENT_TOKEN`
- Value: paste your **new, rotated** Contentful management token (never the old leaked one)
- Click the **encrypt** toggle before saving, so it's stored as a secret, not plaintext
- Click **"Save and Deploy"**

### 6. Test It
- Open a blog post URL in your browser (should work as normal)
- Test social sharing preview:
  - Twitter: https://cards-dev.twitter.com/validator
  - Facebook: https://developers.facebook.com/tools/debug/
  - LinkedIn: https://www.linkedin.com/post-inspector/
- Test commenting: open a blog post, submit a comment, confirm it shows "will appear
  once approved" and then check the new entry appears in Contentful (draft/pending)

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
