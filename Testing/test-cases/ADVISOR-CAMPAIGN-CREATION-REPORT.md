# AI Advisor Campaign Creation - Technical Documentation

**Report Section**: Testing & Implementation  
**Feature**: Campaign Creation via AI Chat Interface  
**Date**: June 1, 2026

---

## 1. Overview: How Campaign Creation Works

SmartMENA Analytics offers **two methods** for creating Meta Ads campaigns:

1. **Traditional Form** - Manual entry via structured form fields
2. **AI Advisor Chat** - Conversational campaign creation powered by Claude AI

The AI Advisor provides an intelligent, user-friendly alternative that guides users through campaign setup by asking contextual questions and providing recommendations based on their business goals and existing campaign performance.

---

## 2. AI Advisor Architecture

### 2.1 System Components

The AI Advisor campaign creation flow involves **three key services**:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │──────▶│   Backend       │──────▶│  Fyp Advisor    │
│  (Next.js)      │      │   (Express)     │      │  (Claude SDK)   │
│  Port 3000      │◀──────│   Port 4000     │◀──────│  Port 3001      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
       │                         │                         │
       │                         │                         │
       ▼                         ▼                         ▼
  React State              Supabase DB            Claude 4.X API
  (UI Messages)           (Conversation           (LLM Processing)
                          Persistence)
```

**Flow**:
1. User types message in chat UI (Frontend)
2. Frontend sends to `/api/advisor-chat/chat` (Backend)
3. Backend saves message to database & forwards to Fyp (External Advisor Service)
4. Fyp calls Claude API with campaign creation context
5. Claude generates response with campaign recommendations
6. Response flows back through Backend → Frontend
7. User confirms → Campaign created via Meta Ads API

---

## 3. Frontend Implementation (React + Next.js)

### 3.1 Component Structure

**File**: `frontend/src/components/campaigns/AdvisorChatModal.tsx`

The Advisor Chat is a **modal dialog** that overlays the campaigns page when the user clicks "+ Create Campaign with AI Advisor".

#### Key Features:
- **Real-time messaging** with typing indicators
- **Session persistence** via `sessionId` stored in component state
- **Markdown formatting** for rich AI responses
- **Error handling** with fallback messages
- **Auto-scroll** to latest message

### 3.2 Code Snippet: Sending User Messages

```typescript
const sendMessage = async () => {
  if (!input.trim() || loading) return;

  // Add user message to UI
  const userMessage: Message = {
    role: "user",
    content: input.trim(),
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setLoading(true);

  try {
    // Call backend advisor endpoint
    const url = `${ADVISOR_API_URL}/advisor-chat/chat`;
    
    const response = await axios.post(url, {
      message: userMessage.content,
      sessionId: sessionId || undefined,      // Resume existing conversation
      mode: "create_campaign",                // Enable campaign creation mode
    }, {
      headers: { "Content-Type": "application/json" },
    });

    const data = response.data;

    // Save session ID for conversation continuity
    if (data.sessionId && !sessionId) {
      setSessionId(data.sessionId);
    }

    // Add AI response to UI
    const assistantMessage: Message = {
      role: "assistant",
      content: data.message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

  } catch (err) {
    console.error("Advisor API error:", err);
    // Show error message in chat
  } finally {
    setLoading(false);
  }
};
```

**What happens here:**
- User's message is optimistically added to the UI immediately
- Request is sent to backend with `mode: "create_campaign"` flag
- Session ID is preserved for conversation continuity
- AI response is appended to the conversation thread

---

### 3.3 Code Snippet: Initial Greeting

When the modal opens, the AI Advisor greets the user with campaign creation guidance:

```typescript
useEffect(() => {
  if (open && messages.length === 0) {
    setMessages([
      {
        role: "assistant",
        content:
          "👋 Hi! I'm your AI Campaign Advisor. I'll help you create a high-performing Meta Ads campaign.\n\n" +
          "To give you the best recommendations, tell me:\n\n" +
          "**1. What's your main goal?**\n" +
          "• Awareness - Reach more people\n" +
          "• Traffic - Drive website visits\n" +
          "• Engagement - Get more interactions\n" +
          "• Leads - Collect customer info\n" +
          "• Sales - Drive purchases\n" +
          "• App Promotion - Get app installs\n\n" +
          "**2. What's your budget?** (e.g., $50/day or $1000 lifetime)\n\n" +
          "**3. Who's your target audience?** (age, location, interests)\n\n" +
          "**4. When should it run?** (start date, end date, or ongoing)\n\n" +
          "Provide all 4 answers, and I'll give you smart recommendations! 🎯",
        timestamp: new Date(),
      },
    ]);
  }
}, [open, messages.length]);
```

**Purpose:**
- Sets clear expectations about what information the AI needs
- Reduces back-and-forth by asking for all requirements upfront
- Provides examples to guide user input

---

## 4. Backend Implementation (Node.js + Express)

### 4.1 Endpoint: POST /api/advisor-chat/chat

**File**: `backend/src/routes/advisorChatRoutes.js`

This endpoint acts as the **orchestration layer** between the frontend and the external Fyp advisor service.

#### Responsibilities:
1. **Conversation Persistence** - Save messages to Supabase database
2. **Context Injection** - Fetch existing campaign data for smarter recommendations
3. **Session Management** - Maintain conversation continuity with external advisor
4. **Multi-tenancy** - Ensure workspace isolation via `workspaceId`

---

### 4.2 Code Snippet: Conversation Persistence

```javascript
router.post(
  "/chat",
  workspaceContext(), // Middleware extracts workspaceId from x-workspace-id header
  asyncHandler(async (req, res) => {
    const { message, conversationId, mode } = req.body;
    const { workspaceId } = req;

    // Step 1: Load or create conversation in database
    let conversation;
    
    if (conversationId) {
      // Resume existing conversation
      const { data, error } = await getSupabase()
        .from("advisor_conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId)  // Security: workspace isolation
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      conversation = data;
    } else {
      // Create new conversation
      const { data, error } = await getSupabase()
        .from("advisor_conversations")
        .insert({
          workspace_id: workspaceId,
          title: message.substring(0, 60),  // First message as title
          mode: mode || "general",          // "create_campaign" mode
          status: "active",
          message_count: 0,
        })
        .select()
        .single();
      
      conversation = data;
    }

    // Step 2: Save user message to database
    await getSupabase()
      .from("advisor_messages")
      .insert({
        conversation_id: conversation.id,
        role: "user",
        content: message,
      });
```

**Why persist conversations?**
- Users can resume campaign planning across sessions
- Conversation history provides audit trail
- Enables analytics on common user questions
- Supports multi-step campaign creation workflow

---

### 4.3 Code Snippet: Context Injection

The backend intelligently fetches **existing campaign data** from Meta Ads API and injects it as context for smarter recommendations:

```javascript
// Step 3: Fetch context for campaign creation mode
let contextPrompt = "";
const hasUserRequirements = message.toLowerCase().includes("goal") ||
                             message.toLowerCase().includes("budget") ||
                             /\$\d+/.test(message);

if (conversation.mode === "create_campaign" && hasUserRequirements) {
  try {
    // Fetch user's existing campaigns from Meta Ads API
    const campaignsResult = await advisorClient.listCampaigns({
      status: undefined,
      limit: 10,
    });

    const campaigns = campaignsResult.data || [];

    if (campaigns.length > 0) {
      // Calculate account-level statistics
      const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length;
      const budgets = campaigns
        .filter(c => c.daily_budget)
        .map(c => Number(c.daily_budget) / 100);
      const avgBudget = budgets.length > 0
        ? (budgets.reduce((sum, b) => sum + b, 0) / budgets.length).toFixed(2)
        : "N/A";

      // Build context prompt to append to user message
      contextPrompt = `\n\n[CONTEXT: Account has ${campaigns.length} total campaigns, ` +
                      `${activeCampaigns} active. Average daily budget: $${avgBudget}. ` +
                      `Recent campaigns: ${campaigns.slice(0, 3).map(c => 
                        `"${c.name}" (${c.objective}, $${(Number(c.daily_budget || 0) / 100).toFixed(0)}/day)`
                      ).join(", ")}]`;
    }
  } catch (contextError) {
    console.warn("[Context Fetch Warning]", contextError.message);
    // Continue without context if fetch fails
  }
}
```

**What context provides:**
- **Budget recommendations** based on user's historical spending
- **Objective suggestions** based on past campaign types
- **Naming conventions** aligned with existing campaigns
- **Performance insights** (if available, e.g., "Your awareness campaigns typically perform well")

**Example enhanced message:**
```
User: "I want to create a campaign for $100/day to get more sales"

Enhanced (sent to AI):
"I want to create a campaign for $100/day to get more sales

[CONTEXT: Account has 8 total campaigns, 3 active. Average daily budget: $65.00. 
Recent campaigns: "Summer Promo" (CONVERSIONS, $80/day), "Brand Awareness Q2" (BRAND_AWARENESS, $50/day), 
"Retargeting Test" (CONVERSIONS, $30/day)]"
```

---

### 4.4 Code Snippet: Forwarding to Fyp Advisor

```javascript
// Step 4: Forward to Fyp advisor with session continuity
const enhancedMessage = message + contextPrompt;

const response = await axios.post(
  `${FYP_ADVISOR_URL}/chat`,
  {
    message: enhancedMessage,
    clientId: FYP_CLIENT_ID,
    sessionId: conversation.external_session_id || undefined,  // Resume session
    enableWriteTools: conversation.mode === "create_campaign", // Enable campaign creation
  },
  {
    headers: { "Content-Type": "application/json" },
    timeout: 60000, // 60s timeout for LLM processing
  }
);

const advisorResponse = response.data;

// Save external session ID for future requests
if (advisorResponse.sessionId && !conversation.external_session_id) {
  await getSupabase()
    .from("advisor_conversations")
    .update({ external_session_id: advisorResponse.sessionId })
    .eq("id", conversation.id);
}

// Step 5: Save AI response to database
await getSupabase()
  .from("advisor_messages")
  .insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: advisorResponse.message,
  });

// Step 6: Return response to frontend
res.json({
  message: advisorResponse.message,
  conversationId: conversation.id,
  sessionId: advisorResponse.sessionId,
});
```

**Key features:**
- **Session continuity**: `external_session_id` links Supabase conversation ↔ Fyp session
- **Write tools enabled**: When `mode === "create_campaign"`, AI can call Meta Ads API tools
- **Response persistence**: Every AI message saved to database for audit trail

---

## 5. Campaign Creation Flow (Step-by-Step)

### Visual Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 1: User opens Advisor Chat                                         │
│ Action: Click "+ Create Campaign with AI" button                        │
│ Result: Modal opens with greeting message                                │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 2: User describes campaign requirements                            │
│ Example: "I need a campaign for $50/day to get more website traffic.    │
│           Target users 18-35 in UAE. Run for 30 days."                  │
│ Result: Message sent to backend                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 3: Backend processes request                                        │
│ Actions:                                                                  │
│   - Create conversation in database (if new)                             │
│   - Save user message                                                     │
│   - Fetch existing campaigns for context                                 │
│   - Append context to message                                             │
│ Result: Enhanced message ready for AI                                    │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 4: Fyp Advisor calls Claude API                                    │
│ Input: User message + campaign context + system prompt                   │
│ Claude processes:                                                         │
│   - Understands campaign objective (Traffic)                             │
│   - Validates budget ($50/day is reasonable)                             │
│   - Recommends targeting (Interests, behaviors)                          │
│   - Suggests ad formats (Link ads, carousel)                             │
│ Output: Structured campaign recommendations                              │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 5: AI responds with recommendations                                 │
│ Example Response:                                                         │
│ "Great! Based on your goal, here's my recommendation:                   │
│                                                                           │
│  **Campaign Name:** UAE Traffic Drive - June 2026                        │
│  **Objective:** LINK_CLICKS (optimized for website traffic)             │
│  **Budget:** $50/day ($1,500 total for 30 days)                         │
│  **Audience:**                                                            │
│    - Ages 18-35                                                           │
│    - Location: United Arab Emirates                                      │
│    - Interests: Technology, E-commerce, Travel                           │
│  **Placements:** Facebook Feed, Instagram Feed, Stories                  │
│  **Duration:** June 1 - June 30, 2026                                    │
│                                                                           │
│  This setup typically generates 2,000-3,500 clicks in MENA markets.     │
│  Ready to create? Reply 'yes' to proceed."                              │
│                                                                           │
│ Result: User reviews recommendations                                     │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 6: User confirms creation                                           │
│ User: "yes"                                                               │
│ Result: Confirmation message sent to backend                             │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 7: AI creates campaign via Meta Ads API (Future Enhancement)       │
│ Actions (when fully implemented):                                        │
│   - Claude calls Meta Graph API via tool                                 │
│   - Creates campaign with specifications                                 │
│   - Creates ad set with targeting                                        │
│   - Returns campaign ID                                                   │
│ Current: Manual confirmation step                                        │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 8: Campaign appears in UI                                           │
│ Result: User sees new campaign in campaigns list                        │
│ Status: Draft (ready for ad creative upload)                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Database Schema

### 6.1 Advisor Conversations Table

```sql
CREATE TABLE advisor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                      -- First message or custom title
  mode TEXT NOT NULL DEFAULT 'general',      -- 'general' | 'create_campaign'
  status TEXT NOT NULL DEFAULT 'active',     -- 'active' | 'archived'
  message_count INTEGER DEFAULT 0,
  external_session_id TEXT,                  -- Links to Fyp session
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Advisor Messages Table

```sql
CREATE TABLE advisor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                        -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Why separate tables?**
- **Conversations** = High-level sessions (one per campaign creation)
- **Messages** = Individual chat turns (many per conversation)
- Enables efficient querying: "Show me all conversations in last 7 days" vs "Show me all messages in this conversation"

---

## 7. Key Testing Scenarios

### 7.1 Happy Path: Successful Campaign Creation

**Test Case**: TC-CAMP-003-004-005  
**User Flow**:
1. Open Advisor Chat
2. Type: "Create campaign for $100/day, sales objective, target Lebanon, run 2 weeks"
3. AI responds with recommendations
4. User: "yes"
5. Campaign created successfully

**Expected Results**:
- ✅ All messages saved to database
- ✅ Context fetched from existing campaigns
- ✅ AI recommendations align with user requirements
- ✅ Campaign appears in campaigns list
- ✅ Campaign has correct budget, objective, dates

---

### 7.2 Error Scenario: Fyp Advisor Unreachable

**Test Case**: TC-ADVISOR-CONNECTION-FAILURE  
**Simulation**: Stop Fyp service on port 3001

**User Flow**:
1. Open Advisor Chat
2. Type any message
3. Backend tries to reach Fyp → Connection refused

**Expected Results**:
- ✅ User sees error message: "I'm having trouble connecting to my backend"
- ✅ Error message includes troubleshooting steps
- ✅ Conversation still saved to database
- ✅ No crash or white screen

**Code Handling**:
```typescript
catch (err) {
  console.error("Advisor API error:", err);
  setError(
    "Failed to connect to AI Advisor. Make sure the advisor backend is running on http://localhost:3001"
  );

  // Add error message to chat
  const errorMessage: Message = {
    role: "assistant",
    content: "❌ I'm having trouble connecting to my backend. " +
             "Please make sure the Advisor API is running...",
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, errorMessage]);
}
```

---

### 7.3 Edge Case: Context Fetch Fails

**Test Case**: TC-ADVISOR-CONTEXT-FAILURE  
**Simulation**: Meta Ads API token expired

**User Flow**:
1. User requests campaign creation
2. Backend tries to fetch existing campaigns → API error

**Expected Results**:
- ✅ AI still responds (without context)
- ✅ Warning logged to console
- ✅ Recommendations are generic but valid
- ✅ No user-facing error

**Code Handling**:
```javascript
try {
  const campaignsResult = await advisorClient.listCampaigns({...});
  contextPrompt = `[CONTEXT: ...]`;
} catch (contextError) {
  console.warn("[Context Fetch Warning]", contextError.message);
  // Continue without context - degraded but functional
}
```

---

## 8. Advantages of AI-Powered Campaign Creation

### 8.1 User Experience Benefits

| Traditional Form | AI Advisor |
|------------------|------------|
| 15+ form fields to fill | Natural language input |
| Requires Meta Ads expertise | Explains recommendations |
| No guidance on best practices | Built-in optimization tips |
| Must research targeting options | Suggests audiences based on context |
| Trial-and-error budgeting | Budget recommendations from history |

### 8.2 Technical Benefits

1. **Conversation Persistence**: Users can pause and resume campaign planning
2. **Context-Aware**: AI learns from user's past campaigns
3. **Multi-Language Support**: Works in English and Arabic
4. **Audit Trail**: All recommendations logged for compliance
5. **Scalable**: Can add more AI capabilities (A/B testing, creative suggestions) without UI changes

---

## 9. Future Enhancements

### 9.1 Direct Campaign Creation (Phase 2)

**Current State**: AI provides recommendations → User manually confirms → Manual API call  
**Future State**: AI directly creates campaign via tool use

**Implementation**:
```javascript
// In Fyp advisor service
const tools = [
  {
    name: "create_meta_campaign",
    description: "Create a Meta Ads campaign with specified parameters",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        objective: { type: "string", enum: ["CONVERSIONS", "LINK_CLICKS", ...] },
        daily_budget: { type: "number" },
        targeting: { type: "object", properties: {...} },
        // ... more fields
      },
    },
  },
];

// Claude calls tool → Fyp executes → Campaign created automatically
```

**Benefits**:
- Zero-click campaign creation
- Faster time-to-launch
- Reduced user error

---

### 9.2 A/B Testing Recommendations

**Feature**: AI suggests A/B test setups based on past performance

**Example Conversation**:
```
User: "Create a conversion campaign for $200/day"

AI: "I recommend running an A/B test for this budget:
  - Test A: Broad targeting (Ages 25-55, All interests)
  - Test B: Narrow targeting (Ages 25-35, Fitness + Health interests)
  
Split budget 50/50 and pause lower performer after 7 days. Proceed?"
```

---

### 9.3 Creative Optimization Suggestions

**Feature**: AI analyzes ad creative and suggests improvements

**Example**:
```
User uploads image → AI responds:
"Your image has good contrast but text is hard to read on mobile. 
Suggested improvements:
1. Increase font size by 20%
2. Add dark overlay behind text (40% opacity)
3. Move CTA button to bottom-center

Would you like me to generate these variations?"
```

---

## 10. Conclusion

The AI Advisor campaign creation feature demonstrates **intelligent orchestration** across three services:

1. **Frontend** - Delivers conversational UX with React state management
2. **Backend** - Orchestrates persistence, context injection, and API forwarding
3. **Fyp Advisor** - Leverages Claude AI for natural language understanding and recommendations

**Key Innovations**:
- Context injection from existing campaigns for personalized recommendations
- Conversation persistence for multi-session workflows
- Graceful degradation when external services fail
- Multi-tenant isolation for enterprise security

This architecture enables **rapid iteration** on AI capabilities without disrupting the core application, making SmartMENA Analytics a competitive MENA marketing platform.

---

**Next Steps for Testing**:
1. Implement TC-005 Playwright tests for end-to-end validation
2. Add performance benchmarks (message response time < 5s)
3. Test context injection with 100+ existing campaigns
4. Validate multi-language support (Arabic input/output)
5. Load test: 50 concurrent chat sessions

