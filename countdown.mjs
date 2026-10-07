const UTC_ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/;
const MAX_DATE_MILLISECONDS = 8.64e15;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

function invalidDeadline(message) {
  return Object.freeze({ ok: false, message });
}

export function parseUtcDeadline(isoString) {
  if (typeof isoString !== "string") {
    return invalidDeadline("Deadline phải là chuỗi thời gian UTC ISO 8601 kết thúc bằng Z.");
  }

  const match = UTC_ISO_PATTERN.exec(isoString);
  if (!match) {
    return invalidDeadline("Deadline phải có định dạng UTC ISO 8601 và hậu tố Z.");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText = ""] = match;
  const deadlineMs = Date.parse(isoString);
  if (!Number.isFinite(deadlineMs) || Math.abs(deadlineMs) > MAX_DATE_MILLISECONDS) {
    return invalidDeadline("Deadline nằm ngoài khoảng thời gian hợp lệ.");
  }

  const parsed = new Date(deadlineMs);
  const expectedMilliseconds = Number(fractionText.slice(0, 3).padEnd(3, "0"));
  const matchesInput =
    parsed.getUTCFullYear() === Number(yearText) &&
    parsed.getUTCMonth() + 1 === Number(monthText) &&
    parsed.getUTCDate() === Number(dayText) &&
    parsed.getUTCHours() === Number(hourText) &&
    parsed.getUTCMinutes() === Number(minuteText) &&
    parsed.getUTCSeconds() === Number(secondText) &&
    parsed.getUTCMilliseconds() === expectedMilliseconds;

  if (!matchesInput) {
    return invalidDeadline("Deadline không phải ngày giờ UTC hợp lệ.");
  }

  return Object.freeze({ ok: true, deadlineMs });
}

export function getCountdownParts(deadlineMs, nowMs = Date.now()) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) {
    throw new TypeError("deadlineMs và nowMs phải là timestamp dạng số hữu hạn.");
  }

  const remainingMs = Math.max(0, deadlineMs - nowMs);
  const remainingSeconds = Math.ceil(remainingMs / MILLISECONDS_PER_SECOND);
  const days = Math.floor(remainingSeconds / SECONDS_PER_DAY);
  const secondsAfterDays = remainingSeconds % SECONDS_PER_DAY;
  const hours = Math.floor(secondsAfterDays / SECONDS_PER_HOUR);
  const secondsAfterHours = secondsAfterDays % SECONDS_PER_HOUR;
  const minutes = Math.floor(secondsAfterHours / SECONDS_PER_MINUTE);
  const seconds = secondsAfterHours % SECONDS_PER_MINUTE;

  return Object.freeze({
    remainingMs,
    days,
    hours,
    minutes,
    seconds,
    expired: remainingMs === 0,
  });
}
