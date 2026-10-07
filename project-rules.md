# HW3 Project Rules

## Scope

- Use HTML5, CSS, and native JavaScript ES modules only. Do not add a framework, package dependency, backend, account/payment flow, audio engine, or remote asset.
- Keep the app as a static landing page. The simulated registration service must clearly say that it does not send data to a real server.
- Keep all user/event content illustrative unless the user replaces it with real details. The single editable event configuration lives in `event-config.mjs`.
- Do not modify HW1 or HW2. Do not create a GitHub repository, push, deploy, reset, or rewrite history.

## Architecture and interfaces

- Read this file and `TASK_DECOMPOSITION.md` before code changes. Work on one task at a time and follow its planned commit.
- Keep countdown arithmetic independent of DOM and timer scheduling. Derive every display from `deadlineMs - now()`; an interval only schedules recalculation.
- Parse the UTC deadline once during initialization. Require a valid ISO timestamp with a `Z` suffix; invalid input must show a clear error and must not start a timer.
- Keep registration state in one state-machine value (`idle`, `submitting`, `success`, or `error`). Guard in the submit logic as well as in the button UI.
- Keep the async service replaceable through dependency injection so tests can control pending, success, and rejection without a debug UI.
- Use `const` by default and `let` only for reassigned bindings. Use `addEventListener`; do not use inline event attributes.

## Accessibility, layout, and safety

- Use `lang="vi"`, one page `h1`, semantic landmarks, visible field labels, native required/email validation, visible focus styles, and responsive layout starting at 375px.
- Countdown numbers must not be in a live region. Announce only meaningful transitions such as expiry or configuration errors.
- Render any user-provided text with `textContent`. Never insert user input with `innerHTML`, `insertAdjacentHTML`, or a markup template. Do not rely on stripping angle brackets as an XSS defense.
- Keep status feedback accessible with a restrained live region. A failed request must retain values and leave the form retryable.
- Prefer local CSS/JS and system fonts. No external requests are needed.

## Verification and Git

- Use deterministic checks for time calculations and fake services for form outcomes; exercise the real page through HTTP in a browser.
- Check required viewport widths 375px, 768px, and 1440px, keyboard navigation, duplicate submission, invalid input, rejection recovery, and a markup-shaped input.
- Record only checks that actually ran. Do not make a Lighthouse 100 score a requirement.
- Stage explicit paths and create a focused, meaningful commit after each task. Do not fabricate authorship or defects, create empty commits, or rewrite history.
- Build `AI_FAILURE_AUDIT.md` from defects actually encountered during implementation and review. If fewer than three are found, state the shortfall plainly.
