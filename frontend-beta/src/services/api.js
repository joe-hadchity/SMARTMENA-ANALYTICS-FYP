import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID;

const client = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

export const config = {
  baseURL,
  demoUserIdConfigured: Boolean(DEMO_USER_ID),
  demoUserId: DEMO_USER_ID || null,
};

async function request(method, url, body) {
  try {
    const { data } = await client.request({ method, url, data: body });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

function toApiError(err) {
  const status = err.response?.status;
  const body = err.response?.data;
  const fieldErrors = extractFieldErrors(body);
  const isNetwork = !err.response && Boolean(err.request);
  const isTimeout = err.code === "ECONNABORTED";

  let message;
  if (isTimeout) {
    message = `Request timed out after ${Math.round((err.config?.timeout || 30000) / 1000)}s. The backend is slow or unreachable.`;
  } else if (isNetwork) {
    message = `Can't reach the backend at ${baseURL}. Make sure it's running and CORS is allowed.`;
  } else if (fieldErrors.length > 0) {
    const first = fieldErrors[0];
    message = `${first.field}: ${first.message}`;
  } else {
    message =
      (body && (body.message || body.error)) || err.message || "Request failed";
  }

  const apiError = new Error(message);
  apiError.status = status;
  apiError.details = body?.details ?? body ?? null;
  apiError.fieldErrors = fieldErrors;
  apiError.isNetwork = isNetwork;
  apiError.isTimeout = isTimeout;
  apiError.cause = err;
  return apiError;
}

function extractFieldErrors(body) {
  const map = body?.details?.fieldErrors;
  if (!map || typeof map !== "object") return [];
  const out = [];
  for (const [field, messages] of Object.entries(map)) {
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (m) out.push({ field, message: String(m) });
      }
    }
  }
  return out;
}

export async function health() {
  return request("get", "/health");
}

export async function createCampaign(form) {
  if (!DEMO_USER_ID) {
    throw new Error(
      "VITE_DEMO_USER_ID is not set. Add it to frontend-beta/.env and restart.",
    );
  }
  return request("post", "/campaigns", {
    user_id: DEMO_USER_ID,
    ...form,
  });
}

export async function createPost(form) {
  return request("post", "/posts", form);
}

export async function analyzeSentiment(payload) {
  return request("post", "/analyze/sentiment", payload);
}

export async function predictRoi(payload) {
  return request("post", "/predict/roi", payload);
}
