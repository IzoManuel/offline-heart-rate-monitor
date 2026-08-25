# DDFA Research And Implementation Record

## 1. Purpose

Research Dynamic Detrended Fluctuation Analysis (DDFA) rigorously enough to add a reproducible, cross-platform implementation without changing the established RMSSD, SDNN, or BRPM formulas. The product goal is a five-second-refreshed view of local RR-interval correlation structure, led by an explicitly scale-qualified value and backed by the full available scale profile.

## 2. Research Questions

1. What does “DDFA” mean in the primary literature, and how does it differ from conventional DFA alpha1?
2. Which detrending order, scales, dynamic segment length, preprocessing, and update cadence are supported for exercise RR data?
3. Is DDFA a single metric, a time series, or a time-and-scale landscape?
4. What can be validated independently, and what limitations must remain visible?
5. How can the same numerical behavior be locked across JavaScript and Kotlin?

## 3. Current Context

- Input is Bluetooth Heart Rate Service RR intervals from a Garmin HRM-200, converted from 1/1024-second units to milliseconds.
- Existing HRV analysis uses a trailing two-minute window and refreshes every five seconds.
- Existing metrics deliberately retain their established independent preprocessing. DDFA therefore receives a separate published preprocessing pipeline.
- The app works offline after installation, persists bounded history, restores it while disconnected, exports CSV, and renders separate raw-unit charts.

## 4. Expected Output

- DDFA-2 local exponents `alpha(t, s)` for integer beat scales 5–20 that have enough clean intervals.
- A headline `DDFA alpha10` value, explicitly meaning the local exponent at a scale of ten RR intervals. It is unitless and is not an average or proprietary score.
- A detailed latest scale profile, a five-second alpha10 history, persistence, CSV, and exact cross-platform fixtures.
- No lactate, ventilatory, aerobic, or anaerobic threshold claim.

## 5. SQ3R Study Record

### Survey

The 2020 primary paper introduces scale-dependent dynamic segmentation and DDFA-1. Its supplement defines conventional DFA precisely and validates DDFA numerically against theoretical fractional Gaussian noise (fGn) and fractional Brownian motion (fBm). A 2020 tool paper confirms that DDFA is normally displayed as a color-coded `alpha(t, s)` landscape. A 2023 exercise study applies DDFA-2, published RR filtering, scales 5–64, and a multi-stage individualized threshold model. PhysioNet supplies an independent, executable conventional-DFA reference.

### Question

- Does the method emit one number? No. The native output is local exponent as a function of time and beat scale.
- Does DDFA inherently require two minutes? No. Segment length is `5 × scale` beats in the cited implementations. The two-minute/five-second schedule in the 2023 paper describes the conventional DFA alpha1 comparator.
- Why DDFA-2? The exercise-threshold study uses a quadratic local trend and is the closest published match to the app's exercise/on-the-go context. The app identifies it explicitly as DDFA-2.
- Why alpha10? A card requires one trace. Scale ten is directly inside the published short-scale region and is specifically where the 2023 study reports the first qualitative exercise-related decreases. The scale is part of the label; the full profile prevents it being mistaken for all of DDFA.
- Why stop the live profile at 20? A two-minute window often supplies the 100 clean beats required by `5 × 20`; scale 64 requires 320 beats and cannot be promised by this cadence. The algorithm exposes only scales actually supported by the current clean RR count.

### Read

The implemented algorithm follows these published operations:

1. Keep RR intervals from 200 through 2,000 ms.
2. Reject an interval when it differs by more than 10% from the median of its seven-beat local window. At boundaries, use the available clipped centered window; this edge convention is an implementation detail because the paper does not specify boundary padding.
3. For each central scale `s`, select the most recent `5s` accepted intervals.
4. Mean-center and cumulatively sum that segment.
5. For window lengths `s-1`, `s`, and `s+1`, fit a quadratic least-squares trend in every maximally overlapping window, pool all squared residuals, and take their root mean square to obtain `F`.
6. Apply the published unequal-log-spacing three-point derivative to `log(F)` versus `log(s)`.

For `h- = log(s)-log(s-1)` and `h+ = log(s+1)-log(s)`:

`alpha(t,s) = [h-^2 logF(s+1) + (h+^2-h-^2) logF(s) - h+^2 logF(s-1)] / [h- h+ (h-+h+)]`.

### Recite

DDFA asks how the local correlation exponent changes both over time and across beat scales. It makes small scales more local by using shorter segments and larger scales more stable by using longer segments. A segment factor of five is a published compromise between temporal resolution and estimator noise. The exponent is unitless; scale is measured in beats. Values may be informative during structured exercise, but short-scale bias, artifacts, cohort size, and protocol dependence prevent turning a live value into a diagnostic or threshold label.

### Review

The implementation is acceptable only if it preserves all four defining elements together: scale-dependent `5s` segmentation, maximally overlapping windows, second-order polynomial detrending, and the unequal-grid finite-difference formula. Conventional alpha1 regression, one fixed two-minute segment, a normalized score, or a moving average of unrelated exponents must not be called DDFA.

## 6. CRAAP Source Evaluation

| Source | Currency | Relevance | Authority | Accuracy | Purpose |
|---|---|---|---|---|---|
| Molkkari et al., Scientific Reports (2020), DOI 10.1038/s41598-020-70358-7 | Foundational | Defines DDFA | Method's authors; peer reviewed | Algorithm plus theoretical/synthetic supplement | Introduce and validate method |
| Kanniainen et al., Frontiers in Physiology (2023), DOI 10.3389/fphys.2023.1299104 | Current applied method | DDFA-2 exercise use and filtering | Peer reviewed, overlapping method authors | Explicit method, comparator, preprocessing, limitations | Estimate exercise thresholds |
| Molkkari et al., Computing in Cardiology (2020), DOI 10.22489/CinC.2020.280 | Contemporary | UI and output semantics | Method authors; peer reviewed conference | Describes landscape, settings, filtering, API | Explain public DDFA tool |
| PhysioNet DFA 1.0.0 | Stable reference | Independent fluctuation calculation | MIT Laboratory for Computational Physiology | Source, sample input, expected output, executable check | Reference implementation |
| Peng et al., Chaos (1995), DOI 10.1063/1.166141 | Foundational | Conventional DFA | Original authors; peer reviewed | Widely reproduced definition | Define DFA |

## 7. Concept Map

`Bluetooth RR intervals -> DDFA-only bounds/median filtering -> per-scale trailing 5s segment -> integrated profile -> overlapping quadratic detrending at s-1/s/s+1 -> log-scale derivative -> alpha(t,s) profile -> alpha10 card/history`

This branch is separate from:

`RR intervals -> established RMSSD/SDNN/BRPM pipelines`

## 8. Evidence Log And Decisions

| Evidence | Decision |
|---|---|
| DDFA output is `alpha(t,s)` | Preserve scale profile; label scalar trace alpha10 |
| Published dynamic factor `a=5` balances resolution and variance | Use exactly `5 × scale` beats |
| Applied 2023 method uses DDFA-2 | Use quadratic detrending and name the variant |
| Published exercise preprocessing uses 200–2,000 ms and 10%/7-beat median filtering | Isolate and reproduce it for DDFA only |
| Scale 64 needs 320 accepted beats | Live two-minute view exposes only supported scales up to 20 |
| Conventional alpha1 alone can misrepresent short-scale behavior | Do not substitute alpha1 or call it DDFA |
| Threshold model aggregates an incremental test by HR and individual baseline | Do not produce threshold or zone claims from an arbitrary live session |
| Published threshold cohort was 15 and authors request further validation | Use restrained wellness/research language |

## 9. Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Call conventional two-minute DFA alpha1 “DDFA” | It is a different estimator and caused the exact terminology/formula risk this work is intended to avoid |
| Average scales 5–20 into one DDFA score | The literature's threshold model performs baseline correction, HR binning, scale averaging, and smoothing; a raw mean would be an invented metric |
| Show scale 5–64 after two minutes | Larger scales need up to 320 accepted beats and would frequently be unavailable |
| Reuse RMSSD filtering | Published DDFA filtering differs; silently changing RMSSD again would break parity |
| Claim training thresholds from alpha10 | Threshold evidence uses the whole incremental protocol and scale ensemble, not one live value |

## 10. Verification Strategy

1. Exact algebra tests for quadratic least squares, overlapping fluctuation pooling, and unequal-grid derivative.
2. Independent expected numbers generated with a small NumPy reference script, committed as constants rather than imported at runtime.
3. Conventional DFA fluctuation cross-check against PhysioNet's maintained C reference and sample data.
4. Deterministic synthetic white-noise and correlated-process tests across many segments, checking statistical behavior with tolerances rather than pretending a finite sample equals its asymptotic exponent.
5. Published preprocessing examples: physiological limits, exact 10% boundary, seven-beat impulse, boundary windows, insufficient clean data, and zero fluctuation.
6. Identical contaminated-RR and full-profile fixtures in JavaScript and Kotlin.
7. Persistence, aggregation, compaction, CSV column, restored/disconnected, UI order, mobile layout, accessibility, offline-build, Room migration, and release gates.

## 11. Risks And Safeguards

- **Artifact sensitivity:** no ECG means rejected intervals cannot be classified. Report accepted/removed counts and withhold unavailable values.
- **Finite-segment bias/noise:** the primary supplement shows bias and standard deviation increase in short dynamic segments. Do not map alpha10 to a clinical status.
- **Causal display:** the live implementation uses the latest trailing segment; published retrospective landscapes may identify a segment by midpoint. Document timestamps as analysis times.
- **Storage growth:** retain only alpha10 in the long-term time-series record; the latest scale profile remains in the small session snapshot. This preserves the headline trend without multiplying each record by 16 values.
- **Cross-platform drift:** one shared fixture and explicit constants; no platform-specific preprocessing.

## 12. Open Questions And Recommendations

- A future dedicated incremental exercise mode could retain scales 5–64 and implement the full individualized threshold protocol. Recommendation: do not fold that into ordinary live monitoring without protocol UX and a new validation project.
- A future time-by-scale heatmap would be the canonical full DDFA visualization. Recommendation: retain full profiles only when a bounded storage design and accessible textual alternative are specified.
- Garmin HRM-200 performance for DDFA during high-motion exercise has not been validated by these papers. Recommendation: conduct device-specific paired ECG/reference testing before making accuracy claims.

## 13. Final Summary

The app will implement published DDFA-2 rather than conventional DFA alpha1 or a home-grown score. It will refresh after the existing initial two-minute collection and then every five seconds. The first card and graph will show unitless `DDFA alpha10`; a detailed view will show all currently supported scales 5–20. RMSSD follows second, then SDNN, Heart Rate, and BRPM. Evidence supports DDFA as a promising view of dynamic RR correlations and structured exercise response, not as a standalone diagnosis or a universally validated threshold detector.

## 14. Primary Links

- https://doi.org/10.1038/s41598-020-70358-7
- https://pmc.ncbi.nlm.nih.gov/articles/PMC7423621/
- https://doi.org/10.3389/fphys.2023.1299104
- https://doi.org/10.22489/CinC.2020.280
- https://physionet.org/content/dfa/1.0.0/
- https://doi.org/10.1063/1.166141

## 15. SEO And AI-Discovery Research Addendum

Google's current generative-search guidance says ordinary search fundamentals remain the foundation: crawlable/indexable pages, useful original textual content, semantic structure, mobile performance, and structured data that agrees with visible content. It explicitly says no special AI schema or AI text file is required and cautions against AEO/GEO “hacks.” Accordingly, this single-page app adds descriptive visible content, accurate metadata, a canonical production URL, a one-URL sitemap, permissive robots policy, and truthful `WebSite` plus `WebApplication` JSON-LD. It does not add `llms.txt`, fake ratings, medical claims, keyword-generated pages, or invisible crawler-only prose.

Primary guidance:

- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/software-app

## 16. Final BRPM Research Re-Audit

### Purpose And Questions

Re-evaluate whether the app's RR-interval-derived breathing estimate is scientifically and numerically appropriate at rest and during exercise. The audit asks whether RR timing is a valid respiratory surrogate, whether Lomb–Scargle is appropriate for beat-spaced data, whether preprocessing preserves changing exercise heart rate, whether the search band covers realistic on-the-go breathing, and which claims the evidence supports.

### SQ3R Survey And Read

Charlton et al.'s 2018 review organizes indirect breathing-rate algorithms into respiratory-signal extraction, optional signal fusion, rate estimation, optional estimate fusion, and quality assessment. It finds substantial method/data heterogeneity and recommends explicit windows, reference respiration, quality rejection, and leading comparators. Charlton et al.'s 2016 assessment tested 314 ECG/PPG combinations; the strongest general algorithms used multiple respiratory modulations and smart fusion, capabilities unavailable from Bluetooth RR intervals alone.

The most directly relevant primary study is Fontolliet et al. (2021): 31 adults completed incremental treadmill running while a Polar H10 supplied RR intervals and a metabolic system supplied reference breathing. RR-frequency modulation from respiratory sinus arrhythmia was usable over roughly 10–70 BRPM. Their best combinations had about 5.5% and 7.6% error, but subject-specific failures remained and the authors called for a signal-quality index. They resampled to 6 Hz, filtered 0.2–1.2 Hz for exercise, then used STFT or adaptive frequency/harmonic tracking. They specifically report 60–65 BRPM tracking and recommend frequency-domain methods during running.

The current app instead uses an intentionally smaller, dependency-free path: physiological/local-artifact filtering, irregular-time linear detrending, Lomb–Scargle spectral power, dominant-frequency selection, and peak-prominence rejection. Lomb–Scargle is a defensible way to avoid pretending beat events are evenly spaced, but this exact full pipeline has not been validated against a paired Garmin HRM-200 respiratory reference and cannot inherit the accuracy numbers of the Polar/STFT study.

### Recite And Review

RR intervals can carry respiration through frequency modulation/RSA, including during exercise, but only when that modulation is present. A spectral peak is an estimate, not a directly measured breath count. The previous 0.1–0.5 Hz search silently capped output near 30 BRPM, even though the interface remains visible while running and the directly relevant study observed up to about 70 BRPM. The previous whole-window ±20% median filter could also delete valid endpoints of a steadily changing exercise heart-rate trend. These are concrete defects, not a reason to replace the whole estimator with an unvalidated bespoke algorithm.

### CRAAP Evaluation

| Source | Authority And Relevance | Decision |
|---|---|---|
| Fontolliet et al., Sensors 2021, DOI 10.3390/s21175811 | Primary Polar-H10 RR study with reference metabolic respiration during running | Expand exercise range; preserve frequency-domain approach; acknowledge individual failures |
| Charlton et al., IEEE RBME 2018, DOI 10.1109/RBME.2017.2763681 | Comprehensive peer-reviewed review and assessment framework | Keep quality rejection and explicit limitations; do not claim direct measurement |
| Charlton et al., Physiological Measurement 2016, DOI 10.1088/0967-3334/37/4/610 | Primary open, reproducible comparison of 314 algorithms | Recognize missing amplitude/baseline/fusion channels; do not claim best-in-class accuracy |
| PhysioNet simultaneous-measurements v1.0.2, DOI 10.13026/wce5-fj54 | Open multi-device exercise ECG/RR/respiration dataset used by later validation work | Use as the preferred future paired-recording regression corpus |
| Sarkar et al., Scientific Reports 2023, DOI 10.1038/s41598-023-50470-0 | Open-source single-lead ECG algorithm tested over 5–40 BRPM | Supports wider application-specific bands, but its QRS-amplitude input is unavailable here |

### Evidence-Led Corrections

1. Replace the whole-window median rule in the BRPM branch with a clipped, centered seven-beat local median at the existing 20% tolerance. This preserves gradual workload-driven RR trends while rejecting isolated deviations. RMSSD, SDNN, and DDFA preprocessing remain unchanged.
2. Expand the upper search bound from 0.5 to 1.2 Hz (72 BRPM), matching the exercise study, while retaining 0.1 Hz for the existing slow-breathing use case.
3. Cap the effective upper frequency at 45% of the mean beat-event sampling rate to stay below a conservative sampling limit; withhold rather than alias when heart beats are too sparse.
4. Keep the established minimum duration, spectral oversampling, prominence gate, and boundary rejection because this audit did not find a validated drop-in threshold that could replace them honestly.
5. Add identical 48-BRPM exercise fixtures, gradual-heart-rate-trend filtering tests, slow/rest fixtures, random-noise rejection, constant-signal rejection, and exact web/Android parity.

### Risks, Open Questions, And Final Recommendation

- The prominence ratio and displayed quality labels measure spectral clarity, not absolute accuracy. Future UI should call them signal clarity if those labels are exposed prominently.
- Cadence, harmonics, Mayer-wave activity, arrhythmia, medication, artifacts, and weak/lost RSA can move or erase the peak. A clean-looking estimate can still be wrong.
- Full validation requires paired Garmin RR and reference airflow/inductance data across rest, walking, running, cadence changes, and recovery. A future algorithm comparison should include the published BPF+STFT and rRR+HFT approaches and report Bland–Altman limits, MAE, coverage, and failure rate.
- The corrected estimator is more suitable for the app's rest-to-running range, but it remains an indirect wellness estimate and is not “flawless,” medically validated, or equivalent to a respiratory sensor.

Primary links:

- https://doi.org/10.3390/s21175811
- https://doi.org/10.1109/RBME.2017.2763681
- https://doi.org/10.1088/0967-3334/37/4/610
- https://physionet.org/content/simultaneous-measurements/1.0.2/
- https://doi.org/10.1038/s41598-023-50470-0
