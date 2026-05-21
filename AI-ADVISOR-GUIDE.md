# AI Campaign Advisor - Setup & Usage Guide

## Overview

The AI Campaign Advisor is an intelligent assistant that helps you create Meta Ads campaigns through a conversational interface. It asks the right questions, analyzes your account history, and provides data-driven recommendations.

---

## Architecture

```
User (Frontend) → SmartMENA Backend (Port 4000) → Fyp Backend (Port 3001) → Meta Marketing API
                                                    ↓
                                               Claude AI (Agent SDK)
```

### Components

1. **SmartMENA Frontend** (`frontend/src/components/campaigns/AdvisorChatModal.tsx`)
   - Chat UI for user interaction
   - Sends messages with `mode: "create_campaign"`

2. **SmartMENA Backend** (`backend/src/routes/advisorChatRoutes.js`)
   - Proxies requests to Fyp backend
   - Fetches campaign context (existing campaigns) for better recommendations
   - Provides campaign creation endpoint

3. **Fyp Backend** (`Fyp/claude-sdk/`)
   - Runs Claude Agent SDK consultant
   - Has MCP server access to Meta Marketing API
   - Follows workflow in `Fyp/meta-ads-chat/context/campaign-creation-workflow.md`

4. **Campaign Creation Workflow** (`Fyp/meta-ads-chat/context/campaign-creation-workflow.md`)
   - Structured 5-phase workflow
   - Collects all info first, then provides recommendations
   - Uses historical data for context-aware suggestions

---

## Prerequisites

### 1. Fyp Backend Setup

```bash
cd Fyp/claude-sdk

# Install dependencies
npm install

# Configure database (if not done)
npx prisma migrate dev
npx prisma generate

# Start the backend
npm start
# Should run on http://localhost:3001
```

### 2. Create a Client in Fyp

You need a client with valid Meta credentials:

```bash
curl -X POST http://localhost:3001/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Store",
    "metaAdAccountId": "act_YOUR_AD_ACCOUNT_ID",
    "metaAccessToken": "YOUR_META_ACCESS_TOKEN",
    "metaAppId": "YOUR_APP_ID",
    "metaAppSecret": "YOUR_APP_SECRET"
  }'
```

Copy the returned `clientId` - you'll need it for SmartMENA backend config.

### 3. SmartMENA Backend Configuration

Add to `backend/.env`:

```env
# Advisor API Configuration
ADVISOR_API_BASE_URL=http://localhost:3001
ADVISOR_CLIENT_ID=c218eadd-6861-45b3-8fc3-8af5691d080c
ADVISOR_API_ENABLED=true
```

Replace `ADVISOR_CLIENT_ID` with your Fyp client ID from step 2.

### 4. Start All Services

```bash
# Terminal 1: Fyp backend
cd Fyp/claude-sdk
npm start

# Terminal 2: SmartMENA backend
cd backend
npm run dev

# Terminal 3: SmartMENA frontend
cd frontend
npm run dev
```

---

## Usage

### Step 1: Open Campaigns Page

Navigate to: http://localhost:3000/campaigns

### Step 2: Click "Create Campaign"

Click the **"Create Campaign"** button (with Plus icon) in the top-right.

### Step 3: Provide All Information

The advisor will ask for 4 pieces of information:

1. **Main goal** (Awareness, Traffic, Engagement, Leads, Sales, App Promotion)
2. **Budget** (Daily or lifetime, amount in USD)
3. **Target audience** (Age, location, interests)
4. **Campaign duration** (Start date, end date, or ongoing)

**Example message:**

```
Goal: Sales
Budget: $50 per day
Audience: Ages 25-54 in Lebanon, UAE, and Saudi Arabia, interested in fashion and online shopping
Duration: Start immediately, run for 30 days
```

### Step 4: Review Recommendations

The advisor will:
- Fetch your existing campaigns for context
- Analyze budget patterns, objectives, and performance
- Provide specific recommendations including:
  - Campaign name suggestion
  - Objective mapping to Meta API
  - Budget recommendation with comparison to your average
  - Ad set targeting suggestions
  - Expected performance metrics
  - Timeline and review schedule

### Step 5: Confirm Creation

When you're happy with the recommendations:
- Type **"YES"**, **"Create it"**, **"Go ahead"**, or similar
- The advisor will create the campaign via the Fyp API
- Campaign will be created in **PAUSED** status (you need to add ad sets and ads first)

### Step 6: Next Steps

After creation, you'll receive:
- Campaign ID
- Confirmation of settings
- Next steps (create ad sets, create ads, activate campaign)

---

## Workflow Details

### Phase 1: Information Gathering

The advisor collects ALL 4 required pieces of information before proceeding. This ensures recommendations are comprehensive and accurate.

**Why all at once?**
- Saves time (no back-and-forth)
- Ensures recommendations consider all constraints
- Allows for optimization across objectives, budget, and audience

### Phase 2: Context Analysis

Once the advisor has your inputs, it automatically:
1. Calls `list_campaigns` MCP tool to get your existing campaigns
2. Calculates average daily budget
3. Identifies most common objectives
4. Analyzes recent campaign patterns

### Phase 3: Recommendations

Based on inputs + context, the advisor provides:
- **Smart campaign name** (based on objective + geography)
- **Objective mapping** (user-friendly → Meta API enum)
- **Budget recommendation** with context (e.g., "15% higher than your average")
- **Ad set structure** (targeting, optimization, bid strategy)
- **Expected metrics** (CPM, CTR, CPC, ROAS based on historical data)
- **Timeline** (launch, first review, scale decision, end date)

### Phase 4: Confirmation

The advisor waits for explicit user approval. It recognizes:
- Approval: "YES", "yes", "create", "go ahead", "let's do it", etc.
- Rejection: "NO", "cancel", "not yet", etc.
- Questions: Answers and iterates

### Phase 5: Creation

Upon approval:
1. Parses recommendations into API format
2. Calls POST `/api/clients/:clientId/campaigns` on Fyp backend
3. Campaign created with:
   - `status: "PAUSED"` (safe default)
   - Budget in cents (e.g., $50 = 5000)
   - Objective as Meta enum (e.g., `OUTCOME_SALES`)
   - Bid strategy: `LOWEST_COST_WITHOUT_CAP` (default)
4. Returns campaign ID and success message

---

## API Endpoints

### SmartMENA Backend

**POST `/api/advisor-chat/chat`**
- Send messages to AI advisor
- Body: `{ message: string, sessionId?: string, mode?: "create_campaign" }`
- Response: `{ sessionId: string, message: string }`

**POST `/api/advisor-chat/create-campaign`**
- Create campaign via Fyp API
- Body: `{ name, objective, daily_budget?, lifetime_budget?, status?, special_ad_categories?, bid_strategy? }`
- Response: `{ success: boolean, campaign: object }`

**GET `/api/advisor-context/context`**
- Get account context (existing campaigns, stats)
- Response: `{ context: { totalCampaigns, activeCampaigns, avgDailyBudget, ... } }`

### Fyp Backend

**POST `/chat`**
- Consultant chat endpoint (used by SmartMENA backend)
- Body: `{ message, clientId, sessionId?, enableWriteTools? }`
- Response: `{ sessionId, message }`

**POST `/api/clients/:clientId/campaigns`**
- Create Meta Ads campaign
- Body: Campaign object (see Meta Marketing API docs)
- Response: Campaign object with ID

---

## Troubleshooting

### "Advisor backend unavailable"

**Problem**: Fyp backend not running or not accessible

**Solution**:
```bash
cd Fyp/claude-sdk
npm start
# Verify: curl http://localhost:3001/health
```

### "Advisor API is not configured"

**Problem**: `ADVISOR_API_BASE_URL` or `ADVISOR_CLIENT_ID` missing in backend/.env

**Solution**:
```bash
cd backend
# Add to .env:
echo "ADVISOR_API_BASE_URL=http://localhost:3001" >> .env
echo "ADVISOR_CLIENT_ID=your-client-id-here" >> .env
```

### "Failed to fetch campaigns"

**Problem**: Invalid Fyp client ID or missing Meta credentials

**Solution**:
1. Verify client exists: `curl http://localhost:3001/clients/:clientId`
2. Check Meta access token is valid
3. Ensure ad account ID is correct (format: `act_XXXXXXXXX`)

### Campaign not created / Meta API error

**Problem**: Meta API rejected the campaign creation request

**Common causes**:
- **Invalid objective**: Must be exact enum (e.g., `OUTCOME_SALES`, not `Sales`)
- **Budget too low**: Minimum $1/day (100 cents)
- **Invalid special_ad_categories**: Should be empty array `[]` for general ecommerce
- **Expired access token**: Meta tokens expire after 60 days
- **Insufficient permissions**: Token needs `ads_management` permission

**Solution**:
1. Check Fyp backend logs for exact error message
2. Verify Meta credentials: `curl http://localhost:3001/api/clients/:clientId/campaigns`
3. Regenerate Meta access token if expired
4. Ensure token has `ads_management` and `ads_read` permissions

### Advisor gives recommendations but doesn't create campaign

**Problem**: Write tools not enabled or workflow not followed

**Solution**:
1. Ensure message sent with `mode: "create_campaign"` (frontend does this automatically)
2. Verify user said "YES" or equivalent (advisor needs explicit confirmation)
3. Check that `enableWriteTools: true` is passed to Fyp consultant
4. Review `Fyp/meta-ads-chat/context/campaign-creation-workflow.md` is present

### Advisor asks same questions repeatedly

**Problem**: Session not preserved or context lost

**Solution**:
1. Ensure `sessionId` is saved and passed in subsequent requests
2. Check Fyp session storage (sessions persisted to disk in Fyp/claude-sdk/sessions/)
3. Clear session and start fresh if corrupted

---

## Advanced Configuration

### Custom Campaign Creation Workflow

Edit `Fyp/meta-ads-chat/context/campaign-creation-workflow.md` to customize:
- Questions asked
- Recommendation format
- Budget ranges
- Expected metrics
- Confirmation phrases

### Adjust Consultant System Prompt

Edit `Fyp/claude-sdk/src/consultant.ts` system prompt append to:
- Change tone (formal vs casual)
- Add domain-specific knowledge
- Include custom thresholds
- Reference additional context files

### Add MCP Tools

To give the advisor access to more Meta API capabilities:
1. Add tool to `Fyp/meta-mcp/src/tools/`
2. Register in `Fyp/meta-mcp/src/index.ts`
3. Rebuild: `cd Fyp/meta-mcp && npm run build`
4. Restart Fyp backend

---

## Testing Checklist

- [ ] Fyp backend running on port 3001
- [ ] SmartMENA backend running on port 4000
- [ ] SmartMENA frontend running on port 3000
- [ ] Valid Fyp client with Meta credentials
- [ ] `ADVISOR_API_BASE_URL` and `ADVISOR_CLIENT_ID` configured
- [ ] Can open campaigns page at http://localhost:3000/campaigns
- [ ] "Create Campaign" button visible
- [ ] Modal opens with AI advisor greeting
- [ ] Can send messages and receive responses
- [ ] Advisor fetches campaign context (check backend logs)
- [ ] Advisor provides recommendations with specific numbers
- [ ] Can confirm with "YES" and campaign is created
- [ ] Campaign appears in Meta Ads Manager (or via list_campaigns MCP tool)

---

## Example Session

**User opens modal:**
```
AI: 👋 Hi! I'm your AI Campaign Advisor...
    Please provide:
    1. Main goal?
    2. Budget?
    3. Target audience?
    4. Campaign duration?
```

**User message:**
```
Goal: Sales
Budget: $50 per day
Audience: Ages 25-54 in Lebanon and UAE, interested in fashion
Duration: Start immediately, ongoing
```

**AI (after fetching context):**
```
📊 **Campaign Recommendations**

**Campaign Name:** MENA Sales - May 2026

**Objective:** OUTCOME_SALES
(Meta will optimize for purchases and conversions)

**Budget:** $50/day ($1,500/month)
- This is 11% higher than your current average of $45/day
- Recommended start: $50/day for testing, scale to $75+ after 7 days if ROAS > 2.0x

**Ad Set Recommendation:**
- Location: Lebanon, UAE
- Age: 25-54 (Core purchasing demographic for fashion)
- Gender: All
- Interests: Fashion, Online Shopping, Ecommerce
- Optimization: Purchase conversions
- Bid Strategy: Lowest cost (let Meta optimize)

**Expected Performance (based on your account history):**
- Estimated CPM: $8-12
- Target CTR: 2.0-3.5%
- Target CPC: $0.50-1.50
- Target ROAS: 2.0x+ (breakeven at 1.5x based on typical margins)

**⚠️ Important Notes:**
- Start with campaign PAUSED - you need to create ads and ad sets first
- Minimum 7 days before scaling (learning phase)
- Maximum 20% budget increase per adjustment
- Monitor daily for first 3 days, then weekly

---

**Ready to create this campaign?**
Type "YES" to proceed, or tell me what you'd like to adjust.
```

**User:**
```
YES
```

**AI:**
```
✅ Campaign created successfully!

Campaign ID: 120212345678901234
Name: MENA Sales - May 2026
Status: PAUSED
Budget: $50/day

**Next Steps:**
1. Create an Ad Set with your targeting
2. Create Ads with your creative
3. Set status to ACTIVE when ready to launch

Would you like help creating the ad set next?
```

---

## Future Enhancements

- [ ] Support ad set creation in the same flow
- [ ] Support ad creative upload and creation
- [ ] Multi-turn workflow for complex campaigns
- [ ] Budget optimization suggestions based on performance
- [ ] A/B test setup automation
- [ ] Audience recommendations using Meta's Targeting Search API
- [ ] Creative strategy suggestions
- [ ] Automated campaign monitoring and alerts

---

**Happy campaign creating! 🚀**
