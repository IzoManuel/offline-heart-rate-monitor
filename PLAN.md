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
9. Add respiratory insight and improve the compact connected-device summary.
   - Research what the Garmin HRM 200 actually transmits over Bluetooth before choosing a calculation.
   - Derive an explicitly labeled estimated respiratory rate only when the RR data and signal quality support it.
   - Reuse each completed two-minute RR window so respiratory and HRV results update together.
   - Add a detailed respiratory section at the bottom with rate, interpretation, quality, and limitations.
   - Expand the connected-device dropdown into an at-a-glance summary of BPM, HRV, and respiratory information.
   - Rework the mobile dropdown layout so it cannot overlap the Disconnect control.
   - Add deterministic calculation tests, responsive review, PWA verification, and live deployment checks.
10. Replace fixed two-minute result batches with a rolling analysis refreshed every five seconds.
   - Maintain one rolling two-minute RR-data window rather than starting 20+ overlapping tests.
   - Recompute HRV and estimated breathing rate every five seconds from the same bounded window.
   - Publish the first valid metrics after the initial two-minute window fills, then refresh them every five seconds.
   - Keep memory bounded by pruning readings older than two minutes.
   - Show rolling-window collection status when there is not yet enough data for valid metrics.
11. Simplify and normalize the interface copy.
   - Remove “Keep the sensor connected and remain still.”
   - Remove resting-range interpretations such as “Below the typical adult resting range.”
   - Remove the long movement/medical-disclaimer paragraph from the results view.
   - Use title case for visible labels unless the label is an acronym such as BPM, HRV, RR, RMSSD, SDNN, or BRPM.
   - Rename the compact “Resting Respiration” card to “BRPM”; do not describe live exercise data as resting.
   - Review the mobile connected summary again after the copy and timing changes.
12. Add timestamped BPM, RMSSD, and BRPM extrema without adding cards.
   - Store the receipt time of every heart-rate reading for the active connection session.
   - Add the occurrence time to the existing detailed Maximum and Minimum BPM cards.
   - Track RMSSD minimum and maximum values across valid five-second rolling refreshes, including when each occurred.
   - Add RMSSD minimum/maximum values and times inside the existing detailed RMSSD card.
   - Add BPM minimum/maximum values and times inside the existing summary Heart Rate card.
   - Add RMSSD minimum/maximum values and times inside the existing summary RMSSD card.
   - Track BRPM minimum/maximum values across valid estimates and add their times inside the existing detailed and summary BRPM cards.
   - Preserve the current number of detailed and summary cards and verify the denser cards on mobile.

### Respiratory-analysis brainstorm

- Treat breathing rate as an estimate derived from respiratory sinus arrhythmia in RR intervals, not as a measurement transmitted directly by the strap, unless Garmin's documentation proves otherwise.
- Use a transparent, dependency-free algorithm suitable for a two-minute window: clean RR intervals, build cumulative beat timestamps, detrend the irregular RR series, then use a Lomb–Scargle spectrum (which supports uneven sample timing directly) to identify dominant power within a physiologically bounded breathing-frequency band.
- Report breaths per minute from the spectral peak and attach a signal-quality/confidence value based on peak prominence and usable data duration.
- Withhold the number when data is missing, too short, implausible, or spectrally ambiguous; show the reason instead of producing false precision.
- Keep the latest completed respiratory estimate visible while the next automatic analysis window runs, matching the established HRV behavior.
- Keep medical wording conservative: wellness estimate only, not a diagnosis or a substitute for a respiratory monitor.

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
- [x] Continuous HRV update deployed and verified on GitHub Pages
- [x] Garmin HRM 200 transmitted data and RR-derived respiration method researched
- [x] Respiratory estimator implemented with validation and quality reporting
- [x] Respiratory calculation tests cover valid, insufficient, and ambiguous signals
- [x] Detailed respiratory section added below HRV details
- [x] Summary dropdown shows current BPM, latest HRV, and respiratory estimate
- [x] Mobile dropdown and Disconnect control no longer overlap
- [x] Updated production PWA built, deployed, and verified live
- [x] Rolling two-minute RR window implemented without overlapping tests
- [x] HRV and BRPM results refresh every five seconds
- [x] Rolling window is pruned and waits for sufficient data safely
- [x] Requested explanatory text removed from the UI
- [x] Visible metric labels use title case except acronyms
- [x] Summary respiratory card renamed to BRPM
- [x] Updated rolling analysis tests and mobile visual review pass
- [x] Rolling-analysis update deployed and verified live
- [x] Timestamped session BPM extrema tracked and tested
- [x] Timestamped rolling RMSSD extrema tracked and tested
- [x] Timestamped rolling BRPM extrema tracked and tested
- [x] Existing detailed BPM cards show occurrence times
- [x] Existing detailed RMSSD card includes minimum/maximum times
- [x] Existing summary Heart Rate and RMSSD cards include extrema and times
- [x] Existing detailed and summary BRPM cards include extrema and times
- [x] No additional metric cards introduced
- [x] Denser cards reviewed on mobile
- [x] Timestamped-extrema update deployed and verified live
