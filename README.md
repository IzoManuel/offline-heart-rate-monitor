# Offline Heart Rate Monitor

An installable Android application for monitoring a Bluetooth Low Energy heart-rate sensor. It is built as a Progressive Web App (PWA), so after the first online installation its interface loads without Wi-Fi or mobile data. Heart-rate measurements travel directly between the sensor and the phone over Bluetooth.

This project is based on [guyru/web-hr-monitor](https://github.com/guyru/web-hr-monitor) and retains its MIT license.

## Install on Android

Use current Google Chrome on an Android phone that supports Bluetooth Low Energy.

1. Turn on Bluetooth and visit the GitHub Pages link shown in this repository's **About** section.
2. Wait for the first page load to finish.
3. Open Chrome's three-dot menu and choose **Add to Home screen** or **Install app**.
4. Confirm **Install**.
5. Launch **HR Monitor** from the new home-screen icon.
6. Tap **Connect to HR Monitor**, grant the Nearby devices permission if Android asks, and select your sensor.

You can now disable Wi-Fi and mobile data and reopen the app from its icon. Android/Chrome may require you to select the Bluetooth device again after the app or sensor has been closed; this is a browser security feature.

### Confirm offline operation

After installing, close the app completely, enable airplane mode, turn Bluetooth back on, and launch the home-screen app. The interface should load and the connection button should open the Bluetooth device picker.

## Requirements and limitations

- Android with recent Google Chrome and Bluetooth Low Energy support
- A sensor implementing the standard Bluetooth Heart Rate Service (`0x180D`)
- Nearby devices permission; some older Android versions may also request Location
- The first visit and installation require internet access
- Firefox for Android does not implement Web Bluetooth
- Bluetooth device discovery must follow a user tap, so the app cannot silently connect on startup

No account, remote API, or cloud service is used. The service worker only caches the application shell on the device.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To create and verify the production PWA:

```bash
npm run build
npm run verify:pwa
npm run preview
```

The production files are generated in `dist/`. PWA/service-worker behavior is enabled in production builds, not the Vite development server.

## Deployment

Pushing `main` runs [the Pages workflow](.github/workflows/deploy-pages.yml), builds the application, and publishes `dist/` to GitHub Pages over HTTPS. HTTPS is required by Web Bluetooth outside localhost.

See [PLAN.md](PLAN.md) for the editable implementation plan and completion checklist.
