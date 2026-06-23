# Test Cases Specification - SmartMENA Analytics

## Overview
This document lists all proposed test cases for approval. Review each section and approve/reject.

---

## 🔴 PRIORITY 1: Critical Security & Core Functionality

### Backend: Security-Critical Tests (MUST HAVE)

#### 1. Token Encryption (`backend/src/services/oauth/tokenCrypto.test.js`)
- [ ] **TC-SEC-001**: Encrypt and decrypt token roundtrip with AES-256-GCM
- [ ] **TC-SEC-002**: Handle hex string input format
- [ ] **TC-SEC-003**: Handle Buffer input format
- [ ] **TC-SEC-004**: Handle PostgreSQL bytea format
- [ ] **TC-SEC-005**: Reject tampered ciphertext (auth tag validation)
- [ ] **TC-SEC-006**: Handle missing encryption key (throw error)
- [ ] **TC-SEC-007**: Verify version byte in encrypted output

#### 2. Workspace Context Middleware (`backend/src/middleware/workspaceContext.test.js`)
- [ ] **TC-SEC-101**: Extract workspace ID from `x-workspace-id` header
- [ ] **TC-SEC-102**: Extract workspace ID from request body fallback
- [ ] **TC-SEC-103**: Reject request with missing workspace ID (400 error)
- [ ] **TC-SEC-104**: Verify workspace exists in database
- [ ] **TC-SEC-105**: Bypass workspace check for public routes
- [ ] **TC-SEC-106**: Set `req.workspaceId` for downstream handlers
- [ ] **TC-SEC-107**: Block cross-workspace access attempts

#### 3. Auth Service (`backend/src/services/authService.test.js`)
- [ ] **TC-AUTH-001**: Register user with valid credentials
- [ ] **TC-AUTH-002**: Create default workspace on registration
- [ ] **TC-AUTH-003**: Hash password before storage
- [ ] **TC-AUTH-004**: Login with valid email/password
- [ ] **TC-AUTH-005**: Reject invalid credentials (wrong password)
- [ ] **TC-AUTH-006**: Reject non-existent user email
- [ ] **TC-AUTH-007**: Return session token on successful login
- [ ] **TC-AUTH-008**: Bootstrap demo user (Born2Hike) with test data

---

## 🟠 PRIORITY 2: Business Logic & Data Integrity

### Backend: Validators (Zod Schemas)

#### 4. Auth Validator (`backend/src/validators/authValidator.test.js`)
- [ ] **TC-VAL-001**: Accept valid login credentials (email + password)
- [ ] **TC-VAL-002**: Reject invalid email format
- [ ] **TC-VAL-003**: Reject short password (<8 characters)
- [ ] **TC-VAL-004**: Accept valid registration data (name, email, password, workspace)
- [ ] **TC-VAL-005**: Validate optional fields (region, locale, industry)

#### 5. Scheduled Post Validator (`backend/src/validators/scheduledPostValidator.test.js`)
- [ ] **TC-VAL-101**: Accept valid post creation (platform, caption, scheduled_at)
- [ ] **TC-VAL-102**: Reject missing required fields
- [ ] **TC-VAL-103**: Validate platform enum (instagram, facebook, tiktok, twitter)
- [ ] **TC-VAL-104**: Normalize hashtags (trim whitespace, deduplicate)
- [ ] **TC-VAL-105**: Limit hashtags to 30 max
- [ ] **TC-VAL-106**: Validate scheduled_at is future date
- [ ] **TC-VAL-107**: Accept optional media_urls array
- [ ] **TC-VAL-108**: Validate caption max length (2200 chars)

#### 6. Campaign Validator (`backend/src/validators/campaignValidator.test.js`)
- [ ] **TC-VAL-201**: Accept valid campaign creation
- [ ] **TC-VAL-202**: Validate budget is positive number
- [ ] **TC-VAL-203**: Validate platform enum
- [ ] **TC-VAL-204**: Validate date ranges (start_date < end_date)
- [ ] **TC-VAL-205**: Accept optional targeting fields

#### 7. ROI Validator (`backend/src/validators/roiValidator.test.js`)
- [ ] **TC-VAL-301**: Accept all required ROI prediction fields
- [ ] **TC-VAL-302**: Validate budget > 0
- [ ] **TC-VAL-303**: Validate audienceSize > 0
- [ ] **TC-VAL-304**: Validate postingHour (0-23)
- [ ] **TC-VAL-305**: Validate sentimentScore (-1 to 1)
- [ ] **TC-VAL-306**: Validate holidayFlag (0 or 1)
- [ ] **TC-VAL-307**: Validate platform enum
- [ ] **TC-VAL-308**: Validate contentType enum
- [ ] **TC-VAL-309**: Validate region enum (Lebanon, UAE, Saudi Arabia, Egypt, Jordan)

### Backend: Core Services

#### 8. Scheduled Post Service (`backend/src/services/scheduledPostService.test.js`)
- [ ] **TC-SRV-001**: Create scheduled post with valid data
- [ ] **TC-SRV-002**: Update post status (draft → scheduled)
- [ ] **TC-SRV-003**: Cancel scheduled post
- [ ] **TC-SRV-004**: Claim due posts atomically (race condition test)
- [ ] **TC-SRV-005**: Publish claimed posts
- [ ] **TC-SRV-006**: Mark post as published with external_post_id
- [ ] **TC-SRV-007**: Mark post as failed with error message
- [ ] **TC-SRV-008**: Prevent duplicate publishing (idempotency)
- [ ] **TC-SRV-009**: Handle concurrent worker instances (no duplicate claims)

#### 9. OAuth Service (`backend/src/services/oauth/metaOAuthService.test.js`)
- [ ] **TC-OAUTH-001**: Generate OAuth authorization URL
- [ ] **TC-OAUTH-002**: Store oauth_state in database
- [ ] **TC-OAUTH-003**: Exchange authorization code for access token (mocked Meta API)
- [ ] **TC-OAUTH-004**: Encrypt and store access token
- [ ] **TC-OAUTH-005**: Sync Pages and Instagram accounts
- [ ] **TC-OAUTH-006**: Handle OAuth callback with valid state
- [ ] **TC-OAUTH-007**: Reject callback with invalid state (CSRF protection)
- [ ] **TC-OAUTH-008**: Handle Meta API errors (expired code, invalid app credentials)

#### 10. ML Client (`backend/src/services/mlClient.test.js`)
- [ ] **TC-ML-001**: Call sentiment prediction endpoint (mocked)
- [ ] **TC-ML-002**: Call ROI prediction endpoint (mocked)
- [ ] **TC-ML-003**: Handle ML service timeout (60s) → 504 error
- [ ] **TC-ML-004**: Handle ML service unreachable → 503 error
- [ ] **TC-ML-005**: Handle ML service 4xx errors → 400 error
- [ ] **TC-ML-006**: Handle ML service 5xx errors → 502 error
- [ ] **TC-ML-007**: Transform camelCase to snake_case for ML API
- [ ] **TC-ML-008**: Validate ML response shape

#### 11. Social Account Sync (`backend/src/services/syncService.test.js`)
- [ ] **TC-SYNC-001**: Sync posts from social account
- [ ] **TC-SYNC-002**: Upsert posts (deduplicate by external_post_id)
- [ ] **TC-SYNC-003**: Create metrics snapshots
- [ ] **TC-SYNC-004**: Update last_synced_at timestamp
- [ ] **TC-SYNC-005**: Handle API rate limits
- [ ] **TC-SYNC-006**: Handle deleted posts on platform

---

## 🟡 PRIORITY 3: API Integration Tests

### Backend: Critical Endpoints

#### 12. Auth API (`backend/tests/integration/auth.integration.test.js`)
- [ ] **TC-API-001**: POST /api/auth/register → 201 + workspace created
- [ ] **TC-API-002**: POST /api/auth/login → 200 + token
- [ ] **TC-API-003**: GET /api/auth/me → 200 + user data (authenticated)
- [ ] **TC-API-004**: GET /api/auth/me → 401 (no token)
- [ ] **TC-API-005**: POST /api/auth/login → 401 (invalid credentials)

#### 13. OAuth API (`backend/tests/integration/oauth.integration.test.js`)
- [ ] **TC-API-101**: GET /api/oauth/meta/init → redirect URL
- [ ] **TC-API-102**: GET /api/oauth/meta/callback → token exchange (mocked)
- [ ] **TC-API-103**: POST /api/oauth/meta/sync → accounts synced
- [ ] **TC-API-104**: DELETE /api/oauth/meta/connection/:id → revoked
- [ ] **TC-API-105**: GET /api/oauth/meta/status → connection status

#### 14. Scheduled Posts API (`backend/tests/integration/scheduledPosts.integration.test.js`)
- [ ] **TC-API-201**: POST /api/scheduled-posts → 201 + created post
- [ ] **TC-API-202**: GET /api/scheduled-posts → list with workspace filter
- [ ] **TC-API-203**: PATCH /api/scheduled-posts/:id → update post
- [ ] **TC-API-204**: POST /api/scheduled-posts/:id/cancel → cancel post
- [ ] **TC-API-205**: DELETE /api/scheduled-posts/:id → delete post
- [ ] **TC-API-206**: POST /api/scheduled-posts/publish-now → trigger publish worker
- [ ] **TC-API-207**: Verify workspace isolation (can't access other workspace posts)

#### 15. Analytics API (`backend/tests/integration/analytics.integration.test.js`)
- [ ] **TC-API-301**: GET /api/analytics/overview → KPI summary
- [ ] **TC-API-302**: GET /api/analytics/timeseries → grouped by day/week
- [ ] **TC-API-303**: GET /api/analytics/platform-breakdown → per-platform stats
- [ ] **TC-API-304**: GET /api/analytics/sentiment-breakdown → sentiment distribution
- [ ] **TC-API-305**: GET /api/analytics/top-posts → sorted by engagement

#### 16. Campaigns API (`backend/tests/integration/campaigns.integration.test.js`)
- [ ] **TC-API-401**: POST /api/campaigns → create campaign
- [ ] **TC-API-402**: GET /api/campaigns → list campaigns (workspace filtered)
- [ ] **TC-API-403**: GET /api/campaigns/:id → get single campaign
- [ ] **TC-API-404**: PATCH /api/campaigns/:id → update campaign
- [ ] **TC-API-405**: DELETE /api/campaigns/:id → delete campaign
- [ ] **TC-API-406**: Verify workspace isolation

---

## 🔵 PRIORITY 4: Frontend Unit Tests

### Frontend: API Layer

#### 17. Auth API (`frontend/src/lib/api/auth.test.ts`)
- [ ] **TC-FE-001**: authApi.login() calls POST /api/auth/login
- [ ] **TC-FE-002**: authApi.register() calls POST /api/auth/register
- [ ] **TC-FE-003**: authApi.me() calls GET /api/auth/me
- [ ] **TC-FE-004**: authApi.logout() clears local storage
- [ ] **TC-FE-005**: Handle 401 error → redirect to login
- [ ] **TC-FE-006**: Store auth token in localStorage

#### 18. Workspaces API (`frontend/src/lib/api/workspaces.test.ts`)
- [ ] **TC-FE-101**: workspacesApi.current() calls GET /api/workspaces/current
- [ ] **TC-FE-102**: workspacesApi.list() calls GET /api/workspaces
- [ ] **TC-FE-103**: workspacesApi.create() calls POST /api/workspaces
- [ ] **TC-FE-104**: workspacesApi.updateBusinessProfile() calls PATCH /api/workspaces/:id/business-profile
- [ ] **TC-FE-105**: Inject x-workspace-id header

#### 19. Campaigns API (`frontend/src/lib/api/campaigns.test.ts`)
- [ ] **TC-FE-201**: campaignsApi.list() calls GET /api/campaigns
- [ ] **TC-FE-202**: campaignsApi.create() calls POST /api/campaigns
- [ ] **TC-FE-203**: campaignsApi.getSingle() calls GET /api/campaigns/:id
- [ ] **TC-FE-204**: campaignsApi.update() calls PATCH /api/campaigns/:id
- [ ] **TC-FE-205**: campaignsApi.delete() calls DELETE /api/campaigns/:id

### Frontend: Utilities & Hooks

#### 20. Utility Functions (`frontend/src/lib/utils.test.ts`)
- [x] **TC-FE-301**: cn() merges multiple class names ✅ DONE
- [x] **TC-FE-302**: cn() handles conditional classes ✅ DONE
- [x] **TC-FE-303**: cn() ignores falsy values ✅ DONE
- [ ] **TC-FE-304**: formatNumber() formats with K/M suffix
- [ ] **TC-FE-305**: formatPercent() formats with % sign
- [ ] **TC-FE-306**: formatDate() formats ISO dates
- [ ] **TC-FE-307**: relativeDate() returns "2 days ago" format

#### 21. Hashtag Utilities (`frontend/src/lib/hashtags.test.ts`)
- [ ] **TC-FE-401**: extractHashtags() finds #hashtag in text
- [ ] **TC-FE-402**: extractHashtags() handles Arabic hashtags
- [ ] **TC-FE-403**: extractHashtags() deduplicates
- [ ] **TC-FE-404**: matchesSearch() filters by keyword

#### 22. Auth Hook (`frontend/src/hooks/useAuth.test.ts`)
- [ ] **TC-FE-501**: useAuth() returns user from AuthContext
- [ ] **TC-FE-502**: useAuth() provides signIn function
- [ ] **TC-FE-503**: useAuth() provides signOut function
- [ ] **TC-FE-504**: useAuth() provides workspace switching
- [ ] **TC-FE-505**: signOut() clears localStorage

#### 23. i18n Hook (`frontend/src/hooks/useI18n.test.ts`)
- [ ] **TC-FE-601**: useI18n() returns current locale
- [ ] **TC-FE-602**: useI18n() provides translation function t()
- [ ] **TC-FE-603**: setLocale('ar') switches to Arabic
- [ ] **TC-FE-604**: setLocale('ar') sets dir="rtl"
- [ ] **TC-FE-605**: Locale persists to localStorage
- [ ] **TC-FE-606**: t() returns fallback for missing translation

---

## 🟢 PRIORITY 5: Frontend Component Tests

### Frontend: Critical Pages

#### 24. Login Page (`frontend/src/app/login/page.test.tsx`)
- [ ] **TC-CMP-001**: Render login form with email/password fields
- [ ] **TC-CMP-002**: Submit form calls authApi.login()
- [ ] **TC-CMP-003**: Display error message on invalid credentials
- [ ] **TC-CMP-004**: Redirect to dashboard on successful login
- [ ] **TC-CMP-005**: Demo account button pre-fills credentials
- [ ] **TC-CMP-006**: Link to registration page

#### 25. Register Page (`frontend/src/app/register/page.test.tsx`)
- [ ] **TC-CMP-101**: Render registration form
- [ ] **TC-CMP-102**: Validate all required fields (Zod)
- [ ] **TC-CMP-103**: Submit form calls authApi.register()
- [ ] **TC-CMP-104**: Redirect to onboarding on success
- [ ] **TC-CMP-105**: Display error on duplicate email

#### 26. Onboarding Page (`frontend/src/app/onboarding/page.test.tsx`)
- [ ] **TC-CMP-201**: Render step 1 (Business info)
- [ ] **TC-CMP-202**: Navigate to step 2 on Continue
- [ ] **TC-CMP-203**: Navigate back to step 1 on Back button
- [ ] **TC-CMP-204**: Display validation errors on empty fields
- [ ] **TC-CMP-205**: Tag editor adds/removes items
- [ ] **TC-CMP-206**: Submit final step calls updateBusinessProfile()
- [ ] **TC-CMP-207**: Redirect to dashboard on completion
- [ ] **TC-CMP-208**: Progress bar shows current step

#### 27. Connections Page (`frontend/src/app/connections/page.test.tsx`)
- [ ] **TC-CMP-301**: Display connected accounts list
- [ ] **TC-CMP-302**: Connect button triggers OAuth flow
- [ ] **TC-CMP-303**: Sync button calls socialAccountsApi.sync()
- [ ] **TC-CMP-304**: Disconnect button shows confirmation modal
- [ ] **TC-CMP-305**: Display empty state when no accounts
- [ ] **TC-CMP-306**: Handle OAuth callback with success status

#### 28. Dashboard Page (`frontend/src/app/page.test.tsx`)
- [ ] **TC-CMP-401**: Display loading state while fetching data
- [ ] **TC-CMP-402**: Render KPI cards with metrics
- [ ] **TC-CMP-403**: Render engagement chart
- [ ] **TC-CMP-404**: Apply platform filter
- [ ] **TC-CMP-405**: Apply date range filter
- [ ] **TC-CMP-406**: Clear filters button resets to all data
- [ ] **TC-CMP-407**: Display empty state when no data

#### 29. Content/Posts Page (`frontend/src/app/content/page.test.tsx`)
- [ ] **TC-CMP-501**: Switch between grid/list/calendar views
- [ ] **TC-CMP-502**: View preference persists to URL params
- [ ] **TC-CMP-503**: Create post button opens drawer
- [ ] **TC-CMP-504**: Submit post form calls scheduledPostsApi.create()
- [ ] **TC-CMP-505**: Display posts in calendar view
- [ ] **TC-CMP-506**: Filter posts by platform

---

## 🟣 PRIORITY 6: End-to-End Tests (Playwright)

### E2E: Authentication Flows

#### 30. Auth E2E (`frontend/tests/e2e/auth.spec.ts`)
- [ ] **TC-E2E-001**: Complete registration → login → dashboard flow
- [ ] **TC-E2E-002**: Login with invalid credentials shows error
- [ ] **TC-E2E-003**: Session persists across page reload
- [ ] **TC-E2E-004**: Logout clears session and redirects to login
- [ ] **TC-E2E-005**: Unauthorized access redirects to login

### E2E: Onboarding Flow

#### 31. Onboarding E2E (`frontend/tests/e2e/onboarding.spec.ts`)
- [ ] **TC-E2E-101**: Complete all 5 onboarding steps
- [ ] **TC-E2E-102**: Validation prevents advancing with empty fields
- [ ] **TC-E2E-103**: Back button preserves previously entered data
- [ ] **TC-E2E-104**: Clicking step indicator jumps to step
- [ ] **TC-E2E-105**: Final submit redirects to dashboard

### E2E: Social Connections

#### 32. Connections E2E (`frontend/tests/e2e/connections.spec.ts`)
- [ ] **TC-E2E-201**: Mock OAuth flow for Meta Instagram
- [ ] **TC-E2E-202**: OAuth callback updates connections list
- [ ] **TC-E2E-203**: Sync account fetches posts
- [ ] **TC-E2E-204**: Remove account with confirmation
- [ ] **TC-E2E-205**: OAuth error shows error message

### E2E: Post Scheduling

#### 33. Post Scheduling E2E (`frontend/tests/e2e/postScheduling.spec.ts`)
- [ ] **TC-E2E-301**: Create scheduled post via calendar
- [ ] **TC-E2E-302**: Post appears in calendar view
- [ ] **TC-E2E-303**: Edit scheduled post
- [ ] **TC-E2E-304**: Delete post with confirmation
- [ ] **TC-E2E-305**: Draft autosave functionality

### E2E: Campaign Management

#### 34. Campaigns E2E (`frontend/tests/e2e/campaigns.spec.ts`)
- [ ] **TC-E2E-401**: Create campaign via advisor chat
- [ ] **TC-E2E-402**: View campaign details
- [ ] **TC-E2E-403**: Filter campaigns by status
- [ ] **TC-E2E-404**: Campaign list shows correct data

### E2E: Report Sharing

#### 35. Reports E2E (`frontend/tests/e2e/reports.spec.ts`)
- [ ] **TC-E2E-501**: Generate growth report
- [ ] **TC-E2E-502**: Share report creates public link
- [ ] **TC-E2E-503**: Public link works without authentication
- [ ] **TC-E2E-504**: Revoke share disables link

### E2E: Internationalization

#### 36. i18n E2E (`frontend/tests/e2e/i18n.spec.ts`)
- [ ] **TC-E2E-601**: Switch to Arabic → layout becomes RTL
- [ ] **TC-E2E-602**: Arabic numbers format correctly
- [ ] **TC-E2E-603**: Hijri calendar displays correctly
- [ ] **TC-E2E-604**: Locale persists across page navigation
- [ ] **TC-E2E-605**: All UI text translates to Arabic

### E2E: Critical User Journey

#### 37. Complete Flow E2E (`frontend/tests/e2e/critical-path.spec.ts`)
- [ ] **TC-E2E-701**: Register → Onboard → Connect Account → Schedule Post → Create Campaign → View Report
- [ ] **TC-E2E-702**: All steps complete without errors
- [ ] **TC-E2E-703**: Data persists across all steps

---

## Test Count Summary

| Priority | Category | Test Cases | Status |
|----------|----------|------------|--------|
| P1 | Security & Auth | 22 tests | ⏳ Pending Approval |
| P2 | Validators & Services | 49 tests | ⏳ Pending Approval |
| P3 | API Integration | 25 tests | ⏳ Pending Approval |
| P4 | Frontend Unit | 37 tests | ⏳ Pending Approval (3 done) |
| P5 | Frontend Components | 34 tests | ⏳ Pending Approval |
| P6 | E2E Tests | 27 tests | ⏳ Pending Approval |
| **TOTAL** | **All Categories** | **194 tests** | **⏳ Awaiting Review** |

---

## Recommended Approach

### Option A: Full Coverage (All 194 tests)
- **Effort**: 8-10 weeks
- **Coverage**: 60-70%
- **Best for**: Production-ready quality

### Option B: Core Coverage (P1 + P2 + P3 = 96 tests)
- **Effort**: 4-5 weeks
- **Coverage**: 45-50%
- **Best for**: MVP with solid foundation

### Option C: Minimal Critical (P1 only = 22 tests)
- **Effort**: 1-2 weeks
- **Coverage**: 20-25%
- **Best for**: Security baseline only

---

## Your Approval Needed

Please review and let me know:
1. **Which priorities** to include (P1-P6)?
2. **Any specific test cases** to add/remove?
3. **Which approach** (A/B/C or custom)?

Once approved, I'll start implementing the tests!
