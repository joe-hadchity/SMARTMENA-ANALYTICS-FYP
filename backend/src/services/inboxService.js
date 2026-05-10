const { getSupabase } = require("../config/supabase");
const instagramProvider = require("./providers/metaInstagramProvider");
const messagingProvider = require("./providers/metaMessagingProvider");

const TABLE = "inbox_items";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error("Supabase is not configured.");
    err.status = 503;
    throw err;
  }
  return supabase;
}

function wrapDbError(error) {
  const err = new Error(error.message || "Inbox database error");
  err.status = error.code === "42P01" ? 501 : 400;
  err.details = { code: error.code, hint: "Apply backend/db/schema_v18.sql if inbox_items is missing." };
  return err;
}

async function listInbox(workspaceId, { type, status, limit = 100 } = {}) {
  const supabase = requireClient();
  let query = supabase
    .from(TABLE)
    .select("*, social_posts(caption, permalink, media_type, published_at)")
    .eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(Number(limit) || 100, 300));

  if (type && type !== "all") query = query.eq("item_type", type);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw wrapDbError(error);
  return data || [];
}

async function ensureInboxTable(supabase) {
  const { error } = await supabase.from(TABLE).select("id").limit(1);
  if (error) throw wrapDbError(error);
}

async function getSummary(workspaceId) {
  const rows = await listInbox(workspaceId, { limit: 300 });
  return {
    total: rows.length,
    unread: rows.filter((row) => row.status === "unread").length,
    comments: rows.filter((row) => row.item_type === "comment").length,
    messages: rows.filter((row) => row.item_type === "message").length,
    replied: rows.filter((row) => row.status === "replied").length,
  };
}

async function syncInbox(workspaceId, { limit = 50 } = {}) {
  const supabase = requireClient();
  await ensureInboxTable(supabase);
  const warnings = [];

  const { data: accounts, error: accountErr } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "meta_instagram")
    .order("last_synced_at", { ascending: false, nullsFirst: false });
  if (accountErr) throw wrapDbError(accountErr);

  const account = (accounts || []).find((row) => row.metadata?.source === "meta_graph");
  if (!account) {
    return {
      comments_imported: 0,
      messages_imported: 0,
      warnings: ["meta_graph_account_missing:refresh_instagram_posts_first"],
    };
  }

  const { data: posts, error: postErr } = await supabase
    .from("social_posts")
    .select("id, platform_post_id, permalink, caption, metadata_json, published_at")
    .eq("social_account_id", account.id)
    .eq("metadata_json->>source", "meta_graph")
    .order("published_at", { ascending: false })
    .limit(Math.min(Number(limit) || 50, 100));
  if (postErr) throw wrapDbError(postErr);

  const commentRows = [];
  let commentTextUnavailableCount = 0;
  for (const post of posts || []) {
    const result = await instagramProvider.fetchMediaComments(post.platform_post_id, undefined, {
      limit: 100,
    });
    if (result._error) {
      warnings.push(`comments_failed:${post.platform_post_id}:${result._error}`);
      continue;
    }
    const comments = Array.isArray(result.data) ? result.data : [];
    if (!comments.length && Number(post.metadata_json?.raw_payload?.comments_count || 0) > 0) {
      commentTextUnavailableCount += 1;
    }
    for (const comment of comments) {
      if (!String(comment.text || "").trim()) continue;
      commentRows.push({
        workspace_id: workspaceId,
        social_account_id: account.id,
        social_post_id: post.id,
        platform: "instagram",
        provider: "meta_graph",
        item_type: "comment",
        direction: "inbound",
        external_id: String(comment.id),
        thread_external_id: String(post.platform_post_id),
        parent_external_id: String(post.platform_post_id),
        author_username: comment.username || null,
        body: comment.text,
        status: "unread",
        permalink: post.permalink,
        published_at: comment.timestamp || post.published_at || null,
        raw_payload_json: comment,
      });
    }
  }

  let commentsImported = 0;
  if (commentRows.length) {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(commentRows, {
        onConflict: "workspace_id,platform,item_type,external_id",
        ignoreDuplicates: false,
      })
      .select("id");
    if (error) throw wrapDbError(error);
    commentsImported = data?.length || commentRows.length;
  }
  if (commentTextUnavailableCount > 0) {
    warnings.push(
      `comments_text_unavailable:${commentTextUnavailableCount}_posts_have_comment_counts_but_graph_returned_no_comment_text`,
    );
  }

  const messageResult = await syncMessages(supabase, workspaceId, account.id);
  warnings.push(...messageResult.warnings);

  return {
    comments_imported: commentsImported,
    messages_imported: messageResult.messages_imported,
    warnings,
  };
}

async function syncMessages(supabase, workspaceId, socialAccountId) {
  const result = await messagingProvider.fetchConversations({ limit: 25 });
  const { data: account } = await supabase
    .from("social_accounts")
    .select("external_account_id, handle, metadata")
    .eq("id", socialAccountId)
    .maybeSingle();
  const ownIds = new Set(
    [
      account?.external_account_id?.replace(/^meta_ig:/, ""),
      account?.metadata?.ig_user_id,
      account?.metadata?.page_id,
      account?.metadata?.messaging_ig_user_id,
    ]
      .filter(Boolean)
      .map(String),
  );
  const ownHandle = String(account?.handle || "").replace(/^@/, "").toLowerCase();

  const rows = [];
  for (const conversation of result.conversations || []) {
    const messages = Array.isArray(conversation?.messages?.data)
      ? conversation.messages.data
      : [];
    for (const message of messages) {
      if (!String(message.message || "").trim()) continue;
      const fromId = message.from?.id ? String(message.from.id) : "";
      const fromUsername = String(message.from?.username || message.from?.name || "")
        .replace(/^@/, "")
        .toLowerCase();
      const isOwnMessage = ownIds.has(fromId) || Boolean(ownHandle && fromUsername === ownHandle);
      rows.push({
        workspace_id: workspaceId,
        social_account_id: socialAccountId,
        platform: "instagram",
        provider: "meta_messaging",
        item_type: "message",
        direction: isOwnMessage ? "outbound" : "inbound",
        external_id: String(message.id),
        thread_external_id: String(conversation.id),
        author_id: message.from?.id || null,
        author_username: message.from?.username || message.from?.name || null,
        body: message.message,
        status: isOwnMessage ? "replied" : "unread",
        published_at: message.created_time || conversation.updated_time || null,
        raw_payload_json: { conversation, message },
      });
    }
  }

  if (!rows.length) {
    return { messages_imported: 0, warnings: result.warnings || [] };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "workspace_id,platform,item_type,external_id" })
    .select("id");
  if (error) throw wrapDbError(error);
  return { messages_imported: data?.length || rows.length, warnings: result.warnings || [] };
}

async function updateStatus(workspaceId, itemId, status) {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("id", itemId)
    .select()
    .maybeSingle();
  if (error) throw wrapDbError(error);
  if (!data) {
    const err = new Error("Inbox item not found");
    err.status = 404;
    throw err;
  }
  return data;
}

async function reply(workspaceId, itemId, message) {
  const supabase = requireClient();
  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    const err = new Error("Reply message is required.");
    err.status = 400;
    throw err;
  }

  const { data: item, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw wrapDbError(error);
  if (!item) {
    const err = new Error("Inbox item not found");
    err.status = 404;
    throw err;
  }
  if (item.direction === "outbound") {
    const err = new Error("This is a sent message. Select an inbound comment or DM to reply.");
    err.status = 400;
    throw err;
  }

  let response;
  let outboundExternalId = `local:${item.id}:${Date.now()}`;
  let provider = item.provider;
  if (item.item_type === "comment") {
    response = await instagramProvider.replyToComment(item.external_id, cleanMessage);
    outboundExternalId = String(response?.id || outboundExternalId);
  } else if (item.item_type === "message") {
    response = await messagingProvider.sendMessage(item.author_id, cleanMessage);
    outboundExternalId = String(response?.message_id || response?.recipient_id || outboundExternalId);
    provider = "meta_messaging";
  } else {
    const err = new Error("Unsupported inbox item type.");
    err.status = 400;
    throw err;
  }

  const outbound = {
    workspace_id: workspaceId,
    social_account_id: item.social_account_id,
    social_post_id: item.social_post_id,
    platform: item.platform,
    provider,
    item_type: item.item_type,
    direction: "outbound",
    external_id: outboundExternalId,
    thread_external_id: item.thread_external_id || item.external_id,
    parent_external_id: item.external_id,
    body: cleanMessage,
    status: "replied",
    permalink: item.permalink,
    published_at: new Date().toISOString(),
    raw_payload_json: { response },
  };

  const { data: saved, error: saveErr } = await supabase
    .from(TABLE)
    .insert(outbound)
    .select()
    .maybeSingle();
  if (saveErr) throw wrapDbError(saveErr);

  await updateStatus(workspaceId, item.id, "replied");
  return { inbound: { ...item, status: "replied" }, outbound: saved };
}

async function ingestMetaWebhook(payload) {
  const supabase = requireClient();
  await ensureInboxTable(supabase);

  const rows = [];
  const warnings = [];
  for (const entry of payload?.entry || []) {
    rows.push(...(await rowsFromMessagingEntry(supabase, entry, warnings)));
    rows.push(...(await rowsFromInstagramChanges(supabase, entry, warnings)));
  }

  if (!rows.length) return { imported: 0, warnings };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: "workspace_id,platform,item_type,external_id" })
    .select("id");
  if (error) throw wrapDbError(error);
  return { imported: data?.length || rows.length, warnings };
}

async function rowsFromMessagingEntry(supabase, entry, warnings) {
  const rows = [];
  const events = Array.isArray(entry?.messaging) ? entry.messaging : [];
  for (const event of events) {
    const text = event?.message?.text || event?.postback?.title || "";
    if (!String(text).trim()) continue;
    const account = await resolveAccountForMetaWebhook(supabase, {
      igUserId: event?.recipient?.id || entry?.id,
    });
    if (!account) {
      warnings.push("webhook_message_unmapped:no_matching_social_account");
      continue;
    }
    const senderId = event?.sender?.id ? String(event.sender.id) : "";
    const senderUsername = String(event?.sender?.username || "")
      .replace(/^@/, "")
      .toLowerCase();
    const ownIds = new Set(
      [
        account.external_account_id?.replace(/^meta_ig:/, ""),
        account.metadata?.ig_user_id,
        account.metadata?.page_id,
        account.metadata?.messaging_ig_user_id,
      ]
        .filter(Boolean)
        .map(String),
    );
    const ownHandle = String(account.handle || "").replace(/^@/, "").toLowerCase();
    const isOwnMessage =
      event?.message?.is_echo === true ||
      ownIds.has(senderId) ||
      Boolean(ownHandle && senderUsername === ownHandle);
    rows.push({
      workspace_id: account.workspace_id,
      social_account_id: account.id,
      platform: "instagram",
      provider: "meta_webhook",
      item_type: "message",
      direction: isOwnMessage ? "outbound" : "inbound",
      external_id: String(event?.message?.mid || event?.timestamp || Date.now()),
      thread_external_id: String(event?.sender?.id || ""),
      author_id: event?.sender?.id || null,
      author_username: event?.sender?.username || null,
      body: String(text),
      status: isOwnMessage ? "replied" : "unread",
      published_at: event?.timestamp ? new Date(Number(event.timestamp)).toISOString() : new Date().toISOString(),
      raw_payload_json: event,
    });
  }
  return rows;
}

async function rowsFromInstagramChanges(supabase, entry, warnings) {
  const rows = [];
  const changes = Array.isArray(entry?.changes) ? entry.changes : [];
  for (const change of changes) {
    const value = change?.value || {};
    const commentId = value.comment_id || value.id;
    const mediaId = value.media_id || value.media?.id || value.post_id;
    const text = value.text || value.message || "";
    if (!commentId || !String(text).trim()) continue;

    const resolved = await resolvePostForMetaWebhook(supabase, mediaId);
    if (!resolved) {
      warnings.push(`webhook_comment_unmapped:${mediaId || "missing_media_id"}`);
      continue;
    }

    rows.push({
      workspace_id: resolved.account.workspace_id,
      social_account_id: resolved.account.id,
      social_post_id: resolved.post?.id || null,
      platform: "instagram",
      provider: "meta_webhook",
      item_type: "comment",
      direction: "inbound",
      external_id: String(commentId),
      thread_external_id: mediaId ? String(mediaId) : null,
      parent_external_id: mediaId ? String(mediaId) : null,
      author_id: value.from?.id || value.user_id || null,
      author_username: value.from?.username || value.username || null,
      body: String(text),
      status: "unread",
      permalink: resolved.post?.permalink || null,
      published_at: value.created_time || new Date().toISOString(),
      raw_payload_json: change,
    });
  }
  return rows;
}

async function resolvePostForMetaWebhook(supabase, mediaId) {
  if (!mediaId) return null;
  const { data: post } = await supabase
    .from("social_posts")
    .select("*, social_accounts(*)")
    .eq("platform_post_id", String(mediaId))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!post?.social_accounts) return null;
  return { post, account: post.social_accounts };
}

async function resolveAccountForMetaWebhook(supabase, { igUserId }) {
  if (!igUserId) return null;
  let { data } = await supabase
    .from("social_accounts")
    .select("*")
    .or(`external_account_id.eq.meta_ig:${igUserId},metadata->>ig_user_id.eq.${igUserId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) return data;

  ({ data } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("metadata->>page_id", String(igUserId))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle());
  if (data) return data;

  // For local MVP demos, Meta may send the linked Page id in entry.id while
  // our social_accounts row is keyed by the IG user id. Fall back to the most
  // recently synced real Instagram account so webhook events still land.
  ({ data } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("provider", "meta_instagram")
    .eq("metadata->>source", "meta_graph")
    .order("last_synced_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle());
  return data || null;
}

module.exports = {
  listInbox,
  getSummary,
  syncInbox,
  updateStatus,
  reply,
  ingestMetaWebhook,
};
