# Homework 3: Task Decomposition

## Project objective

Build a Vietnamese, mobile-first event landing page with a drift-free UTC countdown, a registration form state machine, and safe, duplicate-resistant client-side submission. The implementation uses semantic HTML, CSS, and native ES modules only. Event details are illustrative and are identified as such in the page and README.

## Functional contracts

| Slice | Contract |
| --- | --- |
| Event configuration | `event-config.mjs` is the editable source for event title, UTC start, place, and agenda. The sample deadline is `2026-12-20T02:00:00Z` (09:00 on 20/12/2026 in `Asia/Ho_Chi_Minh`). |
| Countdown core | `parseUtcDeadline(isoString)` validates a UTC ISO 8601 string ending in `Z` and returns one finite timestamp or a clear invalid result. `getCountdownParts(deadlineMs, nowMs)` derives non-negative days/hours/minutes/seconds from the absolute deadline on every call. |
| Countdown UI | `startCountdown({ root, deadline, now, timers, documentRef })` renders immediately, re-renders on timer ticks and tab visibility return, announces only expiry/errors, returns an idempotent cleanup function, and creates no timer for invalid or expired deadlines. |
| Registration | `submitRegistration(payload) -> Promise` is a replaceable async service. The default waits about 800 ms and resolves as a simulation; it does not send or retain data. The controller owns one state: `idle`, `submitting`, `success`, or `error`. |
| Duplicate guard | The controller checks its current state before starting a request. A second submit while pending does not call the service again; success and rejection both leave the form able to submit again. |
| Safe output | User input is trimmed and validated. Any user-provided text rendered by the UI uses `textContent`; user input never becomes markup. |

## Work breakdown

| Task | Goal and scope | Depends on | Contract / completion checks | Planned commit |
| --- | --- | --- | --- | --- |
| T-01 | Record this decomposition and persistent project rules before implementation. | None | Both documents define boundaries, acceptance criteria, and commit plan; no application code exists yet. | `docs(spec): define HW3 contracts and work breakdown` |
| T-02 | Create the semantic HTML page, sample event content, countdown structure, registration form, and accessible status regions. | T-01 | One `h1`; meaningful landmarks and visible labels; required name/email fields; module and stylesheet are external; sample content is marked. | `feat(html): add semantic event landing page` |
| T-03 | Add CSS tokens and responsive mobile-first layout. | T-02 | No horizontal overflow at 375px, 768px, and 1440px; visible keyboard focus; readable layout without remote assets. | `feat(css): add responsive event landing page` |
| T-04 | Implement the countdown parsing and arithmetic as DOM-independent functions. | T-01 | Deterministic tests cover valid/invalid UTC, past/future values, component boundaries, and a supplied fake clock. | `feat(countdown): add drift-free UTC time calculations` |
| T-05 | Connect countdown functions to the page and implement timer, visibility, expiry, error, and cleanup lifecycle. | T-02, T-04 | Initial render is immediate; delayed callbacks recalculate from the deadline; invalid dates start no timer; expiry/cleanup clear timers; repeated setup cannot leave duplicate listeners/timers. | `feat(countdown): connect accessible countdown lifecycle` |
| T-06 | Implement the form state machine and replaceable simulated async service. | T-02 | Exactly one state value drives button/status/`aria-busy`; success resets the form; rejection is surfaced and retains input. | `feat(form): add registration state machine and mock service` |
| T-07 | Enforce the pending-request guard and explicit retry behavior. | T-06 | Rapid submit attempts while pending call the service once; resolution and rejection both release the guard; fake pending/success/rejection services exercise the contract. | `fix(form): guard repeated submissions and recover from errors` |
| T-08 | Apply client-side normalization/validation and safe text rendering. | T-06, T-07 | Whitespace-only names and malformed email are rejected; values are trimmed; untrusted text is never parsed as HTML; the UI does not echo fields that do not need to be displayed. | `fix(security): validate form data and render status safely` |
| T-09 | Run integrated unit and browser checks, inspect the complete Git diff, and fix issues actually found. | T-03, T-05, T-08 | Tests run through Node's built-in runner; HTTP browser flow checked at required viewport widths and keyboard interactions; each defect is written down before its fix if it qualifies for the audit. | `test: verify countdown, form, responsive, and safety contracts` |
| T-10 | Write the evidence-based AI failure audit and handoff README. | T-09 | Audit reports only defects actually observed and records repro, diagnosis, cause, fix, and evidence; README has run/config/architecture/check instructions and limitations. | `docs: add verification guide and AI failure audit` |

## Verification rhythm

For each task, inspect only the relevant diff, run its acceptance checks, and commit the related files before starting the next task. A later integration fix gets its own focused commit. Do not manufacture defects or claim checks that were not run. Lighthouse 100 is not a completion condition for this homework.
