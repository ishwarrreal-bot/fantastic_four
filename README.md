# Color Vision Assistant

A browser extension that helps color blind individuals see colors they cannot distinguish by applying intelligent color filters across all websites (YouTube, Twitter, Reddit, etc.).

## Features

- 🌈 **Color Correction Filters**: Applies filters to help distinguish colors based on your color vision type
- 🌐 **Works Everywhere**: Functions across all websites including YouTube, Twitter, Reddit, and more
- 🎨 **Multiple Vision Types**: Supports Protanopia, Deuteranopia, Tritanopia, and their variants
- ⚡ **Real-time Application**: Filters are applied instantly as you browse
- 💾 **Persistent Settings**: Your preferences are saved and applied automatically

## Installation

### Development Build

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the extension in Chrome/Edge:
   - Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### Creating Icons

The extension needs icon files. You can:
1. Create icons manually (16x16, 48x48, 128x128 pixels)
2. Use the `scripts/create-icons.html` file to generate simple icons
3. Place icon files in `dist/icons/` as:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

## Usage

1. Click the extension icon in your browser toolbar
2. Select your color vision type from the dropdown
3. Toggle the filter on/off
4. The filter will be applied to all websites you visit

## Color Vision Types

- **Normal**: No filter applied
- **Protanopia**: Red color blindness correction
- **Protanomaly**: Red color vision deficiency correction
- **Deuteranopia**: Green color blindness correction
- **Deuteranomaly**: Green color vision deficiency correction
- **Tritanopia**: Blue color blindness correction
- **Tritanomaly**: Blue color vision deficiency correction
- **Achromatopsia**: Complete color blindness - enhanced contrast mode

## How It Works

The extension uses CSS filters and color transformation algorithms to:
- Shift hues to make colors more distinguishable
- Enhance saturation to increase color contrast
- Adjust contrast and brightness for better visibility
- Apply filters globally across all web content

## Development

### Project Structure

```
├── src/
│   ├── popup/          # Extension popup UI
│   └── utils/          # Color correction utilities
├── public/
│   ├── content.js      # Content script for web pages
│   ├── background.js   # Background service worker
│   └── popup.html      # Popup HTML
├── dist/               # Built extension (after npm run build)
├── manifest.json       # Extension manifest
└── package.json        # Dependencies
```

### Building

```bash
npm run build
```

This will:
1. Build the React popup UI
2. Copy extension files to the `dist` folder
3. Prepare the extension for loading

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

