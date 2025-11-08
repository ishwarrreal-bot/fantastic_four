# What Changed

## From Simulator to Assistant

The application has been completely transformed from a **color blindness simulator** to a **color vision assistant browser extension**.

### Previous Version
- Web app that simulated how color blind people see
- Camera/image upload to test filters
- Showed what colors look like with color blindness

### New Version
- **Browser extension** that works across all websites
- **Helps color blind users** see colors they can't distinguish
- **Real-time filtering** on YouTube, Twitter, Reddit, and all websites
- **Persistent settings** that save your preferences

## How It Works

1. **Color Correction Filters**: Instead of simulating color blindness, the extension applies filters that shift colors into ranges visible to color blind users
   - Protanopia/Protanomaly: Shifts reds toward yellow/orange (visible colors)
   - Deuteranopia/Deuteranomaly: Shifts greens toward cyan/blue (visible colors)
   - Tritanopia/Tritanomaly: Enhances blue/yellow distinction
   - Achromatopsia: Maximizes contrast for complete color blindness

2. **Global Application**: The extension injects CSS filters into all web pages, making colors more distinguishable in real-time

3. **Easy Control**: Simple popup interface to select your color vision type and toggle the filter on/off

## Installation

1. Build the extension: `npm run build`
2. Load the `dist` folder in Chrome/Edge as an unpacked extension
3. Click the extension icon and enable your filter
4. Browse any website - the filter will be applied automatically!

## Files Structure

- `manifest.json` - Extension configuration
- `public/content.js` - Script that applies filters to web pages
- `public/background.js` - Background service worker
- `src/popup/` - React-based popup UI
- `dist/` - Built extension (ready to load in browser)

## Key Features

✅ Works on all websites  
✅ Real-time color correction  
✅ Persistent settings  
✅ Multiple color vision types supported  
✅ Easy to use popup interface  
✅ No page refresh needed  

