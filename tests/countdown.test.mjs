import assert from "node:assert/strict";
import test from "node:test";
import { getCountdownParts, parseUtcDeadline } from "../countdown.mjs";

test("parses a UTC ISO deadline and retains its exact timestamp", () => {
  const result = parseUtcDeadline("2026-12-20T02:00:00Z");

  assert.equal(result.ok, true);
  assert.equal(result.deadlineMs, Date.parse("2026-12-20T02:00:00Z"));
});

test("rejects offsets, local timestamps, malformed strings, and impossible calendar dates", () => {
  for (const invalid of [
    "2026-12-20T09:00:00+07:00",
    "2026-12-20T02:00:00",
    "not-a-date",
    "2026-02-30T02:00:00Z",
  ]) {
    const result = parseUtcDeadline(invalid);
    assert.equal(result.ok, false, `${invalid} should be rejected`);
    assert.match(result.message, /Deadline/);
  }
});

test("decomposes an exact day, hour, minute, and second boundary", () => {
  const durationMs = (2 * 86_400 + 3 * 3_600 + 4 * 60 + 5) * 1_000;

  assert.deepEqual(getCountdownParts(durationMs, 0), {
    remainingMs: durationMs,
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
    expired: false,
  });
});

test("rounds remaining time up to a whole second so it cannot expire early", () => {
  const parts = getCountdownParts(1, 0);

  assert.equal(parts.remainingMs, 1);
  assert.equal(parts.seconds, 1);
  assert.equal(parts.expired, false);
});

test("recomputes from the absolute deadline after a delayed callback", () => {
  const deadlineMs = 20_000;
  const first = getCountdownParts(deadlineMs, 0);
  const delayed = getCountdownParts(deadlineMs, 9_999);

  assert.equal(first.seconds, 20);
  assert.equal(delayed.remainingMs, 10_001);
  assert.equal(delayed.seconds, 11);
});

test("returns zero parts at and after the deadline", () => {
  for (const nowMs of [10_000, 25_000]) {
    assert.deepEqual(getCountdownParts(10_000, nowMs), {
      remainingMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    });
  }
});

test("rejects non-finite timestamps instead of producing NaN parts", () => {
  assert.throws(() => getCountdownParts(Number.NaN, 0), TypeError);
  assert.throws(() => getCountdownParts(10, Number.POSITIVE_INFINITY), TypeError);
});
