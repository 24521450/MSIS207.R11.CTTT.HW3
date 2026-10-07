import { eventConfig } from "./event-config.mjs";
import { parseUtcDeadline } from "./countdown.mjs";
import { renderEventDetails, startCountdown } from "./event-ui.mjs";
import { bindRegistrationForm, submitRegistration } from "./registration.mjs";

const parsedDeadline = parseUtcDeadline(eventConfig.startsAtUtc);
renderEventDetails(eventConfig, { parsedDeadline });

const countdownRoot = document.querySelector(".countdown-panel");
const launchCountdown = () =>
  startCountdown({
    root: countdownRoot,
    deadline: eventConfig.startsAtUtc,
    parsedDeadline,
  });

let disposeCountdown = launchCountdown();

bindRegistrationForm({
  form: document.querySelector("#registration-form"),
  submitButton: document.querySelector("#submit-button"),
  submitLabel: document.querySelector("[data-submit-label]"),
  status: document.querySelector("#registration-status"),
  nameInput: document.querySelector("#full-name"),
  submit: submitRegistration,
});

window.addEventListener("pagehide", () => {
  disposeCountdown();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    disposeCountdown = launchCountdown();
  }
});
