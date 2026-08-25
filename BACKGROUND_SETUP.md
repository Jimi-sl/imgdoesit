# Daily Africa/Nigeria Background Setup

## Quick Setup

1. **Get API Keys (Free):**
   - Unsplash: https://unsplash.com/developers (Primary source)
   - Pixabay: https://pixabay.com/api/docs/ (Backup source)

2. **Update API Keys:**
   Open `js/daily-background.js` and replace:
   ```javascript
   this.UNSPLASH_ACCESS_KEY = 'your_unsplash_access_key';
   this.PIXABAY_API_KEY = 'your_pixabay_key';
   ```

3. **Add to Any Page:**
   ```html
   <script src="js/daily-background.js"></script>
   ```

## Features

- **Event-Based Themes:** Changes based on Nigerian/African events and dates
- **Daily Rotation:** New background every day
- **Smart Caching:** Saves bandwidth by caching daily images
- **Fallback System:** Works even if APIs fail
- **Mobile Optimized:** Responsive backgrounds

## Special Dates Covered

- January 1: New Year celebrations
- March 6: Ghana Independence Day
- May 25: Africa Day
- June 12: Nigeria Democracy Day
- October 1: Nigeria Independence Day
- Plus monthly themes for landscapes, culture, and heritage

## Manual Control

```javascript
// Force new background
localStorage.removeItem('dailyAfricaBg');
dailyBgManager.applyDailyBackground();

// Get current theme info
const theme = dailyBgManager.getCurrentTheme();
console.log(theme);
```

## Customization

Edit the `getEventKeywords()` method in `daily-background.js` to add more Nigerian/African events or change themes.