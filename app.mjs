import { eventConfig } from "./event-config.mjs";
import { renderEventDetails, startCountdown } from "./event-ui.mjs";
import { bindRegistrationForm, submitRegistration } from "./registration.mjs";

renderEventDetails(eventConfig);

const countdownRoot = document.querySelector(".countdown-panel");
const launchCountdown = () =>
  startCountdown({
    root: countdownRoot,
    deadline: eventConfig.startsAtUtc,
  });

let disposeCountdown = launchCountdown();

bindRegistrationForm({
  form: document.querySelector("#registration-form"),
  submitButton: document.querySelector("#submit-button"),
  submitLabel: document.querySelector("[data-submit-label]"),
  status: document.querySelector("#registration-status"),
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
