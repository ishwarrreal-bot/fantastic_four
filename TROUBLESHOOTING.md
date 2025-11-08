# Troubleshooting - Dropdown Not Showing

If you don't see the dropdown in the extension popup, try these steps:

## Step 1: Reload the Extension
1. Go to `chrome://extensions/` (or `edge://extensions/`)
2. Find "Color Vision Assistant"
3. Click the **reload/refresh icon** (circular arrow)
4. Close and reopen the popup

## Step 2: Check for Errors
1. Right-click on the extension popup
2. Select "Inspect" or "Inspect Popup"
3. Check the Console tab for any errors
4. If you see errors, note them down

## Step 3: Verify Files
Make sure the extension is loaded from the `dist` folder, not the `src` folder.

## Step 4: What You Should See
The popup should show:
- Header: "Color Vision Assistant" (blue/purple gradient)
- **Dropdown: "Select Your Color Vision Type:"** (THIS IS THE DROPDOWN)
- Description text below dropdown
- Enable/Disable toggle
- Tip box
- Reset and Enable buttons

## Step 5: If Still Not Working
1. Remove the extension completely
2. Rebuild: `npm run build`
3. Load the extension again from the `dist` folder
4. Try again

## The Dropdown Location
The dropdown is located **right below the header**, at the very top of the popup content area. It's a standard HTML `<select>` element with 8 options.

