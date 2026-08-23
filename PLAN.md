# Offline Android PWA delivery plan

1. Inspect the workspace and authenticated GitHub account.
2. Import the upstream Web HR Monitor source into this directory.
3. Add an installable manifest, icons, and a service worker that precaches the production build.
4. Document Android installation and offline usage.
5. Build and test the production output, manifest, service worker, and offline navigation.
6. Publish a public repository and deploy it with GitHub Pages.
7. Verify the live HTTPS application and installation assets.
8. Replace the manual HRV test with a continuous automatic two-minute analysis cycle.
   - Start automatically whenever a monitor or playback session connects.
   - Analyze the current window every two minutes and immediately begin the next window.
   - Keep the latest completed results visible while the next window collects data.
   - Update the visible results after every completed window.

## Completion checklist

- [x] Workspace and GitHub authentication inspected
- [x] Upstream application imported
- [x] Installable Android PWA support added
- [x] Offline application shell generated and verified
- [x] Android installation instructions documented
- [x] Production build and automated checks passed
- [x] Public GitHub repository created and pushed
- [x] GitHub Pages deployment enabled and successful
- [x] Live application and PWA assets verified
- [x] Automatic HRV cycle starts on connection
- [x] HRV results update every two minutes and the next cycle starts immediately
- [x] Latest HRV results remain visible during the next cycle
- [x] Continuous HRV behavior tested and production build verified
- [ ] Continuous HRV update deployed and verified on GitHub Pages
