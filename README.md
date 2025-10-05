# Heart Rate Monitor

A responsive single-page application (SPA) for monitoring heart rate using Web Bluetooth API.

## Features

- 🫀 Real-time heart rate monitoring via BLE devices
- 📊 Track current, average, max, and min heart rate
- 📱 Responsive design for mobile and desktop
- 🔒 Secure Web Bluetooth API integration

## Requirements

- Modern browser with Web Bluetooth support (Chrome, Edge)
- HTTPS connection (or localhost for development)
- BLE heart rate monitor device

### Enabling Web Bluetooth

**Linux & Older Windows Versions:**
1. Open Chrome/Edge browser
2. Navigate to `chrome://flags#enable-experimental-web-platform-features`
3. Enable the "Experimental Web Platform features" flag
4. Restart your browser

**Windows 10/11 (Recent versions) & Android:**
- Web Bluetooth is enabled by default in Chrome/Edge

**Note:** macOS and iOS do not support Web Bluetooth API.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open browser and navigate to `http://localhost:3000`

4. Click "Connect to HR Monitor" and select your heart rate device

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder, ready to deploy to GitHub Pages.

## Future Enhancements

- Heart rate graphing over time
- HRV (Heart Rate Variability) analysis
- Session history and data export
- Workout zone tracking

## Browser Compatibility

This application requires a browser that supports the Web Bluetooth API:
- Chrome 56+
- Edge 79+
- Opera 43+

Note: Firefox and Safari do not currently support Web Bluetooth.
