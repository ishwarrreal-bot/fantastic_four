# Installation Instructions

## Quick Start

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Load the extension in Chrome/Edge:**
   - Open your browser and go to:
     - Chrome: `chrome://extensions/`
     - Edge: `edge://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Navigate to and select the `dist` folder from this project

3. **Use the extension:**
   - Click the extension icon in your browser toolbar
   - Select your color vision type
   - Toggle the filter on
   - The filter will now be applied to all websites you visit!

## Building from Source

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the extension:**
   ```bash
   npm run build
   ```

3. **The built extension will be in the `dist` folder**

## Notes

- The extension works on all websites including YouTube, Twitter, Reddit, etc.
- Your filter preferences are saved and will be applied automatically
- You can toggle the filter on/off at any time
- The filter applies in real-time as you browse

## Troubleshooting

- If the extension doesn't appear, make sure you selected the `dist` folder (not the parent folder)
- If the filter doesn't apply, try refreshing the page
- Make sure the extension is enabled in the extensions page

