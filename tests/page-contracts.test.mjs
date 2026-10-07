import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eventConfig } from "../event-config.mjs";
import { parseUtcDeadline } from "../countdown.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../app.mjs", import.meta.url), "utf8");
const eventUi = readFileSync(new URL("../event-ui.mjs", import.meta.url), "utf8");
const registration = readFileSync(new URL("../registration.mjs", import.meta.url), "utf8");

test("the sample UTC deadline maps to 09:00 on 20 December 2026 in the configured timezone", () => {
  const parsed = parseUtcDeadline(eventConfig.startsAtUtc);

  assert.equal(parsed.ok, true);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: eventConfig.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(parsed.deadlineMs));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  assert.deepEqual(
    { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute },
    { year: "2026", month: "12", day: "20", hour: "09", minute: "00" },
  );
});

test("event configuration includes the illustrative venue and a complete agenda", () => {
  assert.match(eventConfig.title, /mẫu|Meetup/i);
  assert.match(eventConfig.venue, /Hội trường/);
  assert.equal(eventConfig.agenda.length, 4);
  for (const item of eventConfig.agenda) {
    assert.ok(item.time && item.title && item.description);
  }
});

test("the page has semantic Vietnamese structure and visible required controls", () => {
  assert.match(html, /<html lang="vi">/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /class="skip-link" href="#main"/);
  assert.doesNotMatch(html, /<div\b/i);
  assert.match(html, /<label for="full-name">Họ và tên/);
  assert.match(html, /<label for="email">Địa chỉ email/);
  const emailInput = html.match(/<input\b[^>]*id="email"[^>]*>/s)?.[0] ?? "";
  assert.match(emailInput, /type="email"/);
  assert.match(emailInput, /\brequired\b/);
  const submitButton = html.match(/<button\b[^>]*id="submit-button"[^>]*>/s)?.[0] ?? "";
  assert.match(submitButton, /\bdisabled\b/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.equal((html.match(/aria-live="polite"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
});

test("the landing page uses local assets and application code has no unsafe HTML sink", () => {
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /type="module" src="\.\/app\.mjs"/);
  assert.match(styles, /@media \(max-width: 26rem\)/);
  const applicationSource = `${app}\n${eventUi}\n${registration}`;
  assert.doesNotMatch(applicationSource, /\.innerHTML\s*=|\.insertAdjacentHTML\s*\(/);
});

test("page startup parses the shared UTC deadline once for display and countdown", () => {
  assert.equal((app.match(/parseUtcDeadline\(/g) ?? []).length, 1);
  assert.match(app, /renderEventDetails\(eventConfig, \{ parsedDeadline \}\)/);
  assert.match(app, /deadline: eventConfig\.startsAtUtc,\s*parsedDeadline/s);
  assert.match(eventUi, /providedParsedDeadline \?\? parseUtcDeadline/);
});
