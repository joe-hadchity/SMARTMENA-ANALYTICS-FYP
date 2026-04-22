import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID;

const client = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

async function request(method, url, body) {
  try {
    const { data } = await client.request({ method, url, data: body });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

// Normalize Axios errors so callers get a single shape: { message, status, details, cause }.
function toApiError(err) {
  const status = err.response?.status;
  const body = err.response?.data;
  const message =
    (body && (body.message || body.error)) ||
    err.message ||
    "Request failed";

  const apiError = new Error(message);
  apiError.status = status;
  apiError.details = body?.details ?? body ?? null;
  apiError.cause = err;
  return apiError;
}

// POST /api/campaigns
// Automatically injects the demo user id from env so the UI never shows or
// requests the user_id field.
export async function createCampaign(form) {
  if (!DEMO_USER_ID) {
    throw new Error(
      "VITE_DEMO_USER_ID is not set. Add it to frontend-demo/.env.",
    );
  }
  return request("post", "/campaigns", {
    user_id: DEMO_USER_ID,
    ...form,
  });
}

// POST /api/posts
export async function createPost({ campaign_id, text_content, language }) {
  return request("post", "/posts", {
    campaign_id,
    text_content,
    language: language || "ar",
  });
}

// POST /api/analyze/sentiment
export async function analyzeSentiment({ postId, text }) {
  return request("post", "/analyze/sentiment", { postId, text });
}

// POST /api/predict/roi
export async function predictRoi(payload) {
  return request("post", "/predict/roi", payload);
}

export const config = {
  baseURL,
  demoUserIdConfigured: Boolean(DEMO_USER_ID),
};
