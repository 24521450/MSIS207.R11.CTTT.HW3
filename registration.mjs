export const REGISTRATION_STATES = Object.freeze([
  "idle",
  "submitting",
  "success",
  "error",
]);

const NEXT_STATES = Object.freeze({
  idle: Object.freeze(["submitting"]),
  submitting: Object.freeze(["success", "error"]),
  success: Object.freeze(["submitting"]),
  error: Object.freeze(["submitting"]),
});

const STATE_MESSAGES = Object.freeze({
  idle: "",
  submitting: "Đang xử lý đăng ký mô phỏng…",
  success: "Đăng ký mô phỏng thành công. Thông tin chưa được gửi đến máy chủ.",
  error: "Chưa thể hoàn tất đăng ký mô phỏng. Vui lòng thử lại.",
});

export const MOCK_SUBMISSION_DELAY_MS = 800;

export function transitionRegistrationState(currentState, nextState) {
  if (!REGISTRATION_STATES.includes(currentState) || !NEXT_STATES[currentState].includes(nextState)) {
    throw new Error(`Invalid registration state transition: ${currentState} -> ${nextState}`);
  }

  return nextState;
}

export function createSimulatedRegistrationService({
  delayMs = MOCK_SUBMISSION_DELAY_MS,
  timers = globalThis,
} = {}) {
  if (!timers || typeof timers.setTimeout !== "function") {
    throw new TypeError("timers must provide setTimeout().");
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new TypeError("delayMs must be a non-negative finite number.");
  }

  return function submitRegistration(_payload) {
    return new Promise((resolve) => {
      timers.setTimeout(() => resolve(Object.freeze({ accepted: true })), delayMs);
    });
  };
}

export const submitRegistration = createSimulatedRegistrationService();

function readFormPayload(form) {
  const formData = new FormData(form);
  return Object.freeze({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });
}

function requireRegistrationElement(element, name) {
  if (!element) {
    throw new Error(`Registration form is missing ${name}.`);
  }
  return element;
}

export function bindRegistrationForm({
  form,
  submitButton,
  submitLabel,
  status,
  submit = submitRegistration,
  readPayload = readFormPayload,
} = {}) {
  requireRegistrationElement(form, "the form");
  requireRegistrationElement(submitButton, "the submit button");
  requireRegistrationElement(submitLabel, "the submit label");
  requireRegistrationElement(status, "the status region");
  if (typeof submit !== "function") {
    throw new TypeError("submit must be a function that returns a promise.");
  }
  if (typeof readPayload !== "function") {
    throw new TypeError("readPayload must be a function.");
  }

  let state = "idle";

  const renderState = (nextState) => {
    state = transitionRegistrationState(state, nextState);
    form.setAttribute("aria-busy", String(state === "submitting"));
    submitButton.disabled = state === "submitting";
    submitLabel.textContent = state === "submitting" ? "Đang gửi…" : "Gửi đăng ký";
    status.dataset.state = state;
    status.textContent = STATE_MESSAGES[state];
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (state === "submitting") return;

    const payload = readPayload(form);
    renderState("submitting");

    try {
      await submit(payload);
      form.reset();
      renderState("success");
    } catch {
      renderState("error");
    }
  }

  form.setAttribute("aria-busy", "false");
  submitButton.disabled = false;
  submitLabel.textContent = "Gửi đăng ký";
  status.dataset.state = "idle";
  status.textContent = STATE_MESSAGES.idle;
  form.addEventListener("submit", handleSubmit);

  return Object.freeze({
    getState: () => state,
    dispose: () => form.removeEventListener("submit", handleSubmit),
  });
}
