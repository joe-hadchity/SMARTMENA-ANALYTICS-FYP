# Test Cases: Post Scheduling & Publishing

**Module**: Scheduled Posts / Publishing Worker
**Priority**: Critical
**Last Updated**: 2026-05-30

---

## Test Case Summary

| Test Case ID | Test Case Title | Steps | Risk | Expected Result | Status | Automation File |
|--------------|----------------|-------|------|-----------------|--------|-----------------|
| TC-POST-001 | Create Scheduled Post with Valid Data | 1. Navigate to /content?view=calendar<br>2. Click a future date<br>3. Fill form: caption, platform (Instagram), account, media URL<br>4. Set scheduled_at to future time<br>5. Click Save | **HIGH** - Core functionality | Post created with status=scheduled<br>Appears in calendar view<br>workspace_id set correctly<br>Validation passes (Zod schema) | ⏳ To Do | `backend/tests/integration/scheduledPosts.integration.test.js`<br>`frontend/tests/e2e/postScheduling.spec.ts` |
| TC-POST-002 | Schedule Post with Invalid Data | 1. Open post creation form<br>2. Leave caption empty<br>3. Select no platform<br>4. Try to save | **MEDIUM** | Validation errors shown<br>Error: "Caption is required"<br>Error: "Platform is required"<br>Save button disabled or request rejected (400) | ⏳ To Do | `backend/src/validators/scheduledPostValidator.test.js`<br>`frontend/src/app/content/page.test.tsx` |
| TC-POST-003 | Schedule Post in the Past | 1. Create post<br>2. Set scheduled_at to past date/time<br>3. Try to save | **MEDIUM** | Validation error<br>Error: "Scheduled time must be in the future"<br>Status: 400<br>Post not created | ⏳ To Do | `backend/src/validators/scheduledPostValidator.test.js` |
| TC-POST-004 | Hashtag Normalization (>30 hashtags) | 1. Create post<br>2. Add 50 hashtags to caption<br>3. Save post | **LOW** | Only first 30 hashtags kept<br>Duplicates removed<br>Whitespace trimmed<br>Normalized list stored | ⏳ To Do | `backend/src/validators/scheduledPostValidator.test.js` |
| TC-POST-005 | Caption Length Validation (>2200 chars) | 1. Create post<br>2. Enter caption with 3000 characters<br>3. Try to save | **LOW** | Validation error<br>Error: "Caption must be max 2200 characters"<br>Character counter shown in UI<br>Status: 400 | ⏳ To Do | `backend/src/validators/scheduledPostValidator.test.js` |
| TC-POST-006 | Publish Worker Claims Due Posts | 1. Create 3 posts scheduled for now<br>2. Trigger publishWorker.publishDuePosts()<br>3. Worker claims batch atomically | **CRITICAL** - Race conditions | Posts claimed atomically with UPDATE WHERE<br>Status changes: scheduled → publishing<br>No duplicate claims between workers<br>claimed_at timestamp set | ⏳ To Do | `backend/src/services/scheduledPostService.test.js` |
| TC-POST-007 | Publish Worker Publishes to Platform | 1. Worker claims post<br>2. Calls platform integration (Meta API)<br>3. Post published to Instagram<br>4. external_post_id captured | **HIGH** - Core functionality | Platform API called with correct params<br>Post appears on Instagram<br>external_post_id stored in DB<br>Status: publishing → published<br>published_at timestamp set | ⏳ To Do | `backend/tests/integration/scheduledPosts.integration.test.js` |
| TC-POST-008 | Publish Worker Handles Failures | 1. Worker claims post<br>2. Platform API returns error (rate limit)<br>3. Worker handles gracefully | **HIGH** - Reliability | Status: publishing → failed<br>error_message stored in DB<br>Error logged<br>Other posts continue processing<br>Failed post can be retried | ⏳ To Do | `backend/src/services/scheduledPostService.test.js` |
| TC-POST-009 | Race Condition: Concurrent Workers | 1. Start 2 worker instances simultaneously<br>2. Both try to claim same due posts<br>3. Verify only one claims each post | **CRITICAL** - Data integrity | PostgreSQL row-level locking prevents duplicates<br>Each post claimed by exactly one worker<br>No double-publishing<br>claimed_at is unique per post | ⏳ To Do | `backend/src/services/scheduledPostService.test.js` |
| TC-POST-010 | Manual Publish Now | 1. User has scheduled post<br>2. Click "Publish Now" button<br>3. Backend triggers immediate publish | **MEDIUM** | API call to POST /api/scheduled-posts/publish-now<br>Worker triggered immediately<br>Post published within seconds<br>Status updated to published | ⏳ To Do | `backend/tests/integration/scheduledPosts.integration.test.js` |
| TC-POST-011 | Cancel Scheduled Post | 1. User has scheduled post (status=scheduled)<br>2. Click "Cancel" button<br>3. Confirm cancellation | **MEDIUM** | Status changes to cancelled<br>Worker will not publish<br>Post remains in DB for history<br>cancelled_at timestamp set | ⏳ To Do | `backend/tests/integration/scheduledPosts.integration.test.js` |
| TC-POST-012 | Edit Scheduled Post Before Publishing | 1. Create scheduled post<br>2. Before scheduled_at, click Edit<br>3. Change caption and time<br>4. Save | **MEDIUM** | Post updated successfully<br>New caption and scheduled_at saved<br>Status remains scheduled<br>Worker will publish at new time | ⏳ To Do | `backend/tests/integration/scheduledPosts.integration.test.js` |
| TC-POST-013 | Delete Scheduled Post | 1. User has scheduled post<br>2. Click Delete button<br>3. Confirm deletion | **MEDIUM** | Confirmation modal shown<br>Post deleted from DB<br>Removed from calendar view<br>Cannot be recovered | ⏳ To Do | `backend/tests/integration/scheduledPosts.integration.test.js` |
| TC-POST-014 | View Scheduled Posts in Calendar | 1. Navigate to /content?view=calendar<br>2. User has posts scheduled on different dates<br>3. View calendar | **LOW** - UI/UX | Posts displayed on correct dates<br>Color-coded by platform<br>Hover shows caption preview<br>Click opens edit drawer | ⏳ To Do | `frontend/tests/e2e/postScheduling.spec.ts` |
| TC-POST-015 | Filter Posts by Platform | 1. Navigate to /content<br>2. User has posts for Instagram and Facebook<br>3. Click Instagram filter<br>4. View results | **LOW** - UI/UX | Only Instagram posts shown<br>Facebook posts hidden<br>Filter badge shown<br>Count updates | ⏳ To Do | `frontend/src/app/content/page.test.tsx` |
| TC-POST-016 | Worker Idempotency | 1. Post is claimed and published<br>2. Worker runs again<br>3. Same post is not republished | **HIGH** - Data integrity | Status=published posts excluded from claim query<br>WHERE status='scheduled' AND scheduled_at <= now<br>No duplicate publishing | ⏳ To Do | `backend/src/services/scheduledPostService.test.js` |
| TC-POST-017 | Workspace Isolation in Post Publishing | 1. Workspace A schedules post<br>2. Workspace B cannot see/edit that post<br>3. Worker publishes only to correct account | **CRITICAL** - Multi-tenancy | Posts filtered by workspace_id<br>social_account belongs to same workspace<br>No cross-workspace data leakage | ⏳ To Do | `backend/tests/integration/scheduledPosts.integration.test.js` |
| TC-POST-018 | Post Publishing Timeout Handling | 1. Worker attempts to publish<br>2. Platform API times out (>30s)<br>3. Worker handles timeout | **HIGH** - Reliability | Timeout error caught<br>Status: publishing → failed<br>error_message: "Timeout"<br>Post can be retried<br>Worker continues with other posts | ⏳ To Do | `backend/src/services/scheduledPostService.test.js` |

---

## Test Coverage Summary

- **Total Test Cases**: 18
- **Status**:
  - ⏳ To Do: 18 (100%)
- **Risk Level**:
  - CRITICAL: 3 (Worker race conditions, multi-tenancy)
  - HIGH: 6
  - MEDIUM: 7
  - LOW: 2

---

## Automation Files

### Backend Unit Tests
- `backend/src/services/scheduledPostService.test.js` - To be created (worker logic, race conditions)
- `backend/src/validators/scheduledPostValidator.test.js` - To be created (Zod validation)

### Backend Integration Tests
- `backend/tests/integration/scheduledPosts.integration.test.js` - To be created (API endpoints, worker flow)

### Frontend Tests
- `frontend/src/app/content/page.test.tsx` - To be created (component tests)
- `frontend/tests/e2e/postScheduling.spec.ts` - To be created (E2E user flow)

---

## Dependencies

- Supabase table: scheduled_posts
- Platform integrations: metaInstagramService, metaFacebookService
- Background worker: publishWorker (60s interval)
- Zod validator: scheduledPostValidator
- Frontend: React Hook Form, TanStack Query

---

## Worker Configuration

```javascript
// Worker behavior
- Interval: 60 seconds
- Batch size: 10 posts per run
- Atomic claim: UPDATE ... WHERE status='scheduled' AND scheduled_at <= now
- Status flow: draft → scheduled → publishing → published
                                  ↘ failed
                     ↘ cancelled
```

---

## Notes

- **Atomic Operations**: Worker uses PostgreSQL row-level locking to prevent race conditions
- **Idempotency**: Published posts are never republished
- **Retry Logic**: Failed posts remain in DB for manual retry
- **Multi-Platform**: Supports Instagram, Facebook, TikTok, Twitter (X)
- **Workspace Scoping**: All operations filtered by workspace_id
- **Media Support**: Supports image URLs, video URLs, carousel (array of media_urls)
