# Test Cases Documentation - SmartMENA Analytics

**Project**: SmartMENA Analytics
**Test Documentation Version**: 1.0
**Last Updated**: 2026-05-30

---

## 📋 Overview

This directory contains comprehensive test case documentation for all critical functionalities in SmartMENA Analytics. Each test case is documented with:

- **Test Case ID**: Unique identifier
- **Test Case Title**: Clear description
- **Steps**: Detailed execution steps
- **Risk Level**: CRITICAL, HIGH, MEDIUM, LOW
- **Expected Result**: What should happen
- **Status**: ✅ Passing, ⏳ In Progress, ⏳ To Do, ⏭️ Skipped
- **Automation File**: Path to automated test implementation

---

## 📂 Test Case Modules

### 1. Authentication & User Management
**File**: [TC-001-Authentication.md](./TC-001-Authentication.md)  
**Priority**: Critical  
**Test Cases**: 15  
**Status**: 5/15 Passing (33%)

**Covers**:
- User registration with validation
- Login/logout flows
- Session token management
- Password hashing and security
- Protected route access
- Demo account (Born2Hike)

**Key Risks**:
- ⚠️ Session token validation (HIGH)
- ⚠️ Password security (CRITICAL)
- ⚠️ Protected route bypass attempts (HIGH)

---

### 2. OAuth & Social Account Connections
**File**: [TC-002-OAuth-Social-Connections.md](./TC-002-OAuth-Social-Connections.md)  
**Priority**: Critical  
**Test Cases**: 15  
**Status**: 3/15 Passing (20%)

**Covers**:
- Meta OAuth flow (Instagram, Facebook)
- Token encryption (AES-256-GCM)
- CSRF protection with oauth_state
- Account syncing and disconnection
- Token expiration handling
- Multi-account management

**Key Risks**:
- ⚠️ OAuth token encryption/decryption (CRITICAL)
- ⚠️ CSRF attacks via state manipulation (CRITICAL)
- ⚠️ Token tampering detection (CRITICAL)

**Fully Tested**: ✅ Token encryption (21/21 tests passing)

---

### 3. Post Scheduling & Publishing
**File**: [TC-003-Post-Scheduling-Publishing.md](./TC-003-Post-Scheduling-Publishing.md)  
**Priority**: Critical  
**Test Cases**: 18  
**Status**: 0/18 To Do (0%)

**Covers**:
- Scheduled post creation
- Input validation (Zod schemas)
- Background worker publishing
- Race condition prevention
- Platform integration (Meta API)
- Workspace isolation in publishing
- Failure handling and retries

**Key Risks**:
- ⚠️ Worker race conditions (CRITICAL)
- ⚠️ Multi-tenancy isolation (CRITICAL)
- ⚠️ Duplicate publishing prevention (HIGH)

---

### 4. Workspace & Multi-Tenancy
**File**: [TC-004-Workspace-Multi-Tenancy.md](./TC-004-Workspace-Multi-Tenancy.md)  
**Priority**: Critical (Security)  
**Test Cases**: 18  
**Status**: 6/18 Passing (33%)

**Covers**:
- Workspace context middleware
- x-workspace-id header validation
- Membership verification
- Cross-workspace access prevention
- Data isolation (campaigns, posts, accounts)
- Role-based access (owner, member)
- Workspace switching

**Key Risks**:
- ⚠️ Cross-workspace data leakage (CRITICAL)
- ⚠️ Unauthorized workspace access (CRITICAL)
- ⚠️ Data isolation failures (CRITICAL)

**Fully Tested**: ✅ Workspace middleware core scenarios (9/14 passing, 5 skipped)

---

## 📊 Overall Test Coverage

### Summary by Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Passing | 14 | 21% |
| ⏳ In Progress | 1 | 2% |
| ⏭️ Skipped | 8 | 12% |
| ⏳ To Do | 43 | 65% |
| **TOTAL** | **66** | **100%** |

### Summary by Risk Level

| Risk Level | Count | Percentage |
|------------|-------|------------|
| CRITICAL | 13 | 20% |
| HIGH | 23 | 35% |
| MEDIUM | 26 | 39% |
| LOW | 4 | 6% |
| **TOTAL** | **66** | **100%** |

### Summary by Module

| Module | Total | Passing | To Do | Progress |
|--------|-------|---------|-------|----------|
| Authentication | 15 | 5 | 9 | 33% |
| OAuth & Social | 15 | 3 | 12 | 20% |
| Post Scheduling | 18 | 0 | 18 | 0% |
| Workspace / Multi-Tenancy | 18 | 6 | 9 | 33% |
| **TOTAL** | **66** | **14** | **48** | **21%** |

---

## 🚀 Test Automation Status

### ✅ Fully Automated (100%)
1. **Token Encryption** - `backend/src/services/oauth/tokenCrypto.test.js`
   - 21/21 tests passing
   - All encryption/decryption scenarios covered
   - Tamper detection validated

### ⚠️ Partially Automated (33-64%)
1. **Workspace Middleware** - `backend/src/middleware/workspaceContext.test.js`
   - 9/14 tests passing (5 skipped - dynamic require issue)
   - Core security scenarios validated
   - Edge cases need integration tests

2. **Auth Service** - `backend/src/services/authService.test.js`
   - 8/16 tests passing
   - Helper functions working
   - Complex flows need mock fixes

3. **Frontend Utils** - `frontend/src/lib/utils.test.ts`
   - 3/3 tests passing
   - Basic utility functions validated

### ⏳ Not Yet Automated (0%)
- Post scheduling and publishing (18 test cases)
- OAuth integration flows (12 test cases)
- Authentication UI flows (10 test cases)
- Workspace switching (9 test cases)

---

## 🎯 Automation Priority

### Phase 1 (Immediate) - Security Critical
1. ✅ **Token Encryption** - Complete
2. ⚠️ **Auth Service Flows** - Fix 7 failing tests
3. ⏳ **OAuth Integration** - Create integration tests
4. ⏳ **Workspace Data Isolation** - Integration tests

### Phase 2 (High Priority) - Core Functionality
5. ⏳ **Post Scheduling Validators** - Zod schema tests
6. ⏳ **Publishing Worker** - Race condition tests
7. ⏳ **Social Account Sync** - Integration tests

### Phase 3 (Medium Priority) - User Flows
8. ⏳ **Authentication E2E** - Playwright tests
9. ⏳ **Post Scheduling E2E** - Playwright tests
10. ⏳ **Workspace Switching E2E** - Playwright tests

---

## 📁 Automation File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── authService.test.js                 ⚠️ 8/16 passing
│   │   └── oauth/
│   │       └── tokenCrypto.test.js            ✅ 21/21 passing
│   ├── middleware/
│   │   └── workspaceContext.test.js           ⚠️ 9/14 passing
│   └── validators/
│       └── scheduledPostValidator.test.js     ⏳ To be created
├── tests/
│   ├── integration/
│   │   ├── auth.integration.test.js           ⏳ To be created
│   │   ├── oauth.integration.test.js          ⏳ To be created
│   │   ├── scheduledPosts.integration.test.js ⏳ To be created
│   │   └── workspaces.integration.test.js     ⏳ To be created
│   └── helpers/
│       ├── mockMLService.js                   ⏳ To be created
│       └── mockMetaGraphAPI.js                ⏳ To be created

frontend/
├── src/
│   ├── lib/
│   │   └── utils.test.ts                      ✅ 3/3 passing
│   └── app/
│       ├── login/page.test.tsx                ⏳ To be created
│       ├── register/page.test.tsx             ⏳ To be created
│       └── content/page.test.tsx              ⏳ To be created
└── tests/
    └── e2e/
        ├── auth.spec.ts                       ⏳ To be created
        ├── postScheduling.spec.ts             ⏳ To be created
        └── workspace.spec.ts                  ⏳ To be created
```

---

## 🛠️ Running Tests

### Backend Tests
```bash
cd backend

# All tests
npm test

# Specific module
npm test -- tokenCrypto
npm test -- authService
npm test -- workspaceContext

# With coverage
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend

# All unit/component tests
npm test

# Specific test
npm test -- utils

# E2E tests
npm run test:e2e
npm run test:e2e:ui      # Interactive mode
npm run test:e2e:debug   # Debug mode
```

---

## 📝 Test Case Template

When creating new test cases, use this format:

| Test Case ID | Test Case Title | Steps | Risk | Expected Result | Status | Automation File |
|--------------|----------------|-------|------|-----------------|--------|-----------------|
| TC-XXX-001 | Clear descriptive title | 1. Step one<br>2. Step two<br>3. Step three | CRITICAL/HIGH/MEDIUM/LOW | What should happen<br>Status codes<br>Error messages | ✅/⏳/⏭️ | `path/to/test.js` |

---

## 🔍 Test Case ID Convention

- **TC-AUTH-XXX** - Authentication & User Management
- **TC-OAUTH-XXX** - OAuth & Social Connections
- **TC-POST-XXX** - Post Scheduling & Publishing
- **TC-WS-XXX** - Workspace & Multi-Tenancy
- **TC-ML-XXX** - ML Service Integration (future)
- **TC-CAMP-XXX** - Campaign Management (future)
- **TC-ANAL-XXX** - Analytics & Insights (future)

---

## 📈 Progress Tracking

**Current Sprint Goal**: Complete Priority 1 Critical Security Tests

- ✅ Token encryption: 100% complete (21/21)
- ⚠️ Workspace middleware: 64% complete (9/14, 5 skipped)
- ⚠️ Auth service: 50% complete (8/16)
- ⏳ OAuth integration: 20% complete (3/15)

**Next Sprint Goal**: Post Scheduling & Publishing Tests

- Target: 18 test cases
- Focus: Worker race conditions, validation, platform integration

---

## 🤝 Contributing

When adding new test cases:

1. Create a new markdown file in `test-cases/` directory
2. Follow the table format with all required columns
3. Map each test case to an automation file (even if not yet created)
4. Update this README with the new module
5. Update progress tracking metrics

---

## 📚 Related Documentation

- [TESTING.md](../TESTING.md) - Testing infrastructure guide
- [TEST-CASES.md](../TEST-CASES.md) - Full test case specification (194 cases)
- [TEST-PROGRESS.md](../TEST-PROGRESS.md) - Current implementation progress

---

**Maintained by**: Development Team  
**Review Frequency**: Weekly  
**Next Review**: After completing Priority 1 tests
