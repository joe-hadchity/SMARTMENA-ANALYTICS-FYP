# AI Advisor Conversation Persistence - Implementation Guide

## Overview

This guide documents the implementation of persistent conversation storage for the AI Advisor feature, enabling users to save and resume multiple conversations with full context continuity.

---

## Architecture & Best Practices

### 1. **Session Continuity Model**

The system uses a **two-tier ID architecture** for optimal flexibility:

1. **`conversationId`** (UUID) - SmartMENA's internal conversation identifier
   - Stored in PostgreSQL (`advisor_conversations.id`)
   - Used by frontend to fetch/manage conversations
   - Enables conversation metadata (title, status, message count)

2. **`external_session_id`** (string) - Fyp/Claude SDK's session identifier
   - Returned by Fyp backend after first message
   - Stored in `advisor_conversations.external_session_id`
   - **Critical**: Must be passed back to Fyp to maintain Claude's conversation context
   - Enables Claude to remember previous turns and maintain continuity

**Why two IDs?**
- Decouples SmartMENA's conversation management from Fyp's session lifecycle
- Allows future migration to different LLM backends without data loss
- Enables conversation features (rename, archive) independent of AI context

---

### 2. **Database Schema**

#### `advisor_conversations` table
- **Purpose**: Metadata about each conversation
- **Key fields**:
  - `id`: Primary key (UUID)
  - `workspace_id`: Multi-tenant isolation
  - `external_session_id`: Fyp session ID for context continuity
  - `title`: Auto-generated from first user message (60 char limit)
  - `mode`: `'general'` or `'create_campaign'`
  - `status`: `'active'` or `'archived'`
  - `message_count`: Auto-maintained by trigger
  - `last_message_at`: Auto-updated by trigger for sorting

#### `advisor_messages` table
- **Purpose**: Individual messages within conversations
- **Key fields**:
  - `id`: Primary key (UUID)
  - `conversation_id`: Foreign key to `advisor_conversations`
  - `role`: `'user'` or `'assistant'`
  - `content`: Message text
  - `campaign_created`: Boolean flag for campaign creation
  - `campaign_id`: External campaign ID if created

**Best Practices**:
- ✅ Automatic triggers update statistics (no manual count updates)
- ✅ Cascade deletion (deleting conversation removes all messages)
- ✅ Separate tables for metadata vs. content (optimizes queries)
- ✅ Timestamps on both tables for audit trail
- ✅ `metadata` JSONB columns for future extensibility

---

### 3. **API Design**

#### Core Endpoint: `POST /api/advisor-chat/chat`

**Request**:
```json
{
  "message": "Help me create a campaign",
  "conversationId": "uuid-here",  // Optional - omit for new conversation
  "mode": "general"                // Optional - defaults to 'general'
}
```

**Response**:
```json
{
  "conversationId": "uuid-here",
  "externalSessionId": "fyp-session-id",  // Pass this back to resume
  "message": "AI response here",
  "campaignCreated": false,
  "campaignId": null
}
```

**Flow**:
1. If `conversationId` provided → load existing conversation
2. If not provided → create new conversation with first message as title
3. Save user message to `advisor_messages`
4. Forward to Fyp with `external_session_id` (if exists)
5. Receive Fyp response with `sessionId`
6. Update `external_session_id` on first message (if new conversation)
7. Save assistant message to `advisor_messages`
8. Return response with `conversationId` for next turn

#### Management Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/advisor-chat/conversations` | GET | List last 20 conversations |
| `/api/advisor-chat/conversations/:id` | GET | Get conversation with all messages |
| `/api/advisor-chat/conversations` | POST | Create empty conversation (optional) |
| `/api/advisor-chat/conversations/:id` | PATCH | Update title/status |
| `/api/advisor-chat/conversations/:id` | DELETE | Permanently delete |

---

### 4. **Frontend Integration**

#### Key Changes in `/advisor` Page

**Before** (client-side only):
```typescript
const [sessions, setSessions] = useState<ChatSession[]>([]);
```

**After** (server-persisted):
```typescript
const conversationsQuery = useQuery({
  queryKey: ["advisor-conversations"],
  queryFn: () => advisorChatApi.listConversations({ limit: 20 }),
});

const activeConversationQuery = useQuery({
  queryKey: ["advisor-conversation", activeConversationId],
  queryFn: () => advisorChatApi.getConversation(activeConversationId!),
  enabled: !!activeConversationId,
});
```

**Benefits**:
- ✅ Conversations persist across browser sessions
- ✅ Conversations sync across devices (same workspace)
- ✅ React Query handles caching and revalidation
- ✅ Optimistic updates for better UX

---

### 5. **Session Continuity with Claude**

**Critical Implementation Detail**:

When resuming a conversation, you **must** pass the `external_session_id` back to Fyp:

```javascript
const response = await axios.post(`${FYP_ADVISOR_URL}/chat`, {
  message: enhancedMessage,
  clientId: FYP_CLIENT_ID,
  sessionId: conversation.external_session_id || undefined,  // ← This!
  enableWriteTools: conversation.mode === "create_campaign",
});
```

**Why this matters**:
- Claude SDK uses `sessionId` to load previous conversation turns
- Without it, Claude starts fresh and loses all context
- Fyp stores session files in `Fyp/claude-sdk/sessions/{clientId}/{sessionId}.json`
- Each session contains full conversation history for Claude's context

**Verification**:
To confirm session continuity is working:
1. Send a message: "My name is Alice"
2. Send followup: "What's my name?"
3. If Claude responds "Alice", continuity works ✓
4. If Claude says "I don't know", `sessionId` wasn't passed correctly ✗

---

## Database Migration

### Apply the schema

```bash
# Connect to Supabase via psql or SQL Editor
psql $SUPABASE_DATABASE_URL

# Run the migration
\i backend/db/schema_v20_advisor_conversations.sql
```

### Verify tables created

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'advisor_%';

-- Expected output:
-- advisor_conversations
-- advisor_messages
```

### Check triggers

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table LIKE 'advisor_%';

-- Expected:
-- advisor_message_stats_trigger | INSERT | advisor_messages
```

---

## Testing Checklist

### Backend

- [ ] POST `/api/advisor-chat/chat` (no conversationId) creates new conversation
- [ ] POST `/api/advisor-chat/chat` (with conversationId) resumes conversation
- [ ] GET `/api/advisor-chat/conversations` returns list ordered by `last_message_at`
- [ ] GET `/api/advisor-chat/conversations/:id` includes all messages
- [ ] PATCH `/api/advisor-chat/conversations/:id` updates title/status
- [ ] DELETE `/api/advisor-chat/conversations/:id` cascades to messages
- [ ] `message_count` auto-increments on new message
- [ ] `last_message_at` auto-updates on new message
- [ ] `external_session_id` persists after first message
- [ ] Session continuity: Claude remembers prior context

### Frontend

- [ ] Conversations list loads on page mount
- [ ] Clicking conversation loads messages
- [ ] Sending message in active conversation appends to it
- [ ] Sending message without active conversation creates new one
- [ ] New Chat button clears active conversation
- [ ] Delete button removes conversation from list
- [ ] Message count badge displays correctly
- [ ] Timestamps format correctly in user's locale (EN/AR)
- [ ] Optimistic updates feel snappy
- [ ] Loading states show during API calls

### Integration

- [ ] Multi-turn conversation maintains context (Claude remembers)
- [ ] Browser refresh preserves conversation state
- [ ] Multiple conversations can be managed simultaneously
- [ ] Campaign creation workflow still functions
- [ ] Error handling shows user-friendly messages

---

## Performance Considerations

### Database Indexes

The schema includes these indexes for optimal performance:

```sql
-- Conversations
CREATE INDEX advisor_conversations_workspace_idx ON advisor_conversations (workspace_id);
CREATE INDEX advisor_conversations_external_session_idx ON advisor_conversations (external_session_id);
CREATE INDEX advisor_conversations_last_message_idx ON advisor_conversations (last_message_at DESC);

-- Messages
CREATE INDEX advisor_messages_conversation_idx ON advisor_messages (conversation_id);
CREATE INDEX advisor_messages_created_idx ON advisor_messages (created_at ASC);
```

### Query Patterns

**Efficient** (uses indexes):
```javascript
// List recent conversations (uses last_message_at index)
SELECT * FROM advisor_conversations 
WHERE workspace_id = $1 
ORDER BY last_message_at DESC 
LIMIT 20;

// Get messages for conversation (uses conversation_id index)
SELECT * FROM advisor_messages 
WHERE conversation_id = $1 
ORDER BY created_at ASC;
```

**Avoid**:
```javascript
// ❌ Loading all messages eagerly in list view
SELECT c.*, array_agg(m.*) FROM advisor_conversations c
LEFT JOIN advisor_messages m ON m.conversation_id = c.id
GROUP BY c.id;  // Expensive JOIN on list query
```

### Caching Strategy

- **React Query cache**: 5 minutes for conversations list
- **Invalidation triggers**: After send message, delete, update
- **Optimistic updates**: Immediately show user message before API confirms

---

## Security Considerations

### Multi-Tenancy

- ✅ All queries filter by `workspace_id` from `x-workspace-id` header
- ✅ `workspaceContext()` middleware extracts and validates workspace
- ✅ Foreign key constraint ensures conversations belong to workspace

### Data Privacy

- ✅ No cross-workspace data leakage (workspace_id filter on all queries)
- ✅ Conversation content not logged (only metadata in logs)
- ✅ Delete is permanent (no soft delete for privacy compliance)

### Future: Row-Level Security (RLS)

Currently disabled for beta. To enable:

```sql
ALTER TABLE advisor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation_conversations ON advisor_conversations
  FOR ALL
  USING (workspace_id = current_setting('app.workspace_id')::uuid);

CREATE POLICY workspace_isolation_messages ON advisor_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM advisor_conversations 
      WHERE workspace_id = current_setting('app.workspace_id')::uuid
    )
  );
```

---

## Monitoring & Observability

### Key Metrics to Track

1. **Conversation volume**:
   ```sql
   SELECT DATE(created_at), COUNT(*) 
   FROM advisor_conversations 
   GROUP BY DATE(created_at) 
   ORDER BY DATE(created_at) DESC;
   ```

2. **Average conversation length**:
   ```sql
   SELECT AVG(message_count), PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY message_count)
   FROM advisor_conversations;
   ```

3. **Session continuity success rate**:
   - Monitor: "What's my name?" followup test
   - Expected: >95% context retention
   - If lower: Check `external_session_id` is being set/passed

4. **Error rates**:
   - Watch for: DB write failures (logged but non-blocking)
   - Watch for: Fyp connection errors (should be <1%)

### Logging

The backend logs these events:
- `[Advisor Chat] Failed to create conversation` → DB insert error
- `[Advisor Chat] Failed to save user message` → Non-blocking write failure
- `[Advisor Chat] Campaign created! ID: ...` → Campaign creation success

---

## Future Enhancements

### Planned Features

1. **Search conversations** (full-text search on message content)
   ```sql
   ALTER TABLE advisor_messages 
   ADD COLUMN content_tsvector tsvector;
   
   CREATE INDEX advisor_messages_search_idx 
   ON advisor_messages USING GIN(content_tsvector);
   ```

2. **Conversation sharing** (generate read-only share links)
   - New table: `advisor_conversation_shares`
   - Columns: `token`, `conversation_id`, `expires_at`

3. **Export conversations** (PDF, Markdown, JSON)
   - Endpoint: `GET /api/advisor-chat/conversations/:id/export?format=pdf`

4. **Conversation templates** (save workflows for reuse)
   - Table: `advisor_conversation_templates`
   - Pre-populate conversations with template prompts

5. **Multi-user collaboration** (multiple users in same conversation)
   - Add: `advisor_conversation_participants` table
   - Track: who said what via `user_id` on messages

---

## Troubleshooting

### Issue: Conversations not persisting

**Symptoms**: Conversations disappear after page refresh

**Diagnosis**:
1. Check browser console for API errors
2. Verify `x-workspace-id` header is being sent
3. Check backend logs for DB connection issues

**Fix**:
```bash
# Verify Supabase connection
curl -X GET "http://localhost:4000/api/health"

# Check workspace exists
SELECT * FROM workspaces LIMIT 1;

# If no workspace, create demo workspace
INSERT INTO workspaces (name, slug, locale_default)
VALUES ('Demo Workspace', 'demo', 'en');
```

### Issue: Claude doesn't remember context

**Symptoms**: "What's my name?" test fails after saying "My name is X"

**Diagnosis**:
1. Check if `external_session_id` is being saved
   ```sql
   SELECT id, external_session_id FROM advisor_conversations 
   ORDER BY created_at DESC LIMIT 5;
   ```
2. Verify Fyp backend is receiving `sessionId` parameter
   ```bash
   # Check Fyp logs for session loading
   cd Fyp/claude-sdk
   npm start  # Watch logs for "Loading session: ..."
   ```

**Fix**:
- Ensure `conversation.external_session_id` is passed to Fyp in chat route
- Verify Fyp is returning `sessionId` in response
- Check Fyp session files exist: `Fyp/claude-sdk/sessions/{clientId}/`

### Issue: Message count not updating

**Symptoms**: `message_count` shows 0 even with messages

**Diagnosis**:
```sql
-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'advisor_messages';

-- Manually verify count
SELECT c.id, c.message_count, COUNT(m.id) as actual_count
FROM advisor_conversations c
LEFT JOIN advisor_messages m ON m.conversation_id = c.id
GROUP BY c.id;
```

**Fix**:
```sql
-- Recreate trigger
DROP TRIGGER IF EXISTS advisor_message_stats_trigger ON advisor_messages;

CREATE TRIGGER advisor_message_stats_trigger
  AFTER INSERT ON advisor_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_advisor_conversation_stats();

-- Backfill existing conversations
UPDATE advisor_conversations c
SET message_count = (
  SELECT COUNT(*) FROM advisor_messages 
  WHERE conversation_id = c.id
);
```

---

## API Reference

### Full API Documentation

See complete API docs with request/response schemas:
- [Backend Controller](backend/src/controllers/advisorConversationsController.js)
- [Frontend API Client](frontend/src/lib/api.ts) (search for `advisorChatApi`)

---

## Summary

This implementation provides:

✅ **Persistent conversations** across sessions and devices  
✅ **Session continuity** with Claude via Fyp integration  
✅ **Multi-conversation support** with metadata management  
✅ **Workspace isolation** for multi-tenancy  
✅ **Scalable architecture** with proper indexing  
✅ **Best practice patterns** (triggers, cascade deletes, JSONB metadata)  
✅ **Production-ready** error handling and logging  

The system follows industry best practices for conversation AI applications:
- Separate metadata from content
- Two-tier ID architecture for flexibility
- Automatic statistics maintenance
- Proper indexing for performance
- Clear separation of concerns (DB → Controller → Route → Frontend)

---

**Questions or issues?** Check the Troubleshooting section or inspect the backend logs with:
```bash
cd backend
npm run dev  # Watch logs in development
```
