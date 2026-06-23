# Testing Folder Structure - SmartMENA Analytics

## 📂 Complete Directory Tree

```
Testing/
│
├── README.md                           # Main testing documentation
├── STRUCTURE.md                        # This file - folder structure
│
├── test-cases/                         # 📋 TEST CASE DOCUMENTATION
│   ├── README.md                       # Test cases index (66 cases total)
│   ├── TC-001-Authentication.md        # 15 test cases
│   ├── TC-002-OAuth-Social-Connections.md  # 15 test cases
│   ├── TC-003-Post-Scheduling-Publishing.md  # 18 test cases
│   └── TC-004-Workspace-Multi-Tenancy.md  # 18 test cases
│
└── automation/                         # 🤖 AUTOMATED TEST FILES
    │
    ├── backend/
    │   │
    │   ├── unit/                       # Backend Unit Tests
    │   │   ├── tokenCrypto.test.js     ✅ 21/21 passing (100%)
    │   │   ├── workspaceContext.test.js  ⚠️ 9/14 passing (64%)
    │   │   └── authService.test.js     ⚠️ 8/16 passing (50%)
    │   │
    │   └── integration/                # Backend Integration Tests (To Create)
    │       ├── oauth.integration.test.js  ⏳ TC-OAUTH-001 to TC-OAUTH-015
    │       ├── scheduledPosts.integration.test.js  ⏳ TC-POST-001 to TC-POST-018
    │       ├── workspaces.integration.test.js  ⏳ TC-WS-008 to TC-WS-018
    │       └── socialAccounts.integration.test.js  ⏳ TC-OAUTH-008 to TC-OAUTH-014
    │
    └── frontend/
        │
        ├── unit/                       # Frontend Unit Tests
        │   ├── utils.test.ts           ✅ 3/3 passing (100%)
        │   ├── auth.test.tsx           ⏳ TC-AUTH-003, TC-AUTH-004
        │   └── api/
        │       ├── authApi.test.ts     ⏳ TC-AUTH-014
        │       └── workspacesApi.test.ts  ⏳ TC-WS-008
        │
        └── e2e/                        # End-to-End Tests (Playwright)
            ├── auth.spec.ts            ⏳ TC-AUTH-001, TC-AUTH-005, TC-AUTH-010
            ├── postScheduling.spec.ts  ⏳ TC-POST-001, TC-POST-014
            ├── connections.spec.ts     ⏳ TC-OAUTH-001, TC-OAUTH-008
            └── workspace.spec.ts       ⏳ TC-WS-009, TC-WS-016
```

---

## 📊 Current Status

### Files Created
- ✅ **Test Case Documentation**: 5 files (README + 4 modules)
- ✅ **Automation Files**: 4 files (all copied to Testing folder)
- ✅ **Total Test Cases Documented**: 66
- ✅ **Total Automated Tests**: 51 (38 passing)

### Folder Status
```
Testing/
├── test-cases/          ✅ 5 markdown files (66 test cases)
└── automation/
    ├── backend/
    │   ├── unit/        ✅ 3 files (38 tests)
    │   └── integration/ 📁 Empty (ready for new tests)
    └── frontend/
        ├── unit/        ✅ 1 file (3 tests)
        └── e2e/         📁 Empty (ready for new tests)
```

---

## 🎯 How to Use This Structure

### 1. **Review Test Cases**
```bash
# Navigate to test case docs
cd Testing/test-cases

# Read authentication test cases
cat TC-001-Authentication.md

# See all test cases
ls -la
```

### 2. **View Automation Files**
```bash
# Navigate to automation
cd Testing/automation

# Backend unit tests
ls -la backend/unit/

# Frontend unit tests
ls -la frontend/unit/
```

### 3. **Run Tests**
Tests still run from the original locations (`backend/` and `frontend/` folders), but the **Testing** folder serves as the **single source of truth** for all test documentation and files.

```bash
# From project root
cd backend && npm test -- tokenCrypto
cd frontend && npm test -- utils
```

---

## 🔗 Test Case to File Mapping

### ✅ **Fully Automated**

| Test Case IDs | Title | File Location | Status |
|---------------|-------|---------------|--------|
| TC-OAUTH-005, 006, 007 | Token Encryption | `automation/backend/unit/tokenCrypto.test.js` | ✅ 21/21 |

### ⚠️ **Partially Automated**

| Test Case IDs | Title | File Location | Status |
|---------------|-------|---------------|--------|
| TC-WS-002 to TC-WS-017 | Workspace Middleware | `automation/backend/unit/workspaceContext.test.js` | ⚠️ 9/14 |
| TC-AUTH-003, 008, 014, 015 | Auth Service | `automation/backend/unit/authService.test.js` | ⚠️ 8/16 |

### ⏳ **Not Yet Automated**

| Test Case IDs | Title | File to Create | Priority |
|---------------|-------|----------------|----------|
| TC-OAUTH-001 to TC-OAUTH-015 | OAuth Integration | `automation/backend/integration/oauth.integration.test.js` | HIGH |
| TC-POST-001 to TC-POST-018 | Post Scheduling | `automation/backend/integration/scheduledPosts.integration.test.js` | HIGH |
| TC-WS-008 to TC-WS-018 | Workspace Integration | `automation/backend/integration/workspaces.integration.test.js` | MEDIUM |
| TC-AUTH-001, 005, 010 | Auth E2E | `automation/frontend/e2e/auth.spec.ts` | MEDIUM |

---

## 📝 Creating New Tests

### Step 1: Find Test Case
```bash
cd Testing/test-cases
# Read the test case documentation
cat TC-003-Post-Scheduling-Publishing.md
```

### Step 2: Create Automation File
```bash
cd Testing/automation/backend/integration

# Create new test file
touch scheduledPosts.integration.test.js

# Edit and add tests
code scheduledPosts.integration.test.js
```

### Step 3: Copy to Project Location
```bash
# Copy to backend tests folder
cp Testing/automation/backend/integration/scheduledPosts.integration.test.js ../../backend/tests/integration/
```

### Step 4: Run Test
```bash
cd ../../backend
npm test -- scheduledPosts
```

---

## 🎨 File Naming Conventions

### Test Case Documentation
- **Format**: `TC-{NUMBER}-{Module-Name}.md`
- **Example**: `TC-001-Authentication.md`
- **Location**: `Testing/test-cases/`

### Backend Unit Tests
- **Format**: `{serviceName}.test.js`
- **Example**: `authService.test.js`
- **Location**: `Testing/automation/backend/unit/`

### Backend Integration Tests
- **Format**: `{feature}.integration.test.js`
- **Example**: `oauth.integration.test.js`
- **Location**: `Testing/automation/backend/integration/`

### Frontend Unit Tests
- **Format**: `{componentName}.test.tsx` or `{utilName}.test.ts`
- **Example**: `utils.test.ts`
- **Location**: `Testing/automation/frontend/unit/`

### Frontend E2E Tests
- **Format**: `{flow}.spec.ts`
- **Example**: `auth.spec.ts`
- **Location**: `Testing/automation/frontend/e2e/`

---

## 🚀 Quick Commands

### View Structure
```bash
cd Testing
tree -L 3
```

### Count Test Files
```bash
cd Testing/automation
find . -name "*.test.*" -o -name "*.spec.*" | wc -l
```

### List All Test Cases
```bash
cd Testing/test-cases
grep "^| TC-" *.md | wc -l
```

### Check Automation Coverage
```bash
cd Testing
# Documented test cases
grep -r "^| TC-" test-cases/*.md | wc -l

# Automated tests
find automation -name "*.test.*" -o -name "*.spec.*" | wc -l
```

---

## 📈 Progress Tracking

### Completion Status
- **Test Case Documentation**: 100% (66/66 documented)
- **Automation Files**: 4 created, 11+ to create
- **Test Automation**: 21% (14/66 test cases automated)

### By Priority
- **CRITICAL (13 cases)**: 54% automated (7/13)
- **HIGH (23 cases)**: 22% automated (5/23)
- **MEDIUM (26 cases)**: 8% automated (2/26)
- **LOW (4 cases)**: 0% automated (0/4)

---

## 🎯 Next Steps

1. ✅ **Review** test case documentation in `Testing/test-cases/`
2. ✅ **Run existing tests** from backend/frontend folders
3. ⏳ **Create** new automation files in `Testing/automation/`
4. ⏳ **Copy** to project folders for execution
5. ⏳ **Update** test case status in markdown files

---

**Location**: `c:\RoubaPersonal\Fypv2\SMARTMENA-ANALYTICS-FYP\Testing\`  
**Last Updated**: 2026-05-30
