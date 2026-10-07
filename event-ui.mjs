import { getCountdownParts, parseUtcDeadline } from "./countdown.mjs";

const ACTIVE_COUNTDOWNS = new WeakMap();
const COUNTDOWN_UNITS = Object.freeze({
  days: "[data-countdown-days]",
  hours: "[data-countdown-hours]",
  minutes: "[data-countdown-minutes]",
  seconds: "[data-countdown-seconds]",
});

function requireElement(root, selector) {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Countdown is missing required element: ${selector}`);
  }
  return element;
}

function writeCountdownParts(elements, parts) {
  for (const [unit, element] of Object.entries(elements)) {
    element.textContent = String(parts[unit]).padStart(2, "0");
  }
}

export function startCountdown({
  root,
  deadline,
  parsedDeadline: providedParsedDeadline,
  now = () => Date.now(),
  timers = globalThis,
  documentRef = globalThis.document,
  intervalMs = 1_000,
} = {}) {
  if (!root || typeof root.querySelector !== "function") {
    throw new TypeError("Countdown root must support querySelector().");
  }
  if (typeof now !== "function") {
    throw new TypeError("now must be a function that returns the current timestamp.");
  }
  if (!timers || typeof timers.setInterval !== "function" || typeof timers.clearInterval !== "function") {
    throw new TypeError("timers must provide setInterval() and clearInterval().");
  }

  ACTIVE_COUNTDOWNS.get(root)?.();

  const numberElements = Object.fromEntries(
    Object.entries(COUNTDOWN_UNITS).map(([unit, selector]) => [unit, requireElement(root, selector)]),
  );
  const messageElement = requireElement(root, "[data-countdown-message]");
  const parsedDeadline = providedParsedDeadline ?? parseUtcDeadline(deadline);
  let intervalId = null;
  let disposed = false;
  let visibilityListenerAdded = false;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;

    if (intervalId !== null) {
      timers.clearInterval(intervalId);
      intervalId = null;
    }

    if (visibilityListenerAdded) {
      documentRef.removeEventListener("visibilitychange", handleVisibilityChange);
      visibilityListenerAdded = false;
    }

    if (ACTIVE_COUNTDOWNS.get(root) === cleanup) {
      ACTIVE_COUNTDOWNS.delete(root);
    }
  };

  ACTIVE_COUNTDOWNS.set(root, cleanup);

  if (!parsedDeadline.ok) {
    for (const element of Object.values(numberElements)) {
      element.textContent = "--";
    }
    root.dataset.countdownState = "error";
    if (messageElement.textContent !== parsedDeadline.message) {
      messageElement.textContent = parsedDeadline.message;
    }
    cleanup();
    return cleanup;
  }

  const updateCountdown = () => {
    if (disposed) return null;

    const parts = getCountdownParts(parsedDeadline.deadlineMs, now());
    writeCountdownParts(numberElements, parts);

    if (parts.expired) {
      root.dataset.countdownState = "expired";
      if (messageElement.textContent !== "Sự kiện đã bắt đầu.") {
        messageElement.textContent = "Sự kiện đã bắt đầu.";
      }
      cleanup();
    } else {
      root.dataset.countdownState = "running";
      if (messageElement.textContent !== "") {
        messageElement.textContent = "";
      }
    }

    return parts;
  };

  function handleVisibilityChange() {
    if (documentRef.visibilityState === "visible") {
      updateCountdown();
    }
  }

  const initialParts = updateCountdown();
  if (initialParts && !initialParts.expired) {
    intervalId = timers.setInterval(updateCountdown, intervalMs);

    if (
      documentRef &&
      typeof documentRef.addEventListener === "function" &&
      typeof documentRef.removeEventListener === "function"
    ) {
      documentRef.addEventListener("visibilitychange", handleVisibilityChange);
      visibilityListenerAdded = true;
    }
  }

  return cleanup;
}

function requireDocumentElement(documentRef, selector) {
  const element = documentRef.querySelector(selector);
  if (!element) {
    throw new Error(`Event page is missing required element: ${selector}`);
  }
  return element;
}

export function renderEventDetails(
  config,
  { documentRef = globalThis.document, parsedDeadline: providedParsedDeadline } = {},
) {
  const titleElement = requireDocumentElement(documentRef, "[data-event-title]");
  const descriptionElement = requireDocumentElement(documentRef, "[data-event-description]");
  const startElement = requireDocumentElement(documentRef, "[data-event-start]");
  const timeZoneElement = requireDocumentElement(documentRef, "[data-event-time-zone]");
  const venueElement = requireDocumentElement(documentRef, "[data-event-venue]");
  const addressElement = requireDocumentElement(documentRef, "[data-event-address]");
  const agendaElement = requireDocumentElement(documentRef, "[data-event-agenda]");

  titleElement.textContent = config.title;
  descriptionElement.textContent = config.description;
  venueElement.textContent = config.venue;
  addressElement.textContent = config.address;
  timeZoneElement.textContent = config.timeZoneLabel;
  documentRef.title = `${config.title} — Sự kiện mẫu`;

  const parsedDeadline = providedParsedDeadline ?? parseUtcDeadline(config.startsAtUtc);
  if (parsedDeadline.ok) {
    const localDate = new Intl.DateTimeFormat("vi-VN", {
      timeZone: config.timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(parsedDeadline.deadlineMs));
    startElement.dateTime = config.startsAtUtc;
    startElement.textContent = localDate;
  } else {
    startElement.removeAttribute("datetime");
    startElement.textContent = parsedDeadline.message;
  }

  const agendaFragment = documentRef.createDocumentFragment();
  for (const item of config.agenda) {
    const listItem = documentRef.createElement("li");
    const time = documentRef.createElement("time");
    const article = documentRef.createElement("article");
    const heading = documentRef.createElement("h3");
    const description = documentRef.createElement("p");

    time.dateTime = item.time;
    time.textContent = item.time;
    heading.textContent = item.title;
    description.textContent = item.description;
    article.append(heading, description);
    listItem.append(time, article);
    agendaFragment.append(listItem);
  }

  agendaElement.replaceChildren(agendaFragment);
}
