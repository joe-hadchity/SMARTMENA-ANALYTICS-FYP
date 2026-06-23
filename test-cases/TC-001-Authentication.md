# Test Cases: Authentication & User Management

**Module**: Authentication
**Priority**: Critical
**Last Updated**: 2026-05-30

---

## Test Case Summary

| Test Case ID | Test Case Title | Steps | Risk | Expected Result | Status | Automation File |
|--------------|----------------|-------|------|-----------------|--------|-----------------|
| TC-AUTH-001 | User Registration with Valid Data | 1. Navigate to /register<br>2. Enter valid email (test@example.com)<br>3. Enter valid password (Test123!@#)<br>4. Enter name (Test User)<br>5. Enter workspace name (Test Workspace)<br>6. Click Register | **HIGH** - Core functionality | User account created<br>Default workspace created<br>User logged in automatically<br>Redirected to /onboarding | ⏳ In Progress | `backend/src/services/authService.test.js`<br>`frontend/tests/e2e/auth.spec.ts` |
| TC-AUTH-002 | User Registration with Duplicate Email | 1. Register user with email test@example.com<br>2. Try to register again with same email<br>3. Different password | **MEDIUM** | Error message: "Email already registered"<br>Status code: 409<br>User not created | ⏳ To Do | `backend/tests/integration/auth.integration.test.js` |
| TC-AUTH-003 | User Registration with Invalid Email Format | 1. Navigate to /register<br>2. Enter invalid email (notanemail)<br>3. Enter valid password<br>4. Click Register | **LOW** | Client-side validation error<br>Error: "Invalid email format"<br>Register button disabled | ⏳ To Do | `frontend/src/app/register/page.test.tsx` |
| TC-AUTH-004 | User Registration with Weak Password | 1. Navigate to /register<br>2. Enter valid email<br>3. Enter weak password (123)<br>4. Click Register | **MEDIUM** | Client-side validation error<br>Error: "Password must be at least 8 characters"<br>Password strength indicator shows "Weak" | ⏳ To Do | `frontend/src/app/register/page.test.tsx` |
| TC-AUTH-005 | User Login with Valid Credentials | 1. Navigate to /login<br>2. Enter registered email<br>3. Enter correct password<br>4. Click Login | **HIGH** - Core functionality | User authenticated<br>Session token stored in localStorage<br>Redirected to dashboard (/)<br>x-workspace-id header set | ✅ Passing | `backend/src/services/authService.test.js`<br>`frontend/tests/e2e/auth.spec.ts` |
| TC-AUTH-006 | User Login with Invalid Password | 1. Navigate to /login<br>2. Enter valid email<br>3. Enter wrong password<br>4. Click Login | **HIGH** - Security | Error message: "Invalid email or password"<br>Status code: 401<br>User not authenticated<br>No token stored | ✅ Passing | `backend/src/services/authService.test.js` |
| TC-AUTH-007 | User Login with Non-existent Email | 1. Navigate to /login<br>2. Enter non-registered email<br>3. Enter any password<br>4. Click Login | **MEDIUM** | Error message: "Invalid email or password"<br>Status code: 401<br>Generic message (no user enumeration) | ✅ Passing | `backend/src/services/authService.test.js` |
| TC-AUTH-008 | Session Token Validation | 1. Login successfully<br>2. Extract access token from response<br>3. Call GET /api/auth/me with token<br>4. Verify user data returned | **HIGH** - Security | User data returned<br>Status: 200<br>Contains: id, email, name<br>Token validated by Supabase | ✅ Passing | `backend/src/services/authService.test.js` |
| TC-AUTH-009 | Session Token Expiration | 1. Login successfully<br>2. Wait for token expiration (default: 1 hour)<br>3. Make API request with expired token<br>4. Observe response | **HIGH** - Security | Status: 401<br>Error: "Invalid or expired session"<br>Frontend redirects to /login | ⏳ To Do | `backend/tests/integration/auth.integration.test.js` |
| TC-AUTH-010 | Logout Functionality | 1. Login successfully<br>2. Navigate to dashboard<br>3. Click Logout button<br>4. Verify session cleared | **MEDIUM** | Token removed from localStorage<br>Workspace ID cleared<br>Redirected to /login<br>Cannot access protected routes | ⏳ To Do | `frontend/tests/e2e/auth.spec.ts` |
| TC-AUTH-011 | Protected Route Access Without Auth | 1. Clear all localStorage<br>2. Navigate directly to /campaigns<br>3. Observe behavior | **HIGH** - Security | Immediately redirected to /login<br>Status: 401<br>No data loaded | ⏳ To Do | `frontend/tests/e2e/auth.spec.ts` |
| TC-AUTH-012 | Session Persistence Across Page Reload | 1. Login successfully<br>2. Navigate to dashboard<br>3. Refresh page (F5)<br>4. Verify session maintained | **HIGH** - UX | User remains logged in<br>Dashboard loads immediately<br>No redirect to login<br>Token retrieved from localStorage | ⏳ To Do | `frontend/tests/e2e/auth.spec.ts` |
| TC-AUTH-013 | Demo Account Login (Born2Hike) | 1. Navigate to /login<br>2. Click "Try Demo Account" button<br>3. Credentials auto-filled<br>4. Click Login | **MEDIUM** | Email: born2hike@smartmena.local<br>Password: Born2Hike2026!<br>Successfully logged in<br>Demo data available | ⏳ To Do | `backend/src/services/authService.test.js` |
| TC-AUTH-014 | Bearer Token Extraction from Header | 1. Make API request<br>2. Set Authorization: Bearer {token}<br>3. Middleware extracts token<br>4. Token validated | **HIGH** - Security | Token extracted correctly<br>Case-insensitive "Bearer" prefix<br>Whitespace trimmed<br>Returns null if missing | ✅ Passing | `backend/src/services/authService.test.js` |
| TC-AUTH-015 | Password Hashing Before Storage | 1. Register new user<br>2. Verify password is hashed by Supabase<br>3. Check password never stored in plaintext | **CRITICAL** - Security | Supabase Auth handles bcrypt hashing<br>Plaintext password never in database<br>Only hash stored in auth.users | ✅ Passing | `backend/src/services/authService.test.js` |

---

## Test Coverage Summary

- **Total Test Cases**: 15
- **Status**:
  - ✅ Passing: 5 (33%)
  - ⏳ In Progress: 1 (7%)
  - ⏳ To Do: 9 (60%)
- **Risk Level**:
  - CRITICAL: 1
  - HIGH: 8
  - MEDIUM: 5
  - LOW: 1

---

## Automation Files

### Backend Unit Tests
- `backend/src/services/authService.test.js` - Auth service functions
- `backend/tests/integration/auth.integration.test.js` - API endpoints (to be created)

### Frontend Tests
- `frontend/src/app/login/page.test.tsx` - Login page component (to be created)
- `frontend/src/app/register/page.test.tsx` - Register page component (to be created)
- `frontend/tests/e2e/auth.spec.ts` - End-to-end auth flows (to be created)

---

## Dependencies

- Supabase Auth API
- JWT token validation
- localStorage for token storage
- AuthProvider context (frontend)

---

## Notes

- All passwords must be at least 8 characters
- Sessions expire after 1 hour by default
- Demo account credentials are hardcoded for testing
- Multi-workspace support requires x-workspace-id header
