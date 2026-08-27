# Offline Android PWA delivery plan

Parity contract: ../SHARED_FEATURES.md. Add every new user-facing feature to both platform plans and the shared contract.

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
13. Persist the latest session across page reloads.
   - Use a small, versioned React/browser-storage snapshot rather than adding a Vue-only state library such as Pinia.
   - Persist only the latest session summary: last BPM, BPM statistics/count, HRV/BRPM results, extrema, session start, and save time.
   - Do not persist Bluetooth device handles or pretend a restored session is still connected.
   - Restore saved values into both the compact summary and detailed metric views after reload.
   - Label restored values as a saved session with the save time.
   - Provide an explicit Clear Saved Data control.
   - Start a clean live metric session on each new Bluetooth connection while retaining privacy-local storage only.
   - Validate malformed/version-mismatched storage safely and test save/load/clear behavior.
14. Protect saved data from accidental deletion.
   - Require an explicit confirmation before Clear Saved Data removes the local snapshot.
   - Keep cancellation non-destructive and use a mobile-accessible browser dialog.
   - Rebuild, test, deploy, and verify the updated production bundle.
15. Add consistent metric summaries and a bounded selectable trend graph.
   - Remove seconds from all displayed occurrence/update/save times while retaining exact timestamps internally.
   - Extend the existing RMSSD and BRPM cards with session average values, and add minimum, average, and maximum values with occurrence times to SDNN without adding metric cards.
   - Sample one compact graph point every five seconds containing Heart Rate and the latest valid RMSSD, SDNN, and BRPM values.
   - Store graph points asynchronously in IndexedDB rather than synchronous localStorage, retain only the latest session, and cap history at 1,440 points (about two hours at five-second resolution).
   - Restore the graph without a Bluetooth connection, clear its IndexedDB history together with Clear Saved Data, and fail safely if storage is unavailable or evicted.
   - Render one accessible time-series chart with selectable Heart Rate, RMSSD, SDNN, and BRPM series.
   - Normalize each selected line to its own observed range for the shared plot while showing raw units and ranges, avoiding a misleading shared numeric axis for BPM, milliseconds, and BRPM.
   - Distinguish series by labels, color, and line pattern; include a textual latest-value summary and mobile-friendly controls.
   - Add deterministic tests for bounded history and metric averages, perform responsive review, rebuild, deploy, and verify live.
16. Make the normalized trend graph easier to read precisely.
   - Label the Y-axis as relative position from 0% to 100% so it cannot be mistaken for any metric's raw unit.
   - On pointer hover or touch, select the nearest five-second sample and show its exact time and raw values with units for every enabled metric.
   - Add a vertical inspection guide and per-series point markers at the selected timestamp.
   - Make the chart focusable and support keyboard inspection with Left Arrow, Right Arrow, Home, and End.
   - Keep the readout usable on mobile, add deterministic nearest-point tests, rebuild, deploy, and verify live.
17. Limit graph checkboxes strictly to plotted lines.
   - Keep every summary and detail card visible regardless of graph selection.
   - Keep all four graph value/range cards and exact inspection values visible when their lines are hidden.
   - Use checkboxes only to show or hide graph paths and their inspection markers.
   - Rebuild, test, deploy, and verify the clarified interaction live.
18. Support long-running history with bounded adaptive granularity.
   - Stop clearing graph history on each new connection; keep sessions separated by visible gaps while the latest summary remains session-specific.
   - Cap IndexedDB history at 10,000 compact records and progressively average adjacent older samples when the cap is reached instead of deleting the oldest history.
   - Add Auto, 5-Second, 1-Minute, 15-Minute, 1-Hour, and 1-Day graph granularity controls.
   - Aggregate each metric independently so missing HRV or BRPM values do not distort available Heart Rate data.
   - Make Auto choose a bucket size that limits rendered points for mobile performance while preserving the full bounded history.
   - Never draw lines across large sampling or disconnected-session gaps.
   - Keep Clear Saved Data as the explicit way to erase both recent and long-term graph history.
   - Add deterministic aggregation, compaction, and gap tests; perform mobile/build/PWA checks; deploy and verify live.

### Long-term trend storage decision

- A year of raw five-second samples would exceed 6.3 million records, so retaining every raw point indefinitely is intentionally avoided.
- The database remains capped at 10,000 records. When full, adjacent records are averaged and compacted, trading old precision for long retention without unbounded storage.
- Display granularity is independent of storage resolution: users can request a coarser view, while Auto targets a manageable number of SVG points.
- Long-range values are trends derived from averages, not raw beat-level measurements; exact five-second detail is naturally concentrated in more recent history.

27. Extend CSV export resolution and range selection.
   - Research accessible export controls and time-series aggregation conventions.
   - Keep raw five-second export available while adding 1-minute, 5-minute, 15-minute, 1-hour, 1-day, 1-week, 1-month, and 1-year aggregation.
   - Add optional local date/time start and end filters; reject an inverted range and preserve session-aware independent metric averages/counts.
   - Keep export complete and offline, with explicit timestamps, units, session identity, and aggregation metadata.
   - Add deterministic filtering/aggregation tests and verify mobile layout.
28. Add an opt-in web Screen Reader control.
   - Follow Web Speech API and WCAG-compatible control patterns: explicit enablement, interval selection, metric selection, cancellation, and visible unsupported-browser feedback.
   - Persist preferences locally, read only available current metrics, avoid speech queue buildup, and keep the existing visual cards unchanged.
   - Add accessibility and production regression checks.
29. Keep alert behavior in parity with Android.
   - Add compact persisted metric alerts for DDFA α10, RMSSD, SDNN, Heart Rate, and BRPM.
   - Support Above/Below thresholds, configurable repeat intervals, hysteresis, spoken alerts, and browser notifications.
   - Request notification permission only from an explicit user action; show an accessible status when unsupported or denied.
   - Document browser background-execution limits and add alert evaluation tests.
30. Repair web Screen Reader playback stability.
   - [x] Investigate reports of no audible output and trace the speech effect lifecycle during five-second live updates.
   - [x] Prevent live snapshot rerenders from cancelling an utterance or recreating the speech timer.
   - [x] Keep the latest snapshot and selected metrics available to a stable interval callback, with safe browser API guards.
   - [x] Run the production regression suite; manual device playback verification remains recommended on a supported browser.
31. Polish web form controls for visual and mobile consistency.
   - [x] Review Screen Reader, Metric Alerts, Average Scope, and export control layout and identify inconsistent native styling.
   - [x] Apply shared labels, fields, borders, focus states, spacing, checkbox chips, and responsive form grids using the existing design tokens.
   - [x] Verify the production build and inspect the forms at desktop and narrow mobile widths.
19. Add calendar-scale long-term graph granularity.
   - Add Week, Month, and Year choices to the existing granularity selector.
   - Bucket weeks from local Monday midnight and bucket months/years at their actual local calendar boundaries rather than fixed-duration approximations.
   - Preserve independent metric weighting, session gaps, hover/tap inspection, and constant metric cards at calendar granularities.
   - Add deterministic boundary tests, rebuild, deploy, and verify the options live.
20. Replace normalized comparison with separate raw-value health graphs.
   - Follow CDC guidance favoring separate visualizations when independently important metrics use different units or formatting.
   - Follow WHO and ONS line-chart guidance: use linear numeric axes, include every visible value, allow a clearly labeled non-zero baseline, avoid excessively tight domains, and use clean rounded ticks.
   - Put the graph area inside the established Show/Hide collapsible design without affecting collection or storage while collapsed.
   - Render four genuinely separate plotting areas for Heart Rate, RMSSD, SDNN, and BRPM rather than four normalized lines in one plot.
   - Label each Y-axis with its raw unit: BPM, ms, ms, and BRPM. Remove the calculated relative-percentage axis entirely.
   - Derive each visible domain independently from that metric's displayed data, add meaningful padding, round outward to clean ticks, and include zero only when it is naturally close to the observed range.
   - Keep synchronized X-axis range, granularity, hover/tap/keyboard inspection time, long-term adaptive storage, session gaps, and constant value cards.
   - Keep metric checkboxes scoped to line visibility only; hiding a line must not remove its graph frame, axes, cards, or raw inspection values.
   - Add deterministic raw-axis-domain and tick tests, perform mobile/build/PWA checks, deploy, and verify live.
21. Remove obsolete graph line checkboxes.
   - Remove Choose Lines controls now that every metric has its own separate graph.
   - Keep all four raw-value lines and inspection markers permanently visible.
   - Remove selector-only component state and styling, update documentation, rebuild, deploy, and verify live.
22. Add in-chart point tooltips and axis callouts.
   - Follow CDC line-chart interaction conventions by showing the selected point, vertical and horizontal hover guides, and exact values directly in the chart.
   - Use nearest-X selection so the entire plotting area can select the closest time sample without requiring pixel-perfect contact with the line.
   - Show a compact tooltip beside the point with metric name, raw value, and unit.
   - Highlight the selected raw value on the Y-axis and selected time on the X-axis.
   - Keep tooltip placement inside the SVG near chart edges and support hover, tap, and the existing keyboard navigation.
   - Retain the below-chart live region as an accessible textual alternative rather than making hover the only way to obtain values.
   - Add plan documentation, mobile/build/PWA verification, deploy, and verify live.

### In-chart tooltip research decision

- CDC COVE supports hover-only data-point symbols plus vertical and horizontal hover lines for line charts, and its health dashboards expose exact values through tooltips.
- Nearest-X selection is preferable for time-series charts because it avoids dead zones between sparse or small point marks.
- Hover cannot be the sole access path: touch, keyboard focus, and a textual live-region readout remain available.

23. Add portable CSV export and explicit live-chart interaction modes.
   - Add visible, independently labeled controls for inspection and live following instead of relying on undiscoverable chart gestures.
   - Add an Inspect Values switch that shows or hides the selected point, X/Y guides, axis callouts, tooltip, and textual inspector without changing graph data.
   - Add a Follow Latest switch that keeps the inspection cursor attached to each newest displayed sample while data arrives.
   - Pause Follow Latest when the user deliberately inspects historical data, clearly show that the graph is paused, and provide a direct Resume Live action.
   - Preserve touch, pointer, and keyboard inspection when Inspect Values is enabled; make all controls natively keyboard accessible.
   - Export complete retained chart history independently of display granularity, with timestamps, session, metric values/units, and aggregation counts.
   - Use safe CSV escaping, an Excel-compatible UTF-8 marker, a descriptive dated filename, and an offline local download.
   - Add deterministic tests and perform mobile, build, PWA, deployment, and live verification.
24. Research, validate, and add Dynamic Detrended Fluctuation Analysis (DDFA).
   - Complete the supplied SQ3R/CRAAP research template using the original DDFA paper, its numerical-validation supplement, the published DDFA-2 exercise-threshold study, and an independent conventional-DFA reference implementation.
   - Keep DDFA distinct from conventional DFA alpha1: implement the published second-order DDFA local exponent alpha(t, s), with dynamic segment length 5s, maximally overlapping windows, and the published three-scale finite-difference derivative.
   - Apply the published 200–2,000 ms physiological bounds and seven-beat, 10% rolling-median filter without changing the established RMSSD, SDNN, or BRPM input streams.
   - Compute every available integer scale from 5 through 20 beats from the rolling RR window and expose DDFA alpha10 as the clearly scale-qualified headline value; never present an invented unitless aggregate as “DDFA.”
   - Refresh the DDFA profile on the established five-second rolling-analysis cadence after the initial two-minute collection period, and retain the latest completed result while the next refresh is computed.
   - Add the DDFA alpha10 card first, then RMSSD, SDNN, Heart Rate, and BRPM; use the same order for separate raw-value trend graphs.
   - Add a detailed DDFA scale-profile section, persistence, complete-history CSV export, disconnected restoration, bounded-history compaction, and mobile/accessibility behavior consistent with existing metrics.
   - Validate polynomial detrending and finite differences with exact fixtures, compare conventional fluctuation values to the PhysioNet reference, test synthetic uncorrelated/correlated signals and contaminated RR examples, and enforce JavaScript/Kotlin parity fixtures before release.
   - State evidence limits: DDFA-based exercise thresholds are promising but cohort- and protocol-dependent, and this app does not claim to determine lactate/ventilatory thresholds or provide diagnosis.
25. Optimize the public PWA for search and AI-assisted discovery using documented guidance.
   - Extend the supplied research-template process with current primary Google Search documentation, Schema.org definitions, and web standards; separate supported practices from speculative “AI SEO” claims.
   - Add a unique descriptive title and meta description, canonical URL, Open Graph/social metadata, theme/application metadata, and indexable semantic copy that accurately describes Bluetooth requirements, offline installation, privacy-local storage, DDFA, HRV, and CSV features.
   - Add valid JSON-LD only for schema types and properties actually represented by the site; do not imply medical-device certification, reviews, ratings, or health claims.
   - Add robots.txt and sitemap.xml with production GitHub Pages paths, useful link/content structure, accessible headings, and crawlable explanatory/help content without duplicating or keyword-stuffing the interface.
   - Review built-page rendering, manifest/canonical consistency, Core Web Vitals-sensitive asset loading, structured-data syntax, sitemap/robots responses, and offline PWA behavior.
   - Document AI-discovery choices such as clear authorship/provenance and machine-readable factual content; treat llms.txt as optional/non-ranking unless authoritative evidence changes.
26. After all DDFA, Android, and SEO work, re-research and audit the BRPM estimator.
   - Use the supplied SQ3R/CRAAP template again, prioritizing primary respiratory-rate-from-RR/ECG literature, validated open implementations or datasets, and sensor-quality evidence.
   - Reconstruct the current Lomb–Scargle pipeline line by line: RR preprocessing, irregular timestamps, detrending, frequency search band/resolution, peak selection, confidence/prominence, minimum duration/count, and five-second rolling behavior.
   - Test published or openly available example signals and independent reference calculations, plus deterministic synthetic respiration, harmonics, cadence interference, artifacts, changing rate, exercise-rate, missing-data, and no-respiratory-sinus-arrhythmia cases.
   - Fix the formula or quality gating only when the evidence identifies a concrete issue; otherwise preserve it and document why apparent differences can occur.
   - Apply any justified correction identically to web and Android, add parity fixtures, and rerun persistence, CSV, UI, build, offline, Room, lint, and release gates.

### Live-chart controls and CSV research decision

- Inspection visibility and automatic live following are independent preferences, so they use separate switches.
- Historical inspection pauses following so new samples cannot pull the cursor away while someone is reading; Resume Live restores the latest point immediately.
- Tooltips remain supplemental: native controls and the textual inspector retain keyboard and touch access, consistent with W3C input-accessibility guidance.
- CSV exports retained source records rather than rendered buckets. Display granularity is a visualization concern and must not silently discard export resolution.
- Explicit timestamps, units, session identity, and sample counts prevent compacted historical records from being mistaken for individual five-second observations.

### Raw-axis research correction

- The previous 0–100% min-max normalization is mathematically valid for comparing relative shape, but it is not a suitable primary display for reading these health measurements because the endpoints change with the visible data.
- CDC recommends separate visualizations when metrics are independently important and require different formatting, and warns that combined charts can overload or mislead.
- WHO confirms that a line-chart Y-axis need not start at zero, while warning that excessively compressed or expanded ranges can exaggerate or hide change.
- ONS recommends that cropped line-chart axes retain substantial space below the first data point, extend beyond the maximum to a clean gridline, and use sensible rounded intervals.
- Each graph therefore uses real units and an independently calculated, clearly labeled linear domain; the shared element is time, not a fabricated common Y scale.

### Trend-graph and storage research decisions

- Use IndexedDB for chart history because it stores structured records asynchronously; keep localStorage only for the tiny latest-summary snapshot already established.
- Bound storage by point count and latest-session scope instead of relying on browser quota. At 1,440 compact records, the app retains about two hours and remains far below typical origin quotas.
- Treat browser persistence as best effort: storage may be cleared by the user or browser, so chart restoration must never be required for live monitoring.
- Use a line chart for time-series trends. Because BPM, HRV milliseconds, and BRPM have incompatible units and ranges, plot per-series relative position rather than implying that raw heights share one clinical scale.
- Make raw values, units, observed ranges, selectable series, and line patterns explicit. The chart is for trend exploration, not diagnosis or cross-metric magnitude comparison.
- Describe RMSSD and SDNN as HRV metrics; do not label BRPM as a direct vagal measure.

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
- [x] Versioned session snapshot storage implemented and tested
- [x] BPM, HRV, BRPM, extrema, counts, and timestamps persist locally
- [x] Saved summary and detailed views restore after reload
- [x] Restored data is clearly marked non-live
- [x] Clear Saved Data control implemented
- [x] New Bluetooth connection starts clean live metrics
- [x] Mobile reload/restoration review and production gates pass
- [x] Persistence update deployed and verified live
- [x] Clear Saved Data requires explicit confirmation
- [x] Cancelling confirmation leaves the saved session intact
- [x] Protected-clear update passes production gates
- [x] Protected-clear update deployed and verified live
- [x] Displayed times omit seconds
- [x] RMSSD, SDNN, and BRPM cards consistently show minimum, average, and maximum
- [x] Five-second graph sampling and two-hour bounded IndexedDB history implemented
- [x] Saved graph restores while disconnected and clears with saved data
- [x] Selectable accessible multi-metric trend graph implemented
- [x] Graph/storage unit tests and mobile production gates pass
- [x] Trend graph update deployed and verified live
- [x] Relative Y-axis label and percentage ticks implemented
- [x] Hover/tap inspection shows exact selected values and time
- [x] Keyboard chart inspection implemented
- [x] Interactive-chart tests and production gates pass
- [x] Interactive-chart update deployed and verified live
- [x] Graph checkboxes affect only plotted lines and markers
- [x] All metric and graph value cards remain constant
- [x] Graph-selector scope update passes production gates
- [x] Graph-selector scope update deployed and verified live
- [x] Cross-session bounded adaptive history implemented
- [x] Auto and manual graph granularity selection implemented
- [x] Disconnected-session and large-time gaps remain unconnected
- [x] Aggregation and compaction tests pass
- [x] Long-term graph production and mobile gates pass
- [x] Long-term granularity update deployed and verified live
- [x] Calendar Week, Month, and Year granularity implemented
- [x] Calendar boundary aggregation tests pass
- [x] Calendar granularity production gates pass
- [x] Calendar granularity update deployed and verified live
- [x] Normalized percentage plot removed as primary display
- [x] Four separate collapsible raw-value graphs implemented
- [x] Independent clean numeric Y-axis domains and units implemented
- [x] Shared granularity and synchronized inspection retained
- [x] Checkboxes affect only raw graph lines
- [x] Raw-axis and graph interaction tests pass
- [x] Separate-graph mobile and production gates pass
- [x] Separate raw-graph update deployed and verified live
- [x] Obsolete graph line checkboxes and selector state removed
- [x] All four separate graph lines remain permanently visible
- [x] Checkbox-removal production gates pass
- [x] Checkbox-removal update deployed and verified live
- [x] Nearest-point tooltip rendered beside each selected graph point
- [x] Raw Y-axis value and X-axis time callouts implemented
- [x] Horizontal and vertical inspection guides implemented
- [x] Hover, tap, keyboard, and textual readout remain synchronized
- [x] Tooltip mobile and production gates pass
- [x] In-chart tooltip update deployed and verified live
- [x] CSV export implemented from complete retained history
- [x] Inspect Values control implemented without changing graph data
- [x] Follow Latest, automatic pause, and Resume Live implemented
- [x] New chart controls reviewed for touch, keyboard, and mobile layout
- [x] CSV and chart-mode automated tests pass
- [x] Updated production build and offline PWA verification pass
- [x] Live-chart and CSV update deployed and verified live
- [x] DDFA research record completed from the supplied template
- [x] Published DDFA-2 algorithm and preprocessing implemented on the web
- [x] DDFA alpha10 lead card and detailed scale profile implemented
- [x] Metric cards and graphs ordered DDFA, RMSSD, SDNN, Heart Rate, BRPM
- [x] DDFA persistence, history, CSV, restoration, and clearing implemented
- [x] Primary-reference, synthetic-signal, contamination, and edge-case DDFA tests pass
- [x] Web production, offline PWA, mobile, and accessibility gates pass
- [x] SEO and AI-discoverability research added to the research record
- [x] Metadata, canonical, semantic content, and truthful structured data implemented
- [x] Robots, sitemap, built-page, performance, and structured-data checks pass
- [x] Final BRPM SQ3R/CRAAP research audit completed
- [x] Current BRPM output independently reproduced or concrete defect identified
- [x] Any justified BRPM correction ported identically to web and Android
- [x] BRPM scientific, adversarial, parity, and full regression gates pass
- [x] CSV export supports raw and selectable minute/hour/day/week/month/year aggregation
- [x] CSV export supports optional validated local date/time ranges and preserves counts
- [x] Web Screen Reader control supports opt-in metric selection and configurable speech cadence
- [x] Web Metric Alerts support persisted thresholds, repeat cadence, hysteresis, speech, notifications, and acknowledgement
- [x] Web alert cadence is stable under high-frequency sensor updates
