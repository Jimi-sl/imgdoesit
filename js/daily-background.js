// Daily Background Manager for Nigeria/Africa Events
class DailyBackgroundManager {
    constructor() {
        this.UNSPLASH_ACCESS_KEY = 'BhHSc0rp25o4LiRzwyNu-fD6uvvtDEauA9r7bFeZUlQ';
        this.PEXELS_API_KEY = 'vspD8Y3rvYe96yMMganJbYk45KJnXkG5vkqBJeBvv8Mm5vY3CHdZPmXj';
    }

    // Deterministic seed from today's date (same number every day, everywhere)
    getDaySeed() {
        const today = new Date();
        return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    }

    // Nigeria/Africa event-based keywords by month and special dates
    getEventKeywords() {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const specialDates = {
            '1-1': ['new year', 'celebration', 'fireworks', 'nigeria'],
            '2-14': ['love', 'valentine', 'couples', 'africa'],
            '3-6': ['independence', 'ghana', 'celebration'],
            '3-21': ['human rights', 'africa', 'unity'],
            '4-27': ['freedom', 'south africa', 'mandela'],
            '5-25': ['africa day', 'unity', 'continent', 'celebration'],
            '6-12': ['democracy', 'nigeria', 'june 12'],
            '7-1': ['republic', 'ghana', 'independence'],
            '8-9': ['women', 'south africa', 'heritage'],
            '9-24': ['heritage', 'south africa', 'culture'],
            '10-1': ['independence', 'nigeria', 'green white green'],
            '11-11': ['independence', 'angola', 'celebration'],
            '12-25': ['christmas', 'celebration', 'africa', 'family']
        };

        const dateKey = `${month}-${day}`;
        if (specialDates[dateKey]) return specialDates[dateKey];

        const monthlyThemes = {
            1: ['lagos', 'abuja', 'nigeria', 'new year'],
            2: ['sahara', 'desert', 'africa', 'landscape'],
            3: ['savanna', 'wildlife', 'africa', 'nature'],
            4: ['victoria falls', 'zambia', 'zimbabwe', 'waterfall'],
            5: ['kilimanjaro', 'tanzania', 'mountain', 'africa'],
            6: ['cape town', 'south africa', 'table mountain'],
            7: ['nile river', 'egypt', 'africa', 'ancient'],
            8: ['serengeti', 'kenya', 'tanzania', 'wildlife'],
            9: ['morocco', 'marrakech', 'architecture', 'africa'],
            10: ['nigeria', 'independence', 'culture', 'heritage'],
            11: ['ethiopia', 'highlands', 'coffee', 'culture'],
            12: ['ghana', 'gold coast', 'celebration', 'africa']
        };

        return monthlyThemes[month] || ['africa', 'landscape', 'culture', 'nature'];
    }

    // Deterministic keyword and page for today
    getDailyQuery() {
        const seed = this.getDaySeed();
        const keywords = this.getEventKeywords();
        const keyword = keywords[seed % keywords.length];
        const page = (seed % 10) + 1; // page 1-10
        const index = seed % 15; // pick from results
        return { keyword, page, index };
    }

    // Fetch from Unsplash using search (deterministic)
    async fetchUnsplashImage() {
        const { keyword, page, index } = this.getDailyQuery();

        try {
            const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword + ' africa')}&orientation=landscape&page=${page}&per_page=15&client_id=${this.UNSPLASH_ACCESS_KEY}`
            );

            if (!response.ok) throw new Error('Unsplash API failed');

            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const photo = data.results[index % data.results.length];
                return {
                    url: photo.urls.full,
                    credit: `Photo by ${photo.user.name} on Unsplash`,
                    description: photo.description || photo.alt_description || 'Daily Africa/Nigeria themed background'
                };
            }
            return null;
        } catch (error) {
            console.error('Unsplash fetch failed:', error);
            return null;
        }
    }

    // Fetch from Pexels using search (deterministic)
    async fetchPexelsImage() {
        const { keyword, page, index } = this.getDailyQuery();

        try {
            const response = await fetch(
                `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword + ' africa')}&orientation=landscape&page=${page}&per_page=15`,
                { headers: { 'Authorization': this.PEXELS_API_KEY } }
            );

            if (!response.ok) throw new Error('Pexels API failed');

            const data = await response.json();
            if (data.photos && data.photos.length > 0) {
                const photo = data.photos[index % data.photos.length];
                return {
                    url: photo.src.original,
                    credit: `Photo by ${photo.photographer} on Pexels`,
                    description: photo.alt || 'Daily Africa/Nigeria themed background'
                };
            }
            return null;
        } catch (error) {
            console.error('Pexels fetch failed:', error);
            return null;
        }
    }

    // Fallback images for Nigeria/Africa
    getFallbackImages() {
        return [
            { url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', credit: 'Lagos, Nigeria', description: 'Lagos skyline' },
            { url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80', credit: 'African Savanna', description: 'African landscape' },
            { url: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2067&q=80', credit: 'Cape Town, South Africa', description: 'Table Mountain view' }
        ];
    }

    // Get daily background image
    async getDailyBackground() {
        const seed = this.getDaySeed();
        const useUnsplashFirst = seed % 2 === 0;

        let imageData = useUnsplashFirst
            ? (await this.fetchUnsplashImage() || await this.fetchPexelsImage())
            : (await this.fetchPexelsImage() || await this.fetchUnsplashImage());

        if (!imageData) {
            const fallbacks = this.getFallbackImages();
            imageData = fallbacks[seed % fallbacks.length];
        }

        if (window.SocialMediaPoster) {
            window.SocialMediaPoster.postToAllPlatforms(imageData, this.getEventKeywords());
        }

        return imageData;
    }

    // Apply background to page
    async applyDailyBackground() {
        try {
            const imageData = await this.getDailyBackground();

            if (imageData && imageData.url) {
                const img = new Image();
                img.onload = () => {
                    const heroSection = document.getElementById('home');
                    if (heroSection) {
                        heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.15), rgba(255,255,255,0.25)), url(${imageData.url})`;
                        heroSection.style.backgroundSize = 'cover';
                        heroSection.style.backgroundPosition = 'center';
                        heroSection.style.backgroundAttachment = 'fixed';
                    }

                    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.15), rgba(255,255,255,0.25)), url(${imageData.url})`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    document.body.style.backgroundAttachment = 'fixed';

                    this.addImageCredit(imageData);
                };
                img.src = imageData.url;
            }
        } catch (error) {
            console.error('Failed to apply daily background:', error);
        }
    }

    // Add image credit inside hero box
    addImageCredit(imageData) {
        const existingCredit = document.getElementById('bg-credit');
        if (existingCredit) existingCredit.remove();

        const heroSection = document.getElementById('doesitfor');
        if (heroSection) {
            const credit = document.createElement('div');
            credit.id = 'bg-credit';
            credit.innerHTML = `
                <div style="position: absolute; bottom: 8px; right: 12px; color: rgba(255, 255, 255, 0.9); font-family: 'Questrial', sans-serif; font-size: 10px; letter-spacing: 0.3px; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);">
                    ${imageData.credit}
                </div>
            `;

            if (getComputedStyle(heroSection).position === 'static') {
                heroSection.style.position = 'relative';
            }

            heroSection.appendChild(credit);
        }
    }

    getCurrentTheme() {
        return { keywords: this.getEventKeywords(), date: new Date().toDateString() };
    }
}

const dailyBgManager = new DailyBackgroundManager();

document.addEventListener('DOMContentLoaded', () => {
    dailyBgManager.applyDailyBackground();
});

window.DailyBackgroundManager = dailyBgManager;
