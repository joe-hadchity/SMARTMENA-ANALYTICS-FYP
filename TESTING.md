# Testing Guide - SmartMENA Analytics

## Overview

SmartMENA Analytics now has a comprehensive automated testing infrastructure covering:
- ✅ **Backend**: Jest + Supertest for unit & integration tests
- ✅ **Frontend**: Jest + React Testing Library for unit & component tests
- 🚧 **E2E**: Playwright (to be configured)

## Test Infrastructure Status

### Backend (✅ Complete)
- **Framework**: Jest 30.4.2
- **HTTP Testing**: Supertest 7.2.2
- **Mocking**: Nock 14.0.15
- **Config**: `backend/jest.config.js`
- **Setup**: `backend/tests/setup.js`
- **Example Test**: `backend/src/services/authService.test.js` ✅ PASSING

**Directory Structure:**
```
backend/
├── jest.config.js
├── tests/
│   ├── setup.js
│   ├── helpers/          # Mock utilities (to be added)
│   ├── fixtures/         # Test data (to be added)
│   └── integration/      # Integration tests (to be added)
└── src/
    └── **/*.test.js     # Unit tests alongside source files
```

### Frontend (✅ Complete)
- **Framework**: Jest with Next.js integration
- **Component Testing**: React Testing Library
- **Mocking**: MSW (to be configured)
- **Config**: `frontend/jest.config.js`
- **Setup**: `frontend/jest.setup.js`
- **Example Test**: `frontend/src/lib/utils.test.ts` ✅ PASSING

**Directory Structure:**
```
frontend/
├── jest.config.js
├── jest.setup.js
├── tests/
│   ├── mocks/           # MSW handlers (to be added)
│   ├── fixtures/        # Test data (to be added)
│   └── e2e/             # Playwright tests (to be added)
└── src/
    └── **/*.test.ts(x)  # Unit/component tests alongside source files
```

## Running Tests

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run specific test
npm test -- authService

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run specific test
npm test -- utils

# Watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui      # Interactive UI
npm run test:e2e:debug   # Debug mode
```

## Test Environment Configuration

### Backend Environment Variables
Tests use environment variables from `backend/tests/setup.js`:
```bash
# Automatically set in tests:
SMARTMENA_DISABLE_WORKERS=1        # Disable background workers
NODE_ENV=test                      # Test environment
META_OAUTH_ENABLED=false           # Disable OAuth in tests
ML_SERVICE_URL=http://localhost:8001  # Mock ML service

# TODO: Configure test database
SUPABASE_TEST_URL=...              # Test Supabase instance
SUPABASE_TEST_KEY=...              # Test service role key
```

### Frontend Mocks
Configured in `frontend/jest.setup.js`:
- ✅ `window.matchMedia` (for Radix UI)
- ✅ `IntersectionObserver` (for lazy loading)
- ✅ `localStorage` (mocked storage)
- ✅ `next/navigation` (router, searchParams, pathname)

## Coverage Targets

| Layer | Target | Current Status |
|-------|--------|----------------|
| Backend Services | 70% | 🚧 In Progress |
| Backend Validators | 90% | 🚧 To Be Written |
| Backend Workers | 80% | 🚧 To Be Written |
| Frontend API Utils | 80% | 🚧 To Be Written |
| Frontend UI Components | 50% | 🚧 In Progress |
| Frontend Pages | 40% | 🚧 To Be Written |
| **Overall** | **60-65%** | **🚧 In Progress** |

## Next Steps

### Phase 1: Critical Backend Tests (Priority)
1. **Validators** (18 tests):
   - `authValidator.test.js`
   - `campaignValidator.test.js`
   - `scheduledPostValidator.test.js`
   - Plus 15 more validator files

2. **Core Services** (7 tests):
   - `tokenCrypto.test.js` (SECURITY CRITICAL)
   - `workspaceContext.test.js` (SECURITY CRITICAL)
   - `mlClient.test.js`
   - `scheduledPostService.test.js`
   - `metaOAuthService.test.js`
   - `syncService.test.js`
   - `advisorChatService.test.js`

3. **Integration Tests** (5 tests):
   - `auth.integration.test.js`
   - `oauth.integration.test.js`
   - `scheduledPosts.integration.test.js`
   - `analytics.integration.test.js`
   - `ml.integration.test.js`

### Phase 2: Frontend Tests
1. **API Layer** (10 tests):
   - `lib/api/auth.test.ts`
   - `lib/api/workspaces.test.ts`
   - `lib/api/campaigns.test.ts`
   - Plus 7 more API modules

2. **Critical Components** (5 tests):
   - `app/login/page.test.tsx`
   - `app/register/page.test.tsx`
   - `app/onboarding/page.test.tsx`
   - `app/connections/page.test.tsx`
   - `app/page.test.tsx` (Dashboard)

### Phase 3: E2E Tests (Playwright)
1. Configure Playwright
2. Write 12 critical flow tests:
   - Auth flow
   - Onboarding (5 steps)
   - Social account connection
   - Post scheduling
   - Campaign management
   - Report sharing
   - i18n/RTL testing
   - Critical end-to-end journey

## Test Writing Guidelines

### Backend Test Pattern
```javascript
describe('serviceName', () => {
  describe('methodName', () => {
    it('should handle expected behavior', () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = service.method(input);
      
      // Assert
      expect(result).toBeDefined();
    });

    it('should handle error cases', () => {
      // Test error scenarios
    });
  });
});
```

### Frontend Test Pattern
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  it('should render with props', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('value')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<Component />);
    
    await user.click(screen.getByRole('button'));
    
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
```

### Integration Test Pattern (Backend)
```javascript
const request = require('supertest');
const app = require('../src/app');

describe('POST /api/auth/login', () => {
  it('should return token on valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('token');
  });
});
```

## Troubleshooting

### Backend Tests
**Issue**: `SyntaxError: Cannot use import statement`
- **Fix**: Use CommonJS (`require/module.exports`) in test files, not ESM (`import/export`)

**Issue**: Workers running during tests
- **Fix**: Set `SMARTMENA_DISABLE_WORKERS=1` in `tests/setup.js`

**Issue**: Database connection errors
- **Fix**: Update `SUPABASE_TEST_URL` and `SUPABASE_TEST_KEY` in `tests/setup.js`

### Frontend Tests
**Issue**: `window.matchMedia is not a function`
- **Fix**: Already mocked in `jest.setup.js`

**Issue**: `useRouter is not defined`
- **Fix**: Already mocked in `jest.setup.js`

**Issue**: Module resolution errors
- **Fix**: Check `moduleNameMapper` in `jest.config.js` matches your imports

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing/jest)

## Test Plan Document

For the full testing strategy and implementation plan, see:
- [Test Automation Plan](C:\Users\ghadi\.claude\plans\ok-now-i-want-snug-leaf.md)

---

**Status**: ✅ Infrastructure Complete | 🚧 Tests In Progress
**Last Updated**: 2026-05-30
