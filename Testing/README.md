# Testing - SmartMENA Analytics

**Complete Test Documentation & Automation**

---

## 📂 Folder Structure

```
Testing/
├── test-cases/                     # Test Case Documentation (Markdown Tables)
│   ├── README.md                   # Test cases index
│   ├── TC-001-Authentication.md    # 15 test cases
│   ├── TC-002-OAuth-Social-Connections.md  # 15 test cases
│   ├── TC-003-Post-Scheduling-Publishing.md  # 18 test cases
│   └── TC-004-Workspace-Multi-Tenancy.md  # 18 test cases
│
└── automation/                     # Automated Test Files
    ├── backend/
    │   ├── unit/                   # Backend unit tests
    │   │   ├── tokenCrypto.test.js          ✅ 21/21 passing
    │   │   ├── workspaceContext.test.js     ⚠️ 9/14 passing
    │   │   └── authService.test.js          ⚠️ 8/16 passing
    │   │
    │   └── integration/            # Backend integration tests
    │       ├── oauth.integration.test.js         ⏳ To be created
    │       ├── scheduledPosts.integration.test.js  ⏳ To be created
    │       └── workspaces.integration.test.js    ⏳ To be created
    │
    └── frontend/
        ├── unit/                   # Frontend unit tests
        │   └── utils.test.ts                ✅ 3/3 passing
        │
        └── e2e/                    # End-to-end tests (Playwright)
            ├── auth.spec.ts                 ⏳ To be created
            ├── postScheduling.spec.ts       ⏳ To be created
            └── connections.spec.ts          ⏳ To be created
```

---

## 📊 Test Coverage Summary

### **Total Test Cases Documented**: 66
- Authentication: 15 test cases
- OAuth & Social: 15 test cases
- Post Scheduling: 18 test cases
- Workspace/Multi-Tenancy: 18 test cases

### **Total Automated Tests**: 51
- ✅ Passing: 38 tests (75%)
- ❌ Failing: 7 tests (14%)
- ⏭️ Skipped: 6 tests (11%)

---

## 🎯 Test Cases Documentation

### Location: `Testing/test-cases/`

All test cases are documented in **markdown tables** with the format:

| Test Case ID | Test Case Title | Steps | Risk | Expected Result | Status | Automation File |
|--------------|----------------|-------|------|-----------------|--------|-----------------|

### Quick Links:
- [TC-001: Authentication](./test-cases/TC-001-Authentication.md) - 15 cases (33% automated)
- [TC-002: OAuth & Social Connections](./test-cases/TC-002-OAuth-Social-Connections.md) - 15 cases (20% automated)
- [TC-003: Post Scheduling & Publishing](./test-cases/TC-003-Post-Scheduling-Publishing.md) - 18 cases (0% automated)
- [TC-004: Workspace & Multi-Tenancy](./test-cases/TC-004-Workspace-Multi-Tenancy.md) - 18 cases (33% automated)

---

## 🤖 Automation Files

### Location: `Testing/automation/`

### **Backend Unit Tests** (`automation/backend/unit/`)

#### 1. ✅ `tokenCrypto.test.js` (21/21 passing - 100%)
**Covers**: TC-OAUTH-005, TC-OAUTH-006, TC-OAUTH-007
- Token encryption/decryption (AES-256-GCM)
- Tamper detection
- All input formats

**Run from project root**:
```bash
cd backend
npm test -- tokenCrypto
```

**Expected Result**: ✅ `Tests: 21 passed, 21 total`

---

#### 2. ⚠️ `workspaceContext.test.js` (9/14 passing - 64%)
**Covers**: TC-WS-002, TC-WS-003, TC-WS-004, TC-WS-005, TC-WS-010, TC-WS-015, TC-WS-017
- Workspace ID extraction from header
- Authentication required
- Workspace membership validation
- Role assignment

**Run from project root**:
```bash
cd backend
npm test -- workspaceContext
```

**Expected Result**: ⚠️ `Tests: 5 skipped, 9 passed, 14 total`

---

#### 3. ⚠️ `authService.test.js` (8/16 passing - 50%)
**Covers**: TC-AUTH-003, TC-AUTH-008, TC-AUTH-014, TC-AUTH-015
- Password hashing
- Bearer token extraction
- User formatting
- Token validation

**Run from project root**:
```bash
cd backend
npm test -- authService
```

**Expected Result**: ⚠️ `Tests: 7 failed, 1 skipped, 8 passed, 16 total`

---

### **Frontend Unit Tests** (`automation/frontend/unit/`)

#### 4. ✅ `utils.test.ts` (3/3 passing - 100%)
**Covers**: Frontend utility functions
- Classname merging
- Conditional classes
- Falsy value handling

**Run from project root**:
```bash
cd frontend
npm test -- utils
```

**Expected Result**: ✅ `Tests: 3 passed, 3 total`

---

## 🚀 How to Run Tests

### **Run All Backend Tests**
```bash
cd backend
npm test
```

### **Run All Frontend Tests**
```bash
cd frontend
npm test
```

### **Run Specific Test File**
```bash
# Backend
cd backend
npm test -- tokenCrypto       # Token encryption
npm test -- workspaceContext  # Workspace middleware
npm test -- authService       # Auth service

# Frontend
cd frontend
npm test -- utils             # Utils
```

### **Run with Coverage**
```bash
cd backend
npm run test:coverage

cd frontend
npm run test:coverage
```

---

## 📝 Creating New Automation Tests

### Step 1: Review Test Case Documentation
Open the relevant test case file in `Testing/test-cases/`:
- Read the test case ID, title, steps, expected result
- Note the risk level (CRITICAL, HIGH, MEDIUM, LOW)

### Step 2: Create Automation File
Create the file in the appropriate location:

**Backend Unit Test**:
```bash
# Create file
touch Testing/automation/backend/unit/myService.test.js

# Copy to backend source
cp Testing/automation/backend/unit/myService.test.js backend/src/services/
```

**Backend Integration Test**:
```bash
# Create file
touch Testing/automation/backend/integration/myFeature.integration.test.js

# Copy to backend tests
cp Testing/automation/backend/integration/myFeature.integration.test.js backend/tests/integration/
```

**Frontend E2E Test**:
```bash
# Create file
touch Testing/automation/frontend/e2e/myFlow.spec.ts

# Copy to frontend tests
cp Testing/automation/frontend/e2e/myFlow.spec.ts frontend/tests/e2e/
```

### Step 3: Write Test Following Pattern
```javascript
// Example: Testing/automation/backend/unit/exampleService.test.js

describe('ServiceName', () => {
  describe('TC-XXX-001: Test Case Title', () => {
    it('should do expected behavior', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = service.method(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe('expected');
    });
  });
});
```

### Step 4: Run Test
```bash
cd backend  # or frontend
npm test -- myService
```

### Step 5: Update Test Case Status
In the test case markdown file, update the **Status** column:
- ⏳ To Do → ✅ Passing
- Update automation file path if needed

---

## 📈 Test Progress Tracking

### By Module
| Module | Test Cases | Automated | Status |
|--------|-----------|-----------|--------|
| Authentication | 15 | 5 (33%) | ⚠️ In Progress |
| OAuth & Social | 15 | 3 (20%) | ⚠️ Started |
| Post Scheduling | 18 | 0 (0%) | ⏳ Not Started |
| Workspace | 18 | 6 (33%) | ⚠️ In Progress |

### By Risk Level
| Risk | Count | Automated | % |
|------|-------|-----------|---|
| CRITICAL | 13 | 7 | 54% |
| HIGH | 23 | 5 | 22% |
| MEDIUM | 26 | 2 | 8% |
| LOW | 4 | 0 | 0% |

---

## 🎯 Automation Priority

### Phase 1: Critical Security (In Progress)
- ✅ Token Encryption (100% complete)
- ⚠️ Workspace Isolation (64% complete)
- ⚠️ Authentication (50% complete)
- ⏳ OAuth Integration (20% complete)

### Phase 2: Core Functionality (Not Started)
- ⏳ Post Scheduling & Publishing (0%)
- ⏳ Social Account Syncing (0%)
- ⏳ Campaign Management (0%)

### Phase 3: User Flows (Not Started)
- ⏳ E2E Authentication Flow (0%)
- ⏳ E2E Post Scheduling (0%)
- ⏳ E2E Workspace Switching (0%)

---

## 🔗 Test Case to Automation Mapping

### Authentication Module
| Test Case ID | Title | Automation File | Status |
|--------------|-------|-----------------|--------|
| TC-AUTH-001 | User Registration | `authService.test.js` | ⏳ To Do |
| TC-AUTH-005 | Login Valid Credentials | `authService.test.js` | ✅ Passing |
| TC-AUTH-006 | Login Invalid Password | `authService.test.js` | ✅ Passing |
| TC-AUTH-014 | Bearer Token Extraction | `authService.test.js` | ✅ Passing |
| TC-AUTH-015 | Password Hashing | `authService.test.js` | ✅ Passing |

### OAuth Module
| Test Case ID | Title | Automation File | Status |
|--------------|-------|-----------------|--------|
| TC-OAUTH-005 | Token Encryption | `tokenCrypto.test.js` | ✅ Passing (21 tests) |
| TC-OAUTH-006 | Token Decryption | `tokenCrypto.test.js` | ✅ Passing |
| TC-OAUTH-007 | Tamper Detection | `tokenCrypto.test.js` | ✅ Passing |

### Workspace Module
| Test Case ID | Title | Automation File | Status |
|--------------|-------|-----------------|--------|
| TC-WS-002 | Extract Workspace ID | `workspaceContext.test.js` | ✅ Passing |
| TC-WS-003 | Reject Invalid ID | `workspaceContext.test.js` | ✅ Passing |
| TC-WS-004 | Reject Missing ID | `workspaceContext.test.js` | ✅ Passing |
| TC-WS-010 | Role Assignment | `workspaceContext.test.js` | ✅ Passing |

---

## 🛠️ Test Infrastructure

### Backend Testing Stack
- **Framework**: Jest 30.4.2
- **HTTP Testing**: Supertest 7.2.2
- **Mocking**: Nock 14.0.15
- **Coverage**: Istanbul (via Jest)

**Config**: `backend/jest.config.js`  
**Setup**: `backend/tests/setup.js`

### Frontend Testing Stack
- **Framework**: Jest (with Next.js integration)
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright
- **Mocking**: MSW (Mock Service Worker)

**Config**: `frontend/jest.config.js`  
**Setup**: `frontend/jest.setup.js`

---

## 📚 Related Documentation

- `../TESTING.md` - Testing infrastructure guide
- `../TEST-CASES-SUMMARY.md` - Complete test case summary
- `../HOW-TO-RUN-TESTS.md` - Detailed run instructions
- `../TEST-PROGRESS.md` - Implementation progress tracking

---

## 🎯 Quick Start

### 1. Review Test Cases
```bash
# Open test case documentation
cat Testing/test-cases/TC-001-Authentication.md
```

### 2. Run Existing Tests
```bash
# Backend (38 passing)
cd backend && npm test

# Frontend (3 passing)
cd frontend && npm test
```

### 3. Run 100% Passing Tests
```bash
# Token encryption (21/21)
cd backend && npm test -- tokenCrypto

# Frontend utils (3/3)
cd frontend && npm test -- utils
```

---

**Last Updated**: 2026-05-30  
**Test Coverage**: 38/51 automated (75% passing)  
**Documentation**: 66 test cases fully documented
