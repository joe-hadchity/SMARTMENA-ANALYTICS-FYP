const axios = require("axios");

const env = require("../../config/env");

function getClient() {
  const token = env.META_MESSAGING_PAGE_ACCESS_TOKEN;
  if (!token) {
    const err = new Error(
      "Instagram Messaging API token is missing. Set META_MESSAGING_PAGE_ACCESS_TOKEN to enable DM inbox.",
    );
    err.status = 503;
    throw err;
  }
  return axios.create({
    baseURL: `${env.META_FACEBOOK_GRAPH_BASE}/${env.META_GRAPH_VERSION}`,
    timeout: 60_000,
    params: { access_token: token },
  });
}

function isEnabled() {
  return Boolean(env.META_MESSAGING_ENABLED && env.META_MESSAGING_IG_USER_ID);
}

async function fetchConversations({ limit = 10 } = {}) {
  if (!isEnabled()) {
    return {
      conversations: [],
      warnings: ["messaging_api_not_configured:set_META_MESSAGING_PAGE_ACCESS_TOKEN_and_META_MESSAGING_IG_USER_ID"],
    };
  }

  const client = getClient();
  try {
    const requestedLimit = Math.min(Number(limit) || 10, 25);
    const conversationIndex = new Map();
    const conversations = [];
    const warnings = [];
    let after = null;

    // Meta rejects larger Instagram conversation pages for this app, but it
    // accepts cursor pagination with limit=1. Walk the cursor one thread at a
    // time so the inbox sees more than only the latest conversation.
    while (conversationIndex.size < requestedLimit) {
      let data;
      try {
        ({ data } = await client.get(`/${env.META_MESSAGING_IG_USER_ID}/conversations`, {
          params: {
            platform: "instagram",
            limit: 1,
            fields: "id,updated_time",
            ...(after ? { after } : {}),
          },
        }));
      } catch (err) {
        warnings.push(`conversation_page_fetch_failed:${err.response?.data?.error?.message || err.message}`);
        break;
      }
      const page = Array.isArray(data?.data) ? data.data : [];
      for (const conversation of page) {
        if (conversation?.id) conversationIndex.set(String(conversation.id), conversation);
      }
      const nextAfter = data?.paging?.cursors?.after;
      if (!page.length || !nextAfter || nextAfter === after) break;
      after = nextAfter;
    }

    for (const conversation of conversationIndex.values()) {
      const { messages, warning } = await fetchConversationMessages(client, conversation.id);
      if (warning) warnings.push(warning);
      conversations.push({ ...conversation, messages: { data: messages } });
    }

    return {
      conversations,
      warnings,
    };
  } catch (err) {
    return {
      conversations: [],
      warnings: [`messaging_fetch_failed:${err.response?.data?.error?.message || err.message}`],
    };
  }
}

async function fetchConversationMessages(client, conversationId) {
  try {
    const { data } = await client.get(`/${conversationId}/messages`, {
      params: {
        limit: 5,
        fields: "id,created_time,from,to,message",
      },
    });
    return { messages: Array.isArray(data?.data) ? data.data : [], warning: null };
  } catch (err) {
    return {
      messages: [],
      warning: `message_thread_fetch_failed:${conversationId}:${err.response?.data?.error?.message || err.message}`,
    };
  }
}

async function sendMessage(recipientId, message) {
  if (!isEnabled()) {
    const err = new Error(
      "Instagram Messaging API is not configured. Set META_MESSAGING_PAGE_ACCESS_TOKEN and META_MESSAGING_IG_USER_ID.",
    );
    err.status = 503;
    throw err;
  }

  const client = getClient();
  const { data } = await client.post("/me/messages", {
    recipient: { id: recipientId },
    message: { text: message },
    messaging_type: "RESPONSE",
  });
  return data;
}

module.exports = {
  isEnabled,
  fetchConversations,
  sendMessage,
};
