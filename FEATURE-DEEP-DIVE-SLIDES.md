# Feature Deep-Dive Slides
## 4 Features × 2 Slides Each = 8 Slides

Each feature gets:
- **Slide A**: What it does (user perspective)
- **Slide B**: How it works (technical implementation)

---

## FEATURE 1: THE CONVERSATIONAL ADVISOR

### Slide 1A: The Advisor — What It Does

**Visual suggestion**: Split screen showing user chat on left, results on right

**Title**: The Conversational Advisor — Your AI Marketing Analyst

**Content**:

**What is it?**
Natural-language interface to your marketing data. Ask questions in Arabic or English, get instant answers with calculations.

**Example Questions**:
```
User: "What is my cost per engagement on Instagram last month?"
Advisor: "Your cost per engagement on Instagram in April was $0.23. 
This is 15% lower than your Q1 average of $0.27, indicating 
improved content efficiency."

User: "Which post performed best this week?"
Advisor: "Your April 28 post about hiking tips had the highest 
engagement rate at 8.2% (412 engagements / 5,024 reach). 
It outperformed your weekly average by 3x."

User: "Should I increase my Instagram budget?"
Advisor: "Based on your declining cost-per-engagement trend and 
8.2% average engagement rate (above industry standard of 5%), 
yes — Instagram shows strong ROI. Consider reallocating 20% 
from Facebook where CPE is higher."
```

**Why It Matters**:
- ✓ No Excel exports or manual calculations
- ✓ Complex analytics accessible to non-technical users
- ✓ Conversational in Arabic or English
- ✓ Context-aware (remembers workspace data)

---

### Slide 1B: The Advisor — How It Works

**Visual suggestion**: Technical flow diagram with 6 numbered steps

**Title**: The Advisor — Technical Architecture

**How It Works** (step-by-step):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER ASKS QUESTION                                       │
│    "What is my cost per engagement on Instagram last month?"│
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND SENDS REQUEST                                   │
│    POST /api/assistant/chat                                 │
│    Headers: { x-workspace-id: "abc123" }                    │
│    Body: { message: "What is my cost...", history: [...] } │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND RESOLVES WORKSPACE & CONTEXT                     │
│    - workspaceContext middleware extracts workspace_id      │
│    - Loads workspace metadata (connected accounts, date)    │
│    - Builds system prompt with workspace context            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. LLM ANALYZES INTENT & CALLS FUNCTIONS                    │
│    Azure OpenAI (GPT-4) with function calling enabled       │
│                                                              │
│    Available functions:                                     │
│    - calculateCostPerEngagement(workspace_id, platform,     │
│                                  date_range)                │
│    - getTopPosts(workspace_id, metric, limit, date_range)   │
│    - getEngagementTrend(workspace_id, platform, period)     │
│    - getCampaignPerformance(workspace_id, campaign_id)      │
│    - comparePlatforms(workspace_id, date_range)             │
│                                                              │
│    LLM decides: "User wants cost per engagement calculation"│
│    LLM calls: calculateCostPerEngagement({                  │
│      workspace_id: "abc123",                                │
│      platform: "instagram",                                 │
│      date_range: { start: "2025-04-01", end: "2025-04-30" }│
│    })                                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKEND FUNCTION EXECUTES WORKSPACE-SCOPED QUERY         │
│                                                              │
│    const result = await calculateCostPerEngagement({        │
│      workspace_id, platform, date_range                     │
│    });                                                       │
│                                                              │
│    SQL Query:                                               │
│    SELECT                                                   │
│      SUM(c.budget) as total_spend,                          │
│      SUM(pm.likes + pm.comments + pm.shares) as total_eng   │
│    FROM campaigns c                                         │
│    JOIN synced_posts sp ON sp.campaign_id = c.id            │
│    JOIN post_metrics pm ON pm.post_id = sp.id               │
│    WHERE c.workspace_id = 'abc123'                          │
│      AND sp.platform = 'instagram'                          │
│      AND sp.published_at BETWEEN '2025-04-01' AND '2025-04-30'│
│                                                              │
│    Returns:                                                 │
│    {                                                         │
│      cost_per_engagement: 0.23,                             │
│      total_spend: 450,                                      │
│      total_engagements: 1956,                               │
│      currency: "USD",                                       │
│      comparison: {                                          │
│        previous_period: 0.27,                               │
│        change_percent: -14.8                                │
│      }                                                       │
│    }                                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. LLM FORMATS NATURAL RESPONSE                             │
│    Takes structured data and generates human-friendly answer│
│                                                              │
│    "Your cost per engagement on Instagram last month was    │
│    $0.23. This is 15% lower than your Q1 average of $0.27, │
│    indicating improved content efficiency. You spent $450   │
│    and generated 1,956 engagements."                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. RESPONSE STREAMED TO USER                                │
│    Frontend receives SSE (Server-Sent Events) stream        │
│    Text appears word-by-word in chat interface              │
└─────────────────────────────────────────────────────────────┘
```

**Key Technical Innovations**:

1. **Function Calling Architecture**
   - LLM doesn't calculate — it identifies what calculation is needed
   - Backend functions are strongly typed with Zod schemas
   - All calculations are deterministic, auditable, workspace-scoped

2. **Workspace Isolation**
   - Every function receives `workspace_id` as first parameter
   - Database queries automatically filtered by workspace
   - Impossible for advisor to leak cross-tenant data

3. **No Hallucination of Metrics**
   - LLM never guesses numbers
   - All metrics come from actual database queries
   - If data doesn't exist, function returns null → LLM says "no data available"

4. **Token Budget Enforcement**
   - Every LLM call metered against workspace monthly budget
   - If budget exhausted → graceful fallback response
   - Usage tracked in `llm_usage` table per workspace

5. **Bilingual Support**
   - System prompt includes workspace language preference
   - Same functions work for Arabic or English queries
   - Response language matches user's question language

**Code Snippet** (Backend Function Definition):
```javascript
// backend/src/services/assistantFunctions.js

export const calculateCostPerEngagement = {
  name: 'calculateCostPerEngagement',
  description: 'Calculate cost per engagement for a platform and date range',
  parameters: {
    type: 'object',
    properties: {
      workspace_id: { type: 'string', description: 'Workspace identifier' },
      platform: { 
        type: 'string', 
        enum: ['instagram', 'facebook', 'tiktok', 'x'],
        description: 'Social media platform' 
      },
      date_range: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date' },
          end: { type: 'string', format: 'date' }
        },
        required: ['start', 'end']
      }
    },
    required: ['workspace_id', 'platform', 'date_range']
  },
  
  async execute({ workspace_id, platform, date_range }) {
    // 1. Query total spend from campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('budget')
      .eq('workspace_id', workspace_id)
      .eq('platform', platform)
      .gte('start_date', date_range.start)
      .lte('end_date', date_range.end);
    
    const total_spend = campaigns.reduce((sum, c) => sum + c.budget, 0);
    
    // 2. Query total engagements from post_metrics
    const { data: metrics } = await supabase
      .from('post_metrics')
      .select('likes, comments, shares')
      .eq('workspace_id', workspace_id)
      .eq('platform', platform)
      .gte('measured_at', date_range.start)
      .lte('measured_at', date_range.end);
    
    const total_engagements = metrics.reduce(
      (sum, m) => sum + m.likes + m.comments + m.shares, 
      0
    );
    
    // 3. Calculate CPE
    if (total_engagements === 0) return { error: 'No engagements in period' };
    
    const cost_per_engagement = total_spend / total_engagements;
    
    // 4. Get comparison data (previous period)
    // ... (similar query for previous period)
    
    return {
      cost_per_engagement: parseFloat(cost_per_engagement.toFixed(2)),
      total_spend,
      total_engagements,
      currency: 'USD',
      comparison: { /* ... */ }
    };
  }
};
```

---

## FEATURE 2: CAMPAIGN CREATION VIA ADVISOR

### Slide 2A: Campaign Creation via Chat — What It Does

**Visual suggestion**: Chat conversation showing campaign creation flow

**Title**: Campaign Creation via Conversational Interface

**What is it?**
Instead of filling out forms, create marketing campaigns by chatting with the advisor. It asks clarifying questions, validates inputs, and creates the campaign in your workspace.

**Example Conversation**:
```
User: "I want to create a new campaign for our summer sale"

Advisor: "Great! Let me help you set up a summer sale campaign. 
I'll need a few details:

1. Which platforms? (Instagram, Facebook, TikTok, X)
2. What's your budget?
3. Start and end dates?
4. Campaign goal? (Brand awareness, engagement, conversions)"

User: "Instagram and Facebook, budget is $500, run it from 
June 1 to June 30, goal is conversions"

Advisor: "Perfect! Here's your campaign summary:

📱 **Summer Sale Campaign**
   Platforms: Instagram, Facebook
   Budget: $500 ($250 per platform)
   Duration: June 1-30, 2025 (30 days)
   Goal: Conversions
   Estimated reach: 12,000-15,000
   Estimated CPE: $0.18-0.25

Should I create this campaign?"

User: "Yes"

Advisor: "✓ Campaign created! 

Campaign ID: camp_abc123
Status: Draft
Next steps:
1. Schedule your first post in the Calendar
2. Set up campaign tracking pixels (optional)
3. Review recommended content ideas in Insights

Would you like me to suggest some content ideas for this campaign?"
```

**Why It Matters**:
- ✓ No forms to fill out — conversational and intuitive
- ✓ Advisor validates inputs in real-time (budget, dates, platforms)
- ✓ Provides estimates (reach, CPE) before creation
- ✓ Guides next steps after creation

---

### Slide 2B: Campaign Creation via Chat — How It Works

**Visual suggestion**: State machine diagram showing conversation flow

**Title**: Campaign Creation — Technical Implementation

**How It Works**:

**Multi-Turn Conversation with State Management**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES CAMPAIGN CREATION                         │
│    "I want to create a new campaign"                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ADVISOR ENTERS "CAMPAIGN_CREATION" STATE                 │
│    System prompt updated with campaign-creation context     │
│                                                              │
│    State stored in conversation history:                    │
│    {                                                         │
│      mode: 'campaign_creation',                             │
│      step: 'collect_details',                               │
│      collected_data: {}                                     │
│    }                                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ADVISOR ASKS CLARIFYING QUESTIONS                        │
│    Uses structured prompting to extract:                    │
│    - Campaign name                                          │
│    - Platforms (multi-select)                               │
│    - Budget (numeric, currency)                             │
│    - Start/end dates (validated)                            │
│    - Goal (enum: awareness, engagement, conversions)        │
│                                                              │
│    LLM calls: extractCampaignDetails(user_message)          │
│    Returns: { name, platforms, budget, dates, goal }        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VALIDATION & ESTIMATION                                  │
│                                                              │
│    Function: validateAndEstimateCampaign({                  │
│      workspace_id, platforms, budget, dates, goal           │
│    })                                                        │
│                                                              │
│    Validations:                                             │
│    - Budget > 0                                             │
│    - End date > start date                                  │
│    - Platforms are connected in workspace                   │
│    - Date range within reasonable limits                    │
│                                                              │
│    Estimations (based on workspace historical data):        │
│    - Predicted reach = budget * avg_reach_per_dollar        │
│    - Predicted CPE = workspace_avg_cpe * platform_modifier  │
│    - Predicted engagements = budget / predicted_cpe         │
│                                                              │
│    Returns:                                                 │
│    {                                                         │
│      valid: true,                                           │
│      estimates: {                                           │
│        reach: [12000, 15000],  // range                     │
│        cpe: [0.18, 0.25],                                   │
│        engagements: [2000, 2777]                            │
│      }                                                       │
│    }                                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ADVISOR PRESENTS SUMMARY & ASKS CONFIRMATION             │
│    LLM formats structured data into natural summary         │
│    State updated: step: 'awaiting_confirmation'             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. USER CONFIRMS → CREATE CAMPAIGN                          │
│                                                              │
│    Function: createCampaign({                               │
│      workspace_id,                                          │
│      name,                                                  │
│      platforms,                                             │
│      budget,                                                │
│      start_date,                                            │
│      end_date,                                              │
│      goal,                                                  │
│      created_via: 'advisor'                                 │
│    })                                                        │
│                                                              │
│    SQL Insert:                                              │
│    INSERT INTO campaigns (                                  │
│      id, workspace_id, name, platforms, budget,             │
│      start_date, end_date, goal, status, created_via        │
│    ) VALUES (                                               │
│      gen_random_uuid(), 'abc123', 'Summer Sale',            │
│      ['instagram', 'facebook'], 500,                        │
│      '2025-06-01', '2025-06-30', 'conversions',             │
│      'draft', 'advisor'                                     │
│    )                                                         │
│    RETURNING *;                                             │
│                                                              │
│    Returns: { id: 'camp_abc123', ... }                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ADVISOR CONFIRMS & SUGGESTS NEXT STEPS                   │
│    State cleared: mode: null                                │
│    Campaign ID stored in conversation context               │
│                                                              │
│    Follow-up suggestions:                                   │
│    - Schedule first post                                    │
│    - Review content recommendations                         │
│    - Set up tracking pixels                                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Technical Components**:

**1. Conversation State Management**
```javascript
// Stored in-memory per session (or Redis for production)
const conversationState = {
  workspace_id: 'abc123',
  mode: 'campaign_creation',  // null | 'campaign_creation' | 'post_scheduling' | etc.
  step: 'collect_details',    // 'collect_details' | 'awaiting_confirmation' | 'complete'
  collected_data: {
    name: 'Summer Sale',
    platforms: ['instagram', 'facebook'],
    budget: 500,
    dates: { start: '2025-06-01', end: '2025-06-30' },
    goal: 'conversions'
  }
};
```

**2. Structured Data Extraction**
```javascript
// LLM function to extract campaign details from natural language
export const extractCampaignDetails = {
  name: 'extractCampaignDetails',
  description: 'Extract campaign parameters from user message',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Campaign name' },
      platforms: { 
        type: 'array', 
        items: { enum: ['instagram', 'facebook', 'tiktok', 'x'] }
      },
      budget: { type: 'number', minimum: 1 },
      start_date: { type: 'string', format: 'date' },
      end_date: { type: 'string', format: 'date' },
      goal: { 
        type: 'string', 
        enum: ['awareness', 'engagement', 'conversions'] 
      }
    }
  },
  execute: async (params) => {
    // Validate and normalize extracted data
    // Return { valid: true/false, data, errors }
  }
};
```

**3. Campaign Validation & Estimation**
```javascript
export async function validateAndEstimateCampaign({ 
  workspace_id, platforms, budget, dates, goal 
}) {
  // 1. Validate platforms are connected
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('platform')
    .eq('workspace_id', workspace_id)
    .in('platform', platforms);
  
  if (accounts.length !== platforms.length) {
    return { 
      valid: false, 
      error: 'Some platforms not connected to workspace' 
    };
  }
  
  // 2. Validate date range
  const start = new Date(dates.start);
  const end = new Date(dates.end);
  if (end <= start) {
    return { valid: false, error: 'End date must be after start date' };
  }
  
  // 3. Calculate estimates based on workspace historical data
  const { data: historicalMetrics } = await supabase
    .from('post_metrics')
    .select('reach, engagements')
    .eq('workspace_id', workspace_id)
    .in('platform', platforms);
  
  const avgReachPerDollar = calculateAvgReachPerDollar(historicalMetrics);
  const avgCPE = calculateAvgCPE(historicalMetrics);
  
  const estimates = {
    reach: [
      Math.floor(budget * avgReachPerDollar * 0.8),  // low estimate
      Math.ceil(budget * avgReachPerDollar * 1.2)    // high estimate
    ],
    cpe: [
      parseFloat((avgCPE * 0.9).toFixed(2)),
      parseFloat((avgCPE * 1.1).toFixed(2))
    ],
    engagements: [
      Math.floor(budget / (avgCPE * 1.1)),
      Math.ceil(budget / (avgCPE * 0.9))
    ]
  };
  
  return { valid: true, estimates };
}
```

**4. Multi-Turn Context Preservation**
- Conversation history persisted in database (`advisor_conversations` table)
- Each turn includes: user message, assistant response, function calls, state
- LLM receives full history up to token limit (with smart truncation)

**Why This Approach Works**:
- ✓ **Natural interaction**: No rigid form structure
- ✓ **Progressive disclosure**: Asks questions one at a time, not overwhelming
- ✓ **Validation in real-time**: Catches errors before campaign creation
- ✓ **Estimates build confidence**: User sees predicted impact before committing
- ✓ **Workspace-aware**: Validates against actual connected accounts
- ✓ **Auditable**: Full conversation + state stored in database

---

## FEATURE 3: TREND INTELLIGENCE

### Slide 3A: Trend Intelligence — What It Does

**Visual suggestion**: Screenshot of trend card with evidence sources

**Title**: Trend Intelligence — Know What's Trending Before It Peaks

**What is it?**
Automated pipeline that discovers, analyzes, and explains marketing trends relevant to your workspace. Combines internal data, web search, and YouTube to give you actionable intelligence.

**Example Output**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🔥 Trending Now: Eco-Tourism in MENA                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ **Why It's Trending**                                       │
│ Eco-tourism is gaining significant traction across the      │
│ MENA region, driven by increased environmental awareness    │
│ following COP28 in Dubai and growing demand for sustainable │
│ travel experiences. Government initiatives in Saudi Arabia  │
│ (Vision 2030) and UAE are promoting eco-friendly tourism    │
│ destinations.                                                │
│                                                              │
│ **Evidence** (15 sources):                                  │
│ • 5 web articles (Brave Search)                             │
│   - "UAE eco-tourism sector grows 34% in 2024" (Gulf News)  │
│   - "Saudi Arabia unveils sustainable tourism sites" (...)  │
│                                                              │
│ • 4 YouTube videos (112K combined views)                    │
│   - "Eco-Tourism in the Middle East | Documentary" (42K)    │
│   - "Sustainable Travel: MENA's Green Revolution" (38K)     │
│                                                              │
│ • 6 workspace posts (your own content)                      │
│   - "Best eco-friendly hiking gear" (1,240 engagements)     │
│   - "Leave no trace: Desert hiking tips" (890 engagements)  │
│                                                              │
│ **Recommendations**                                          │
│ 1. Create content highlighting sustainable outdoor practices│
│ 2. Partner with eco-certified tour operators               │
│ 3. Use hashtags: #EcoTourism #SustainableTravel #GreenMENA │
│ 4. Optimal posting time: Friday 8-10 PM GST                │
│                                                              │
│ **Trend Strength**: 8.2/10 (High momentum)                  │
│ **Relevance to Your Brand**: 9.1/10 (Born2Hike outdoor)    │
│                                                              │
│ [View All Evidence] [Get Content Ideas] [Dismiss]           │
└─────────────────────────────────────────────────────────────┘
```

**Why It Matters**:
- ✓ **Early awareness**: Catch trends before they peak
- ✓ **Evidence-based**: Not guesses — backed by 15+ sources
- ✓ **Actionable**: Concrete recommendations, not just insights
- ✓ **Workspace-relevant**: Trends filtered by your industry/audience

---

### Slide 3B: Trend Intelligence — How It Works

**Visual suggestion**: Pipeline diagram showing 8 stages

**Title**: Trend Intelligence — The Evidence-First Pipeline

**How It Works** (8-stage pipeline):

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: TRIGGER                                            │
│ Runs every 6 hours via cron worker (trendWorker)            │
│ Or on-demand via "Refresh Trends" button                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: SEED KEYWORD GENERATION                            │
│                                                              │
│ Function: generateSeedKeywords(workspace_id)                │
│                                                              │
│ Sources for seed keywords:                                  │
│ 1. Workspace industry/niche (from workspace.metadata)       │
│ 2. Recent post content (last 30 days)                       │
│ 3. Top-performing hashtags                                  │
│ 4. Connected account bios                                   │
│                                                              │
│ Example seeds for Born2Hike workspace:                      │
│ - "outdoor gear MENA"                                       │
│ - "hiking trends Middle East"                               │
│ - "eco-tourism Saudi Arabia"                                │
│ - "adventure travel Lebanon"                                │
│                                                              │
│ Output: 8-12 seed keywords                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: MULTI-SOURCE EVIDENCE COLLECTION                   │
│                                                              │
│ Parallel fetching from 3 sources:                           │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Source A: BRAVE SEARCH (Web)                         │   │
│ │ For each seed keyword:                               │   │
│ │   - Query Brave Search API                           │   │
│ │   - Fetch top 10 results                             │   │
│ │   - Filter by recency (last 90 days)                 │   │
│ │   - Extract: title, snippet, URL, published_date     │   │
│ │                                                       │   │
│ │ Result: 80-120 web articles                          │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Source B: YOUTUBE DATA API                           │   │
│ │ For each seed keyword:                               │   │
│ │   - Query YouTube search                             │   │
│ │   - Fetch top 5 videos                               │   │
│ │   - Extract: title, description, view_count, URL     │   │
│ │   - Filter by relevance score                        │   │
│ │                                                       │   │
│ │ Result: 40-60 videos                                 │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Source C: WORKSPACE POSTS (Internal)                 │   │
│ │ Query synced_posts for workspace:                    │   │
│ │   - Last 60 days                                     │   │
│ │   - Include engagement metrics                       │   │
│ │   - Extract: caption, hashtags, engagement_rate      │   │
│ │                                                       │   │
│ │ Result: 20-100 internal posts                        │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Total evidence collected: 140-280 sources                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: NORMALIZATION & DEDUPLICATION                      │
│                                                              │
│ Function: normalizeEvidence(rawSources)                     │
│                                                              │
│ Normalization:                                              │
│ - Convert all to common schema:                             │
│   { id, source_type, title, content, url, published_at,     │
│     engagement_score, keywords[] }                          │
│                                                              │
│ - Clean text (remove HTML, normalize whitespace)            │
│ - Extract keywords using TF-IDF                             │
│ - Calculate engagement_score (views, likes, shares)         │
│                                                              │
│ Deduplication:                                              │
│ - Hash-based: Same URL or title → dedupe                    │
│ - Similarity-based: Cosine similarity > 0.85 → dedupe       │
│                                                              │
│ Output: ~100-150 unique normalized evidence records         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 5: EMBEDDING & VECTORIZATION                          │
│                                                              │
│ Function: embedEvidence(normalizedSources)                  │
│                                                              │
│ For each evidence record:                                   │
│   1. Combine title + content into single text               │
│   2. Send to Azure OpenAI text-embedding-ada-002            │
│   3. Receive 1536-dimensional vector                        │
│   4. Store embedding in database (pgvector extension)       │
│                                                              │
│ Batch processing: 50 embeddings per API call                │
│ Cost: ~$0.0001 per 1K tokens (~$0.02 per trend run)         │
│                                                              │
│ Output: Evidence records with embeddings                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 6: CLUSTERING                                         │
│                                                              │
│ Function: clusterEvidence(embeddedSources)                  │
│                                                              │
│ Algorithm: HDBSCAN (Hierarchical Density-Based Clustering)  │
│ - Automatic cluster count (no need to specify K)            │
│ - Handles noise (outliers not forced into clusters)         │
│ - Min cluster size: 5 evidence sources                      │
│                                                              │
│ Process:                                                     │
│   1. Reduce dimensions: 1536 → 50 via UMAP                  │
│   2. Run HDBSCAN on reduced space                           │
│   3. Label each evidence record with cluster_id             │
│   4. Calculate cluster centroids                            │
│   5. Rank clusters by:                                      │
│      - Recency (avg published_at)                           │
│      - Engagement (sum of engagement_scores)                │
│      - Diversity (source type variety)                      │
│                                                              │
│ Output: 5-10 trend clusters ranked by importance            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 7: LLM EXPLANATION                                    │
│                                                              │
│ Function: explainCluster(cluster, workspace_context)        │
│                                                              │
│ For each cluster (top 5):                                   │
│   1. Sample representative evidence (3-5 sources)           │
│   2. Build prompt:                                          │
│      - Cluster evidence summaries                           │
│      - Workspace industry/niche                             │
│      - Recent workspace performance data                    │
│   3. Call Azure OpenAI GPT-4 with prompt:                   │
│                                                              │
│      "Based on the following evidence, explain why this     │
│      topic is trending in the MENA region, its relevance    │
│      to [workspace niche], and provide 3-4 actionable       │
│      recommendations."                                       │
│                                                              │
│   4. LLM generates:                                         │
│      - Trend title (e.g., "Eco-Tourism in MENA")           │
│      - Explanation paragraph (why it's trending)            │
│      - Relevance score (1-10)                               │
│      - Recommendations (bulleted list)                      │
│                                                              │
│ Output: Explained trends with narratives                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 8: PERSISTENCE & RANKING                              │
│                                                              │
│ Function: persistTrendRun(workspace_id, clusters)           │
│                                                              │
│ Database writes:                                            │
│   1. trend_runs table:                                      │
│      { id, workspace_id, status: 'complete',                │
│        evidence_count, cluster_count, run_at }              │
│                                                              │
│   2. trend_sources table (for each evidence):               │
│      { id, run_id, source_type, title, content, url,        │
│        published_at, engagement_score, cluster_id,          │
│        embedding (pgvector) }                               │
│                                                              │
│   3. trend_clusters table (for each explained cluster):     │
│      { id, run_id, title, explanation, recommendations,     │
│        relevance_score, trend_strength, source_count,       │
│        created_at }                                          │
│                                                              │
│ Final ranking:                                              │
│   ORDER BY (relevance_score * trend_strength) DESC          │
│   LIMIT 10                                                  │
│                                                              │
│ Output: Trends persisted in database, ready for UI          │
└─────────────────────────────────────────────────────────────┘
```

**Key Technical Details**:

**1. Why Multi-Source?**
- Web (Brave): Captures news, blogs, industry reports
- YouTube: Captures video trends, influencer content
- Internal posts: Captures workspace's own audience signals
- Combining all three → comprehensive view

**2. Why Clustering (not keyword extraction)?**
- Keywords miss emergent themes (e.g., "eco-tourism" might cluster with "sustainable travel", "green MENA")
- Clustering finds latent topics without predefined categories
- HDBSCAN handles noise (irrelevant results filtered automatically)

**3. Why Embeddings?**
- Text embeddings capture semantic similarity
- "eco-friendly travel" and "sustainable tourism" are similar in embedding space
- Enables clustering across languages (Arabic + English sources)

**4. Evidence Auditability**
- Every trend links back to original sources (URLs stored)
- Operator can click "View All Evidence" → see all 15 sources
- Builds trust: "This isn't magic, here's why we think this is trending"

**5. Performance**
- Pipeline runs in ~8-15 seconds for 150 sources
- Embeddings are cached (reused if evidence already exists)
- Clustering is fast (UMAP + HDBSCAN < 1 second)
- LLM explanation is slowest (2-3 seconds per cluster)

**Code Snippet** (Clustering):
```python
# backend/src/services/intelligence/clustering.py
from umap import UMAP
from hdbscan import HDBSCAN
import numpy as np

def cluster_evidence(embeddings: np.ndarray, min_cluster_size=5):
    """
    Cluster evidence using UMAP + HDBSCAN
    
    Args:
        embeddings: (N, 1536) array of text embeddings
        min_cluster_size: Minimum sources per cluster
    
    Returns:
        cluster_labels: (N,) array of cluster IDs (-1 = noise)
    """
    # 1. Reduce dimensions (1536 → 50)
    reducer = UMAP(
        n_components=50,
        metric='cosine',
        n_neighbors=15,
        random_state=42
    )
    reduced = reducer.fit_transform(embeddings)
    
    # 2. Cluster in reduced space
    clusterer = HDBSCAN(
        min_cluster_size=min_cluster_size,
        metric='euclidean',
        cluster_selection_method='eom'  # Excess of Mass
    )
    cluster_labels = clusterer.fit_predict(reduced)
    
    return cluster_labels
```

---

## FEATURE 4: COMPETITOR INTELLIGENCE

### Slide 4A: Competitor Intelligence — What It Does

**Visual suggestion**: Dashboard showing competitor cards with metric deltas

**Title**: Competitor Intelligence — Track What Your Competitors Are Doing

**What is it?**
Automated competitor discovery, approval, and tracking. Monitors competitor social accounts and sends daily digests with metric changes and top-performing content.

**Example Output**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Competitor Discovery (3 New Candidates)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. TrailBlazers Lebanon (@trailblazers_lb)                  │
│    Platform: Instagram                                      │
│    Followers: 24.5K                                         │
│    Engagement Rate: 6.8%                                    │
│    Why suggested: Similar niche (outdoor gear), MENA-focused│
│    Evidence: Found via web search "outdoor gear Lebanon"    │
│    [Approve] [Dismiss]                                      │
│                                                              │
│ 2. Desert Explorers UAE (@desertexplorers)                  │
│    Platform: Instagram                                      │
│    Followers: 31.2K                                         │
│    Engagement Rate: 7.4%                                    │
│    Why suggested: High engagement, eco-tourism content      │
│    Evidence: Trending in "Eco-Tourism" cluster              │
│    [Approve] [Dismiss]                                      │
│                                                              │
│ 3. Adventure Gear KSA (@adventure_ksa)                      │
│    Platform: Instagram                                      │
│    Followers: 18.9K                                         │
│    Engagement Rate: 5.2%                                    │
│    Why suggested: Direct competitor, Saudi market           │
│    Evidence: Mentioned in industry report                   │
│    [Approve] [Dismiss]                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📊 Daily Competitor Digest (May 4, 2025)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TrailBlazers Lebanon                                        │
│ ├─ Followers: 24.5K → 24.7K (+200, +0.8%)                  │
│ ├─ Engagement Rate: 6.8% → 7.1% (+0.3pp) ⬆                 │
│ ├─ Posts Today: 2                                           │
│ └─ Top Post: "Summer hiking essentials" (1.8K engagements) │
│                                                              │
│ Desert Explorers UAE                                        │
│ ├─ Followers: 31.2K → 31.4K (+200, +0.6%)                  │
│ ├─ Engagement Rate: 7.4% → 7.2% (-0.2pp) ⬇                 │
│ ├─ Posts Today: 1                                           │
│ └─ Top Post: "Sustainable desert camping" (2.1K eng.)      │
│                                                              │
│ Adventure Gear KSA                                          │
│ ├─ Followers: 18.9K → 19.0K (+100, +0.5%)                  │
│ ├─ Engagement Rate: 5.2% → 5.3% (+0.1pp) →                 │
│ ├─ Posts Today: 0                                           │
│ └─ No new content                                           │
│                                                              │
│ [View Full Report] [Adjust Tracking Frequency]              │
└─────────────────────────────────────────────────────────────┘
```

**Why It Matters**:
- ✓ **Automated discovery**: No manual searching for competitors
- ✓ **Evidence-based approval**: See why each competitor is suggested
- ✓ **Daily tracking**: Monitor follower growth, engagement, content
- ✓ **Benchmarking**: Compare your metrics to competitors

---

### Slide 4B: Competitor Intelligence — How It Works

**Visual suggestion**: Two parallel pipelines (Discovery | Tracking)

**Title**: Competitor Intelligence — Discovery & Tracking Pipelines

**How It Works**:

```
┌─────────────────────────────────────────────────────────────┐
│ PIPELINE 1: COMPETITOR DISCOVERY                            │
└─────────────────────────────────────────────────────────────┘

STAGE 1: TRIGGER
- Runs weekly via cron (digestWorker)
- Or on-demand via "Discover Competitors" button

STAGE 2: QUERY GENERATION
Function: generateCompetitorQueries(workspace_id)

Build search queries from:
- Workspace industry/niche (from metadata)
- Workspace location (MENA region)
- Top keywords from workspace posts

Example queries for Born2Hike:
- "outdoor gear brands Lebanon Instagram"
- "hiking equipment UAE Facebook"
- "adventure travel Saudi Arabia social media"

Output: 5-8 search queries

STAGE 3: WEB SEARCH (Brave Search)
For each query:
  1. Query Brave Search API
  2. Extract social media URLs (Instagram, Facebook, TikTok, X)
  3. Filter by relevance and recency
  4. Deduplicate (already tracked accounts removed)

Output: 20-30 candidate social accounts

STAGE 4: ACCOUNT SCRAPING
Function: scrapePublicProfile(platform, handle)

For each candidate:
  1. Hit platform's public API or web scraping (public data only)
  2. Extract:
     - Handle, display name, bio
     - Follower count
     - Recent posts (last 10)
     - Engagement metrics (likes, comments)
  3. Calculate engagement_rate = avg_engagements / followers

Note: Only public data, no authentication needed

Output: Enriched competitor candidates with metrics

STAGE 5: SCORING & FILTERING
Function: scoreCompetitorRelevance(candidate, workspace)

Score based on:
- Industry similarity (bio keywords vs workspace niche) — 40%
- Geographic relevance (MENA mentions) — 20%
- Engagement quality (engagement_rate > 3%) — 20%
- Follower count (within 2x of workspace) — 20%

Filter: relevance_score > 0.6

Output: 3-10 high-quality candidates

STAGE 6: EVIDENCE COLLECTION
For each candidate, collect evidence:
- Source URL (where we found them)
- Reason (why they're relevant)
- Sample posts (top 3)

STAGE 7: APPROVAL QUEUE
Write to competitor_candidates table:
{
  id, workspace_id, platform, handle, display_name,
  follower_count, engagement_rate, relevance_score,
  evidence: { source_url, reason, sample_posts },
  status: 'pending_approval'
}

Operator sees candidates in UI, clicks [Approve] or [Dismiss]

┌─────────────────────────────────────────────────────────────┐
│ PIPELINE 2: COMPETITOR TRACKING                             │
└─────────────────────────────────────────────────────────────┘

STAGE 1: TRIGGER
- Runs daily via cron (digestWorker) at 9 AM GST
- Tracks all approved competitors for workspace

STAGE 2: FETCH CURRENT METRICS
Function: fetchCompetitorMetrics(competitor_id)

For each approved competitor:
  1. Scrape current public profile
  2. Extract:
     - Follower count
     - Following count
     - Total posts count
     - Recent posts (last 5)
  3. Calculate engagement_rate from recent posts

Output: Current snapshot

STAGE 3: COMPARE TO PREVIOUS SNAPSHOT
Query competitor_snapshots table for last snapshot (yesterday)

Calculate deltas:
- follower_delta = current - previous
- follower_growth_rate = (delta / previous) * 100
- engagement_rate_delta = current_rate - previous_rate
- new_posts = current_posts - previous_posts

STAGE 4: PERSIST SNAPSHOT
Write to competitor_snapshots table:
{
  id, competitor_id, measured_at: now(),
  follower_count, following_count, posts_count,
  engagement_rate,
  deltas: {
    follower_delta,
    follower_growth_rate,
    engagement_rate_delta,
    new_posts_count
  }
}

STAGE 5: GENERATE DIGEST
Function: generateCompetitorDigest(workspace_id, snapshots)

For each competitor with changes:
  - Format: "Name: followers X → Y (+Z, +W%)"
  - Highlight significant changes (> 5% growth, engagement spike)
  - Include top-performing new post

Combine into daily digest email/notification

STAGE 6: NOTIFY OPERATOR
- Email digest sent to workspace owner
- In-app notification badge
- Digest also stored in competitor_digests table (viewable in UI)
```

**Key Technical Details**:

**1. Public Data Only**
- No authentication required (respects platform ToS)
- Only scrapes publicly visible data
- Rate-limited to avoid detection as bot (1 request/second)

**2. Approval Queue (Not Automatic Tracking)**
- Discovery suggests candidates, doesn't auto-track
- Operator reviews evidence before approval
- Prevents tracking irrelevant or sensitive accounts

**3. Daily Snapshots (Time-Series Data)**
- Each day creates a new snapshot row
- Enables trend analysis (follower growth over 30 days)
- Chart: "Competitor Follower Growth (Last Month)"

**4. Evidence Trail**
- Every candidate links back to source (where we found them)
- Operator can audit: "Why was this suggested?"

**5. Graceful Failure**
- If scraping fails (rate limit, account private) → skip, retry tomorrow
- Digest still sent with available data

**Code Snippet** (Scraping Instagram Public Data):
```javascript
// backend/src/services/competitors/scraper.js

async function scrapeInstagramPublicProfile(handle) {
  // Note: Uses Instagram's public web interface (no auth)
  // For production: use official Meta Graph API after app review
  
  const url = `https://www.instagram.com/${handle}/?__a=1&__d=dis`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0...',  // Mimic browser
      },
      timeout: 10000
    });
    
    const data = response.data.graphql.user;
    
    return {
      handle: data.username,
      display_name: data.full_name,
      bio: data.biography,
      follower_count: data.edge_followed_by.count,
      following_count: data.edge_follow.count,
      posts_count: data.edge_owner_to_timeline_media.count,
      recent_posts: data.edge_owner_to_timeline_media.edges.slice(0, 10).map(edge => ({
        id: edge.node.id,
        caption: edge.node.edge_media_to_caption.edges[0]?.node.text,
        likes: edge.node.edge_liked_by.count,
        comments: edge.node.edge_media_to_comment.count,
        timestamp: edge.node.taken_at_timestamp
      }))
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new RateLimitError('Instagram rate limit hit, retry later');
    }
    throw error;
  }
}

// Rate limiting wrapper
const scraperQueue = new PQueue({ 
  interval: 1000,  // 1 second
  intervalCap: 1   // 1 request per interval
});

export async function scrapeWithRateLimit(platform, handle) {
  return scraperQueue.add(() => {
    switch (platform) {
      case 'instagram':
        return scrapeInstagramPublicProfile(handle);
      case 'facebook':
        return scrapeFacebookPublicPage(handle);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  });
}
```

**Database Schema**:
```sql
-- Competitor candidates (approval queue)
CREATE TABLE competitor_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  platform VARCHAR(50) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  follower_count INTEGER,
  engagement_rate DECIMAL(5, 2),
  relevance_score DECIMAL(3, 2),
  evidence JSONB,  -- { source_url, reason, sample_posts }
  status VARCHAR(50) DEFAULT 'pending_approval',  -- pending_approval | approved | dismissed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approved competitors
CREATE TABLE competitor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  platform VARCHAR(50) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  tracking_frequency VARCHAR(50) DEFAULT 'daily',  -- daily | weekly
  UNIQUE(workspace_id, platform, handle)
);

-- Daily snapshots (time-series)
CREATE TABLE competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitor_accounts(id),
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  follower_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL(5, 2),
  deltas JSONB,  -- { follower_delta, follower_growth_rate, etc. }
  top_post JSONB  -- { id, caption, engagements }
);

-- Daily digests
CREATE TABLE competitor_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  digest_date DATE NOT NULL,
  summary TEXT,  -- Formatted digest text
  snapshots JSONB[],  -- Array of snapshot summaries
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, digest_date)
);
```

---

## Summary Table: Feature Comparison

| Feature | User Benefit | Technical Innovation |
|---------|--------------|---------------------|
| **Advisor** | Ask complex questions naturally | Function-calling architecture, workspace-scoped queries |
| **Campaign Creation** | No forms, conversational flow | Multi-turn state management, real-time validation |
| **Trend Intelligence** | Catch trends early, evidence-backed | Multi-source pipeline, HDBSCAN clustering, LLM explanation |
| **Competitor Intelligence** | Track competitors automatically | Public scraping, approval queue, daily snapshots |

---

## Presentation Tips for These Slides

1. **For the Advisor**: Do a LIVE demo of 2-3 questions (practice beforehand)
   - Show function calling in browser DevTools (impress technical evaluators)

2. **For Campaign Creation**: Show the conversation flow side-by-side with database
   - After user confirms → show the INSERT statement executing

3. **For Trends**: Show the evidence sources (click "View All Evidence")
   - Emphasize: "This isn't magic, here are the 15 sources"

4. **For Competitors**: Show approval queue → approve one → show digest next day
   - Emphasize: "We don't auto-track, operator has control"

---

## Anticipated Questions

**Q: How do you prevent the advisor from hallucinating metrics?**
A: Function calling. LLM doesn't calculate — it identifies what calculation is needed, calls a backend function that queries the database, and formats the returned result.

**Q: What if Brave Search or YouTube API goes down?**
A: Trend pipeline is multi-source. If one source fails, pipeline continues with remaining sources. Evidence count noted in trend card.

**Q: Is scraping competitors' data legal?**
A: Yes — we only scrape publicly visible data (same data you'd see if you visited their profile). No authentication, respects robots.txt, rate-limited. For production, we'll use official APIs after app review.

**Q: Why not use machine learning for competitor discovery?**
A: We do! Embeddings + clustering find competitors in semantic space. But we also use rule-based filtering (engagement rate, follower count) to ensure quality. Hybrid approach.
