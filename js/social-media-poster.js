// Social Media Auto-Poster for ImgDoesIt
// Posts daily Africa/Nigeria themed content to Instagram, LinkedIn, and X (Twitter)

class SocialMediaPoster {
    constructor() {
        // X (Twitter) API v2
        this.X_API_KEY = 'your_x_api_key';
        this.X_API_SECRET = 'your_x_api_secret';
        this.X_ACCESS_TOKEN = 'your_x_access_token';
        this.X_ACCESS_SECRET = 'your_x_access_token_secret';
        this.X_BEARER_TOKEN = 'your_x_bearer_token';

        // LinkedIn API
        this.LINKEDIN_ACCESS_TOKEN = 'your_linkedin_access_token';
        this.LINKEDIN_ORG_ID = 'your_linkedin_org_id'; // Your company page ID

        // Instagram (via Meta Graph API)
        this.INSTAGRAM_ACCESS_TOKEN = 'your_instagram_access_token';
        this.INSTAGRAM_BUSINESS_ID = 'your_instagram_business_account_id';

        this.cacheKey = 'dailySocialPost';
    }

    // Generate platform-specific captions
    generateCaptions(imageData, eventKeywords) {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const theme = eventKeywords.join(', ');
        const description = imageData.description || 'the beauty of Africa';

        const specialDateCaptions = this.getSpecialDateCaption(today);

        const base = specialDateCaptions || `Celebrating ${description} — the spirit of Africa shines through every day.`;

        return {
            x: this.generateXCaption(base, eventKeywords),
            linkedin: this.generateLinkedInCaption(base, description, dateStr, eventKeywords),
            instagram: this.generateInstagramCaption(base, description, dateStr, eventKeywords, imageData.credit)
        };
    }

    getSpecialDateCaption(today) {
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const key = `${month}-${day}`;

        const captions = {
            '1-1': '🎆 Happy New Year from Africa! A new chapter begins — full of promise, innovation, and the unstoppable spirit of the continent.',
            '3-6': '🇬🇭 Happy Independence Day, Ghana! Celebrating freedom, resilience, and the pioneering spirit of West Africa.',
            '5-25': '🌍 Happy Africa Day! One continent, many nations, united in culture, innovation, and boundless potential.',
            '6-12': '🇳🇬 June 12 — Democracy Day! Honouring the courage and sacrifice that shaped Nigeria\'s democratic journey.',
            '10-1': '🇳🇬 Happy Independence Day, Nigeria! 🎉 Celebrating the strength, creativity, and resilience of over 200 million people.',
            '12-25': '🎄 Merry Christmas from Africa! Celebrating love, family, and togetherness across the continent.'
        };

        return captions[key] || null;
    }

    generateXCaption(base, keywords) {
        const hashtags = ['#Africa', '#Nigeria', '#ImgDoesIt', '#Tech', '#SoftwareDevelopment'];
        const eventTags = keywords.slice(0, 2).map(k => `#${k.replace(/\s+/g, '')}`);
        const allTags = [...new Set([...eventTags, ...hashtags])].slice(0, 5);

        // X has 280 char limit
        const caption = `${base}\n\n${allTags.join(' ')}`;
        return caption.length > 280 ? `${base.substring(0, 240)}...\n\n${allTags.join(' ')}` : caption;
    }

    generateLinkedInCaption(base, description, dateStr, keywords) {
        return `${base}

At ImgDoesIt, we build software solutions inspired by the innovation and creativity across Africa. Every day, we're reminded of the incredible talent and potential this continent holds.

🌍 Today's theme: ${description}
📅 ${dateStr}

#Africa #Nigeria #ImgDoesIt #SoftwareDevelopment #Innovation #TechInAfrica ${keywords.slice(0, 2).map(k => `#${k.replace(/\s+/g, '')}`).join(' ')}`;
    }

    generateInstagramCaption(base, description, dateStr, keywords, credit) {
        return `${base}

🌍 Today's theme: ${description}
📅 ${dateStr}
📸 ${credit}

We're ImgDoesIt — building software solutions from the heart of innovation. Africa inspires everything we do.

🔗 Link in bio

.
.
.
#Africa #Nigeria #Lagos #Abuja #ImgDoesIt #SoftwareDevelopment #TechInAfrica #AfricanInnovation #NigeriaTech #AfricaRising #CodeInAfrica #StartupAfrica #WebDevelopment #MobileApps #Innovation ${keywords.map(k => `#${k.replace(/\s+/g, '')}`).join(' ')}`;
    }

    // Post to X (Twitter) via API v2
    async postToX(caption, imageUrl) {
        try {
            // Step 1: Upload media
            const mediaId = await this.uploadMediaToX(imageUrl);

            // Step 2: Create tweet with media
            const response = await fetch('https://api.twitter.com/2/tweets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.X_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: caption,
                    media: mediaId ? { media_ids: [mediaId] } : undefined
                })
            });

            if (!response.ok) throw new Error(`X API error: ${response.status}`);
            const data = await response.json();
            console.log('✅ Posted to X:', data.data?.id);
            return { success: true, id: data.data?.id };
        } catch (error) {
            console.error('❌ X posting failed:', error);
            return { success: false, error: error.message };
        }
    }

    async uploadMediaToX(imageUrl) {
        try {
            const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.X_BEARER_TOKEN}` },
                body: JSON.stringify({ media_data: imageUrl })
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.media_id_string;
        } catch { return null; }
    }

    // Post to LinkedIn via API
    async postToLinkedIn(caption, imageUrl) {
        try {
            // Step 1: Register image upload
            const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.LINKEDIN_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    registerUploadRequest: {
                        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                        owner: `urn:li:organization:${this.LINKEDIN_ORG_ID}`,
                        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
                    }
                })
            });

            let mediaAsset = null;
            if (registerResponse.ok) {
                const registerData = await registerResponse.json();
                const uploadUrl = registerData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
                mediaAsset = registerData.value?.asset;

                if (uploadUrl) {
                    const imageBlob = await (await fetch(imageUrl)).blob();
                    await fetch(uploadUrl, { method: 'PUT', headers: { 'Authorization': `Bearer ${this.LINKEDIN_ACCESS_TOKEN}` }, body: imageBlob });
                }
            }

            // Step 2: Create post
            const postBody = {
                author: `urn:li:organization:${this.LINKEDIN_ORG_ID}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text: caption },
                        shareMediaCategory: mediaAsset ? 'IMAGE' : 'NONE',
                        media: mediaAsset ? [{ status: 'READY', media: mediaAsset }] : []
                    }
                },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
            };

            const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.LINKEDIN_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postBody)
            });

            if (!response.ok) throw new Error(`LinkedIn API error: ${response.status}`);
            const data = await response.json();
            console.log('✅ Posted to LinkedIn:', data.id);
            return { success: true, id: data.id };
        } catch (error) {
            console.error('❌ LinkedIn posting failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Post to Instagram via Meta Graph API
    async postToInstagram(caption, imageUrl) {
        try {
            // Step 1: Create media container
            const containerResponse = await fetch(
                `https://graph.facebook.com/v18.0/${this.INSTAGRAM_BUSINESS_ID}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_url: imageUrl,
                        caption: caption,
                        access_token: this.INSTAGRAM_ACCESS_TOKEN
                    })
                }
            );

            if (!containerResponse.ok) throw new Error(`Instagram container error: ${containerResponse.status}`);
            const containerData = await containerResponse.json();

            // Step 2: Publish the container
            const publishResponse = await fetch(
                `https://graph.facebook.com/v18.0/${this.INSTAGRAM_BUSINESS_ID}/media_publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        creation_id: containerData.id,
                        access_token: this.INSTAGRAM_ACCESS_TOKEN
                    })
                }
            );

            if (!publishResponse.ok) throw new Error(`Instagram publish error: ${publishResponse.status}`);
            const publishData = await publishResponse.json();
            console.log('✅ Posted to Instagram:', publishData.id);
            return { success: true, id: publishData.id };
        } catch (error) {
            console.error('❌ Instagram posting failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if already posted today
    hasPostedToday() {
        const cached = localStorage.getItem(this.cacheKey);
        if (!cached) return false;
        return JSON.parse(cached).date === new Date().toDateString();
    }

    // Main: post to all platforms
    async postToAllPlatforms(imageData, eventKeywords) {
        if (this.hasPostedToday()) {
            console.log('📌 Already posted today, skipping.');
            return;
        }

        const captions = this.generateCaptions(imageData, eventKeywords);
        const imageUrl = imageData.url;

        const results = {
            x: await this.postToX(captions.x, imageUrl),
            linkedin: await this.postToLinkedIn(captions.linkedin, imageUrl),
            instagram: await this.postToInstagram(captions.instagram, imageUrl)
        };

        // Cache today's post
        localStorage.setItem(this.cacheKey, JSON.stringify({
            date: new Date().toDateString(),
            captions,
            results,
            imageUrl
        }));

        console.log('📊 Social media posting results:', results);
        return results;
    }

    // Get today's generated captions (for preview)
    previewCaptions(imageData, eventKeywords) {
        return this.generateCaptions(imageData, eventKeywords);
    }
}

// Initialize
const socialPoster = new SocialMediaPoster();
window.SocialMediaPoster = socialPoster;
