# TC-005: Campaign Creation Flow

## Overview
This module tests the complete campaign creation workflow, from navigating to the campaigns page through database persistence validation.

**Module**: Campaign Management  
**Feature**: Create New Campaign  
**Risk Level**: HIGH - Core business functionality  
**Total Test Cases**: 6

---

## Test Cases

| Test Case ID | Title | Steps | Risk Level | Expected Result | Status | Reporter |
|-------------|-------|-------|------------|-----------------|--------|----------|
| TC-CAMP-001 | Navigate to Campaign Page | 1. Login as authenticated user<br>2. Click "Campaigns" in sidebar<br>3. Verify page loads | **MEDIUM** | Campaign page loads successfully<br>URL is `/campaigns`<br>Page title shows "Campaigns"<br>Campaign list renders (empty or with data) | - | - |
| TC-CAMP-002 | Click Create Campaign Button | 1. On `/campaigns` page<br>2. Locate "+ Create Campaign" button<br>3. Click the button | **MEDIUM** | Campaign creation dialog/drawer opens<br>OR Advisor chat activates<br>Button is visible and clickable | - | - |
| TC-CAMP-003 | Send Campaign Creation Message | 1. Campaign creation interface open<br>2. Enter campaign details via chat/form:<br>   - Name: "Summer Sale 2026"<br>   - Platform: "instagram"<br>   - Budget: 500<br>   - Start date: 2026-06-15<br>   - End date: 2026-06-30<br>3. Submit/Send message | **HIGH** - Core functionality | Message accepted<br>No validation errors<br>Loading indicator appears<br>Request sent to backend | - | - |
| TC-CAMP-004 | Receive Success Response | 1. Campaign creation request sent<br>2. Backend processes request<br>3. Wait for response | **HIGH** - Core functionality | Success response received (200/201)<br>Response contains:<br>  - `campaign.id` (UUID)<br>  - `campaign.name`<br>  - `campaign.workspace_id`<br>  - `campaign.created_at`<br>Success message displayed to user<br>Dialog/drawer closes | - | - |
| TC-CAMP-005 | Campaign Appears in UI | 1. Success response received<br>2. Check campaigns list/page | **HIGH** - UX | New campaign visible in list<br>Campaign card shows correct data:<br>  - Name: "Summer Sale 2026"<br>  - Platform icon (Instagram)<br>  - Budget: $500<br>  - Status: "draft" or "active"<br>  - Date range displayed<br>Campaign is clickable for details | - | - |
| TC-CAMP-006 | Database Persistence Validation | 1. Campaign created via API<br>2. Query database directly<br>3. Verify data integrity | **CRITICAL** - Data integrity | Campaign record exists in `campaigns` table<br>All fields persisted correctly:<br>  - `id` is valid UUID<br>  - `workspace_id` matches user's workspace<br>  - `name` = "Summer Sale 2026"<br>  - `platform` = "instagram"<br>  - `budget` = 500<br>  - `start_date` = "2026-06-15"<br>  - `end_date` = "2026-06-30"<br>  - `created_at` is ISO timestamp<br>  - `updated_at` is ISO timestamp<br>No duplicate entries | - | - |
| TC-CAMP-007 | Invalid Budget | 1. Campaign creation interface open<br>2. Enter budget < 0 or non-numeric<br>3. Submit | **MEDIUM** | Validation error: "Budget must be positive"<br>Form submission blocked<br>Error message displayed | - | - |
| TC-CAMP-008 | Invalid Date Range | 1. Campaign creation interface open<br>2. Enter end date before start date<br>3. Submit | **MEDIUM** | Validation error: "End date must be after start date"<br>Form submission blocked<br>Error message displayed | - | - |
| TC-CAMP-009 | Missing Required Fields | 1. Campaign creation interface open<br>2. Leave name or platform empty<br>3. Submit | **HIGH** | Validation error: "Required fields missing"<br>Form submission blocked<br>Error message displayed | - | - |
| TC-CAMP-010 | Cross-Workspace Access | 1. User authenticated in Workspace A<br>2. Attempt POST /api/campaigns with Workspace B ID<br>3. Check response | **CRITICAL** | 403 Forbidden response<br>Campaign not created<br>Error message: "Unauthorized access" | - | - |
| TC-CAMP-011 | Duplicate Campaign Name | 1. Campaign "Summer Sale 2026" exists<br>2. Create another campaign with same name<br>3. Check result | **LOW** | Campaign created successfully<br>Both campaigns exist with same name<br>Different UUIDs<br>(No uniqueness constraint enforced) | - | - |


---

## Test Data

### Valid Campaign Input
```json
{
  "name": "Summer Sale 2026",
  "platform": "instagram",
  "budget": 500,
  "start_date": "2026-06-15",
  "end_date": "2026-06-30",
  "targeting": {
    "age_min": 18,
    "age_max": 45,
    "gender": "all",
    "regions": ["Lebanon", "UAE"]
  },
  "objective": "engagement"
}
```

### Expected Database Record
```sql
-- campaigns table
SELECT 
  id,
  workspace_id,
  name,
  platform,
  budget,
  start_date,
  end_date,
  targeting,
  objective,
  status,
  created_at,
  updated_at
FROM campaigns
WHERE name = 'Summer Sale 2026'
  AND workspace_id = '<test_workspace_id>';
```

---

## Negative Test Cases (Future)

| Test Case ID | Title | Scenario | Expected Result | Reporter |
|-------------|-------|----------|-----------------|----------|

---

## API Endpoint Reference

**POST** `/api/campaigns`

**Headers**:
```
Authorization: Bearer <token>
x-workspace-id: <workspace_uuid>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Summer Sale 2026",
  "platform": "instagram",
  "budget": 500,
  "start_date": "2026-06-15",
  "end_date": "2026-06-30",
  "targeting": { "age_min": 18, "age_max": 45 },
  "objective": "engagement"
}
```

**Success Response** (201 Created):
```json
{
  "campaign": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "workspace_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Summer Sale 2026",
    "platform": "instagram",
    "budget": 500,
    "start_date": "2026-06-15",
    "end_date": "2026-06-30",
    "status": "draft",
    "created_at": "2026-06-01T10:30:00Z",
    "updated_at": "2026-06-01T10:30:00Z"
  }
}
```

---

## Test Automation Plan

### Unit Tests (Backend)
**File**: `backend/src/services/campaignService.test.js`
- Test campaign creation logic
- Test input validation
- Test workspace isolation
- Mock Supabase calls

### Integration Tests (Backend)
**File**: `backend/tests/integration/campaigns.integration.test.js`
- TC-CAMP-003: Full API request/response
- TC-CAMP-004: Success response validation
- TC-CAMP-006: Database persistence check
- Use real test database

### Component Tests (Frontend)
**File**: `frontend/src/app/campaigns/page.test.tsx`
- TC-CAMP-002: Button click handler
- Test campaign list rendering
- Test loading states
- Mock API calls with MSW

### E2E Tests (Frontend)
**File**: `frontend/tests/e2e/campaign-creation.spec.ts`
- TC-CAMP-001: Navigation
- TC-CAMP-002: Button interaction
- TC-CAMP-003: Form submission
- TC-CAMP-005: UI update after creation
- Full user flow from start to finish

---

## Dependencies

### Backend
- `backend/src/services/campaignService.js` - Business logic
- `backend/src/controllers/campaignController.js` - HTTP handlers
- `backend/src/validators/campaignValidator.js` - Zod schemas
- `backend/src/routes/campaignRoutes.js` - Route definitions
- `backend/src/middleware/workspaceContext.js` - Tenant isolation

### Frontend
- `frontend/src/app/campaigns/page.tsx` - Campaign list page
- `frontend/src/lib/api.ts` - API client
- `frontend/src/components/advisor/AdvisorChat.tsx` - Campaign creation via chat (if used)
- TanStack Query mutations for API calls

### Database
- `campaigns` table in Supabase
- Workspace relationship via `workspace_id` foreign key

---

## Success Criteria

- [ ] All 6 test cases passing
- [ ] Backend API endpoint working
- [ ] Frontend form/chat submission working
- [ ] Database record created correctly
- [ ] Workspace isolation enforced
- [ ] UI updates after creation
- [ ] No console errors
- [ ] Response time < 2 seconds

---

## Notes

- Campaign creation may use **Advisor Chat** or a traditional form (confirm implementation)
- `targeting` and `objective` fields are optional in v1
- Campaign status defaults to `"draft"`
- Budget is stored as numeric (no currency conversion)
- Dates are ISO 8601 strings
- Platform enum: `"instagram" | "facebook" | "tiktok" | "twitter"`

---

**Created**: 2026-06-01  
**Priority**: HIGH  
**Estimated Effort**: 8 hours (2h backend unit, 3h integration, 2h E2E, 1h component)
