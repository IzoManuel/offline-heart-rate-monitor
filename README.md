# Offline Heart Rate Monitor

An installable Android application for monitoring a Bluetooth Low Energy heart-rate sensor. It is built as a Progressive Web App (PWA), so after the first online installation its interface loads without Wi-Fi or mobile data. Heart-rate measurements travel directly between the sensor and the phone over Bluetooth.

The app fills an initial two-minute RR window after connection, then recalculates RMSSD, SDNN, and estimated breathing rate every five seconds from the latest rolling two minutes of data.

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
- HRV results require a sensor that supplies RR-interval data

## Respiratory estimate

The HRM 200 does not send a direct breath measurement through the standard Bluetooth Heart Rate Service. It sends heart rate and RR intervals; this app estimates breathing rate from breathing-related modulation of the latest two minutes of those intervals, called respiratory sinus arrhythmia.

For each rolling refresh, the app:

1. Converts Bluetooth RR ticks (1/1024 second) to milliseconds and rejects physiologically implausible intervals.
2. Builds the irregularly timed RR tachogram and removes its linear trend.
3. Uses a Lomb–Scargle spectrum to find the dominant rhythm from 0.1–0.5 Hz (6–30 BRPM).
4. Reports the estimate only when the spectral peak is sufficiently distinct from background power.
5. Labels signal quality and withholds ambiguous, short, flat, or missing data rather than inventing a number.

The result is an indirect estimate rather than a breath measurement. Motion and signal quality can affect whether an estimate is available.

Research and protocol references:

- [Garmin HRM 200 product information](https://www.garmin.com/en-NZ/p/1530957/) — advertises real-time heart rate and HRV data.
- [Garmin respiration-rate science](https://www.garmin.com/en-US/garmin-technology/health-science/respiration-rate/) — explains respiratory sinus arrhythmia and the 12–20 BRPM typical resting range.
- [Bluetooth Heart Rate Service](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/HRS_v1.0/out/en/index-en.html) and [GATT Specification Supplement](https://btprodspecificationrefs.blob.core.windows.net/gatt-specification-supplement/GATT_Specification_Supplement.pdf) — define the RR field and its 1/1024-second unit.
- [Boyle et al., 2009](https://pubmed.ncbi.nlm.nih.gov/19775978/) — found heart-rate/RR information alone could estimate respiration, with accuracy varying substantially by activity.
- [Charlton et al., 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5390977/) and [Charlton et al., 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC7612521/) — compare and review ECG-derived breathing-rate algorithms and their limitations.

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

Pushing `main` runs [the Pages workflow](.github/workflows/deploy.yml), builds and verifies the offline application, and publishes `dist/` to GitHub Pages over HTTPS. HTTPS is required by Web Bluetooth outside localhost.

See [PLAN.md](PLAN.md) for the editable implementation plan and completion checklist.
