# Cloudflare Worker Setup Guide

## What This Does
1. Serves each blog post at a clean, readable URL — `/blog/<slug>`, slugified from
   its title — instead of an opaque `blog-post.html?id=...` link. The old ID-based
   URLs keep working forever (nothing that already links to one breaks), but now
   render with `<link rel="canonical">` pointing at the new slug URL, so search
   engines consolidate ranking signal onto the preferred address.
2. Injects the correct title, description, image, and the actual post content
   (instead of the client-JS-only "Loading post..." placeholder) plus Article
   structured data on both URL styles — so both social previews and search engine
   crawlers see the real page on the first request.
3. Generates `/sitemap.xml` live from Contentful, listing every post at its new
   `/blog/<slug>` URL.
4. Proxies comment submissions to Contentful's Management API, so the write-capable
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
- Click **"Add Route"** again
- Route: `*imgdoesit.com/sitemap.xml*`
- Worker: Select `imgdoesit-blog-meta`
- Click **"Save"**
- Click **"Add Route"** again
- Route: `*imgdoesit.com/blog/*`
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
- Test SEO rendering: `curl -s "https://www.imgdoesit.com/blog-post.html?id=<a-real-post-id>"`
  and confirm the response HTML already contains the post's `<h1>` and body text, not
  "Loading post..." — that's the difference between crawlers seeing real content
  immediately vs. having to execute JavaScript first
- Test the new slug URLs: open a post from `blog.html`'s "Read More" link and confirm
  it lands on `/blog/<slug>` (not `blog-post.html?id=...`) and renders correctly,
  including the comments section (which depends on `window.__POST_ID__` being set)
- Test the old links still work: `curl -s "https://www.imgdoesit.com/blog-post.html?id=<a-real-post-id>"`
  should still return 200 with real content, and its `<link rel="canonical">` should
  point at the post's `/blog/<slug>` URL instead of the id-based one
- Test the sitemap: open `https://www.imgdoesit.com/sitemap.xml` and confirm it lists
  a `<url>` entry for every published post, not just the two static pages
- Once the Worker route for `/sitemap.xml` is live, submit the sitemap in
  [Google Search Console](https://search.google.com/search-console) (Sitemaps > Add
  a new sitemap) so Google knows to crawl the newly-listed post URLs

## How It Works
1. Someone (or a crawler) requests a blog post page
2. Cloudflare Worker intercepts the request before it reaches GitHub Pages
3. Worker fetches the post (and its featured image) from Contentful
4. Worker injects the correct title/description/image meta tags, renders the actual
   post content into the HTML, and adds Article structured data
5. The response already contains real content — no JavaScript execution required to
   see it, which is what both social media bots and search engine crawlers rely on

Note: `js/blog-post.js` still fetches and re-renders the same content client-side
after the page loads (e.g. for the comments section, which isn't server-rendered).
That's expected and harmless — it just re-paints the same content once JS runs.

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
