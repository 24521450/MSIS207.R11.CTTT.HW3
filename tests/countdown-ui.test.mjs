import assert from "node:assert/strict";
import test from "node:test";
import { startCountdown } from "../event-ui.mjs";

function makeCountdownEnvironment() {
  const selectors = [
    "[data-countdown-days]",
    "[data-countdown-hours]",
    "[data-countdown-minutes]",
    "[data-countdown-seconds]",
    "[data-countdown-message]",
  ];
  const elements = new Map(selectors.map((selector) => [selector, { textContent: "--" }]));
  const root = {
    dataset: {},
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  };
  const listeners = new Map();
  const documentRef = {
    visibilityState: "visible",
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    removeEventListener(type, callback) {
      if (listeners.get(type) === callback) listeners.delete(type);
    },
  };
  const intervals = new Map();
  let nextIntervalId = 1;
  let nowMs = 0;
  const timers = {
    setInterval(callback, delay) {
      const id = nextIntervalId++;
      intervals.set(id, { callback, delay });
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  };

  return {
    elements,
    intervals,
    listeners,
    documentRef,
    root,
    timers,
    setNow(value) {
      nowMs = value;
    },
    now() {
      return nowMs;
    },
    tick() {
      const [interval] = intervals.values();
      interval?.callback();
    },
    changeVisibility(value) {
      documentRef.visibilityState = value;
      listeners.get("visibilitychange")?.();
    },
  };
}

test("renders immediately and recalculates from the clock when a delayed tick runs", () => {
  const environment = makeCountdownEnvironment();
  const cleanup = startCountdown({
    root: environment.root,
    deadline: "1970-01-01T00:00:20Z",
    now: environment.now,
    timers: environment.timers,
    documentRef: environment.documentRef,
  });

  assert.equal(environment.elements.get("[data-countdown-seconds]").textContent, "20");
  assert.equal(environment.root.dataset.countdownState, "running");
  assert.equal(environment.intervals.size, 1);
  assert.equal(environment.intervals.values().next().value.delay, 1_000);

  environment.setNow(9_999);
  environment.tick();
  assert.equal(environment.elements.get("[data-countdown-seconds]").textContent, "11");

  cleanup();
  assert.equal(environment.intervals.size, 0);
  assert.equal(environment.listeners.size, 0);
});

test("invalid deadline displays an error and does not schedule a timer", () => {
  const environment = makeCountdownEnvironment();

  startCountdown({
    root: environment.root,
    deadline: "2026-12-20T09:00:00+07:00",
    now: environment.now,
    timers: environment.timers,
    documentRef: environment.documentRef,
  });

  assert.equal(environment.root.dataset.countdownState, "error");
  assert.match(environment.elements.get("[data-countdown-message]").textContent, /hậu tố Z/i);
  assert.equal(environment.elements.get("[data-countdown-days]").textContent, "--");
  assert.equal(environment.intervals.size, 0);
  assert.equal(environment.listeners.size, 0);
});

test("an already-expired deadline displays zeros and does not start a timer", () => {
  const environment = makeCountdownEnvironment();
  environment.setNow(20_000);

  startCountdown({
    root: environment.root,
    deadline: "1970-01-01T00:00:20Z",
    now: environment.now,
    timers: environment.timers,
    documentRef: environment.documentRef,
  });

  for (const selector of [
    "[data-countdown-days]",
    "[data-countdown-hours]",
    "[data-countdown-minutes]",
    "[data-countdown-seconds]",
  ]) {
    assert.equal(environment.elements.get(selector).textContent, "00");
  }
  assert.equal(environment.root.dataset.countdownState, "expired");
  assert.equal(environment.elements.get("[data-countdown-message]").textContent, "Sự kiện đã bắt đầu.");
  assert.equal(environment.intervals.size, 0);
});

test("visibility return updates immediately and expiration removes timer and listener", () => {
  const environment = makeCountdownEnvironment();

  startCountdown({
    root: environment.root,
    deadline: "1970-01-01T00:00:10Z",
    now: environment.now,
    timers: environment.timers,
    documentRef: environment.documentRef,
  });
  environment.setNow(5_000);
  environment.changeVisibility("hidden");
  assert.equal(environment.elements.get("[data-countdown-seconds]").textContent, "10");

  environment.changeVisibility("visible");
  assert.equal(environment.elements.get("[data-countdown-seconds]").textContent, "05");

  environment.setNow(10_000);
  environment.tick();
  assert.equal(environment.root.dataset.countdownState, "expired");
  assert.equal(environment.intervals.size, 0);
  assert.equal(environment.listeners.size, 0);
});

test("reinitializing on the same root replaces the active interval without affecting the replacement", () => {
  const environment = makeCountdownEnvironment();
  const options = {
    root: environment.root,
    deadline: "1970-01-01T00:00:20Z",
    now: environment.now,
    timers: environment.timers,
    documentRef: environment.documentRef,
  };
  const firstCleanup = startCountdown(options);
  const secondCleanup = startCountdown(options);

  firstCleanup();
  assert.equal(environment.intervals.size, 1);
  assert.equal(environment.listeners.size, 1);

  secondCleanup();
  assert.equal(environment.intervals.size, 0);
  assert.equal(environment.listeners.size, 0);
});
