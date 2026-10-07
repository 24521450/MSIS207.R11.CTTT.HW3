import assert from "node:assert/strict";
import test from "node:test";
import {
  bindRegistrationForm,
  createSimulatedRegistrationService,
  MOCK_SUBMISSION_DELAY_MS,
  transitionRegistrationState,
} from "../registration.mjs";

function makeFormEnvironment() {
  const formListeners = new Map();
  const attributes = new Map();
  const form = {
    resetCount: 0,
    addEventListener(type, callback) {
      formListeners.set(type, callback);
    },
    removeEventListener(type, callback) {
      if (formListeners.get(type) === callback) formListeners.delete(type);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    reset() {
      this.resetCount += 1;
    },
    submit() {
      const listener = formListeners.get("submit");
      let defaultPrevented = false;
      const result = listener({
        preventDefault() {
          defaultPrevented = true;
        },
      });
      return { defaultPrevented, result };
    },
    attributes,
  };
  const submitButton = { disabled: false };
  const submitLabel = { textContent: "Gửi đăng ký" };
  const status = { textContent: "", dataset: {} };
  const payload = Object.freeze({ name: "Lan Nguyen", email: "lan@example.test", message: "Xin chào" });
  const controller = (submit) =>
    bindRegistrationForm({
      form,
      submitButton,
      submitLabel,
      status,
      submit,
      readPayload: () => payload,
    });

  return { attributes, controller, form, payload, status, submitButton, submitLabel };
}

test("allows only the defined registration state transitions", () => {
  assert.equal(transitionRegistrationState("idle", "submitting"), "submitting");
  assert.equal(transitionRegistrationState("submitting", "success"), "success");
  assert.equal(transitionRegistrationState("submitting", "error"), "error");
  assert.equal(transitionRegistrationState("success", "submitting"), "submitting");
  assert.equal(transitionRegistrationState("error", "submitting"), "submitting");
  assert.throws(() => transitionRegistrationState("idle", "success"), /Invalid registration/);
});

test("successful simulated submission resets the form and keeps the success message", async () => {
  const environment = makeFormEnvironment();
  let receivedPayload;
  const controller = environment.controller(async (payload) => {
    receivedPayload = payload;
    return { accepted: true };
  });
  const event = environment.form.submit();

  assert.equal(event.defaultPrevented, true);
  assert.equal(environment.attributes.get("aria-busy"), "true");
  assert.equal(environment.submitButton.disabled, true);
  assert.equal(environment.submitLabel.textContent, "Đang gửi…");
  assert.equal(controller.getState(), "submitting");

  await event.result;
  assert.equal(receivedPayload, environment.payload);
  assert.equal(environment.form.resetCount, 1);
  assert.equal(controller.getState(), "success");
  assert.equal(environment.attributes.get("aria-busy"), "false");
  assert.equal(environment.submitButton.disabled, false);
  assert.match(environment.status.textContent, /thành công/);
  assert.match(environment.status.textContent, /chưa được gửi đến máy chủ/);
});

test("the simulated service waits 800ms and resolves without transmitting the payload", async () => {
  const scheduled = [];
  const service = createSimulatedRegistrationService({
    timers: {
      setTimeout(callback, delay) {
        scheduled.push({ callback, delay });
      },
    },
  });
  const payload = { name: "A", email: "a@example.test", message: "private text" };
  let settled = false;
  const resultPromise = service(payload).then((result) => {
    settled = true;
    return result;
  });

  assert.equal(scheduled[0].delay, MOCK_SUBMISSION_DELAY_MS);
  assert.equal(settled, false);
  scheduled[0].callback();
  assert.deepEqual(await resultPromise, { accepted: true });
  assert.equal(settled, true);
});

test("repeated submissions while pending call the service once and release the form on success", async () => {
  const environment = makeFormEnvironment();
  let calls = 0;
  let finishRequest;
  const controller = environment.controller(() => {
    calls += 1;
    return new Promise((resolve) => {
      finishRequest = resolve;
    });
  });

  const first = environment.form.submit();
  const repeated = environment.form.submit();

  assert.equal(first.defaultPrevented, true);
  assert.equal(repeated.defaultPrevented, true);
  assert.equal(calls, 1);
  assert.equal(controller.getState(), "submitting");
  assert.equal(environment.attributes.get("aria-busy"), "true");
  assert.equal(environment.submitButton.disabled, true);

  await repeated.result;
  finishRequest({ accepted: true });
  await first.result;

  assert.equal(controller.getState(), "success");
  assert.equal(environment.form.resetCount, 1);
  assert.equal(environment.attributes.get("aria-busy"), "false");
  assert.equal(environment.submitButton.disabled, false);
});

test("a rejected request retains form data, returns to error, and allows a successful retry", async () => {
  const environment = makeFormEnvironment();
  const receivedPayloads = [];
  let calls = 0;
  const controller = environment.controller((payload) => {
    calls += 1;
    receivedPayloads.push(payload);
    if (calls === 1) return Promise.reject(new Error("temporary simulation failure"));
    return Promise.resolve({ accepted: true });
  });

  const failedAttempt = environment.form.submit();
  await assert.doesNotReject(failedAttempt.result);
  assert.equal(controller.getState(), "error");
  assert.match(environment.status.textContent, /thử lại/);
  assert.equal(environment.form.resetCount, 0);
  assert.equal(environment.attributes.get("aria-busy"), "false");
  assert.equal(environment.submitButton.disabled, false);

  const retry = environment.form.submit();
  await retry.result;
  assert.equal(controller.getState(), "success");
  assert.equal(calls, 2);
  assert.deepEqual(receivedPayloads, [environment.payload, environment.payload]);
  assert.equal(environment.form.resetCount, 1);
});
