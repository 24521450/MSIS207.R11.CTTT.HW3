# AI Failure Audit

This report records defects observed while reviewing the generated implementation. Entries are kept in discovery order; no defect is introduced to fill this report.

## AIF-01 — Mobile header overflows at 375px

- **Status:** Reproduced and corrected during T-03.
- **Observed behavior:** The page had a horizontal scrollbar at the requested 375px viewport. The document scroll width was 373px while its available client width was 360px in this browser viewport.
- **Affected code:** `styles.css`, `.site-header`, `.brand`, `.nav-list`, and `.nav-cta` rules (T-03 CSS work, before its commit).
- **Reproduction:** Serve the page over HTTP, set the browser viewport to 375×900, and inspect the header and horizontal scrollbar.
- **Detection:** Browser screenshot plus a read-only DOM measurement of `document.documentElement.scrollWidth`, `document.documentElement.clientWidth`, and overflowing element bounds. The nav CTA extended to x=373 while the content area ended at x=360.
- **Cause:** The header is a single flex row. The logo, non-wrapping navigation links, gaps, and CTA together exceed the available width at this viewport.
- **Correction:** Added a narrow-screen header rule that reduces the header and nav spacing/type/padding while keeping every navigation link visible on one line.
- **Verification after correction:** Rechecked the HTTP page in the browser at 375×900, 768×900, and 1440×900. `documentElement.scrollWidth` equaled `documentElement.clientWidth` at each width (360/360, 753/753, and 1425/1425 in this browser), and the element-bound check found no horizontal overflow. The 375px screenshot showed the full logo, links, and CTA in view.

## AIF-02 — No-script form exposes entered values in the URL

- **Status:** Reproduced and corrected during T-09.
- **Observed behavior:** With the application module absent, the enabled form submitted using its browser default `GET` method. The URL then contained the name, email, and message fields.
- **Affected code:** `index.html`, `#registration-form` and `#submit-button` (T-02 markup, before its no-script guard).
- **Reproduction:** Serve an HTTP copy of the page with the module script removed; enter synthetic test values into all three fields and submit. The browser navigates to the same path with `name`, `email`, and `message` query parameters.
- **Detection:** Browser DOM inspection showed `form.method === "get"` and `button.disabled === false`; after submit, a read-only URL check confirmed all three parameter names.
- **Cause:** Submission safety depended entirely on the module's `preventDefault()` handler, but the HTML form had no explicit method and its submit button was enabled before JavaScript initialized.
- **Correction:** The HTML submit button is disabled by default. The form controller enables it only after the module has initialized; the existing no-JavaScript notice explains that the form needs JavaScript.
- **Verification after correction:** The 24-test Node suite passes, including a source contract check for the initially disabled button. In the HTTP no-script fixture, the form still reported its native `GET` method, but the button was disabled; after entering synthetic data and pressing Enter, the path remained `/no-script-repro.html` and the query string stayed empty. On the normal page, the controller enabled the button and keyboard submission reached success with `aria-busy="false"`.

## AIF-03 — Browser favicon request returns 404

- **Status:** Reproduced and corrected during T-09.
- **Observed behavior:** A fresh page load caused the browser to request `/favicon.ico`, and the local HTTP server returned 404.
- **Affected code:** `index.html` head has no icon link and the repository has no favicon asset (T-02 page shell, before correction).
- **Reproduction:** Serve the page over HTTP in a fresh browser session and inspect the local server log for the automatic favicon request.
- **Detection:** The HTTP server log recorded `GET /favicon.ico` with status 404. The page loaded, but the browser requested a missing resource.
- **Cause:** No favicon was declared or included, so the browser used its conventional `/favicon.ico` fallback.
- **Correction:** Added a local `favicon.svg` and linked it from the document head.
- **Verification after correction:** Reloaded the page over HTTP. The server returned `GET /favicon.svg` with status 200; the browser Console had no errors or warnings, and no `/favicon.ico` fallback was requested on that load.
