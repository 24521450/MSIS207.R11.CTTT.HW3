import { eventConfig } from "./event-config.mjs";
import { renderEventDetails, startCountdown } from "./event-ui.mjs";

renderEventDetails(eventConfig);

const countdownRoot = document.querySelector(".countdown-panel");
const launchCountdown = () =>
  startCountdown({
    root: countdownRoot,
    deadline: eventConfig.startsAtUtc,
  });

let disposeCountdown = launchCountdown();

window.addEventListener("pagehide", () => {
  disposeCountdown();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    disposeCountdown = launchCountdown();
  }
});
