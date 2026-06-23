/**
 * Global test setup for Jest
 * Runs once before all test suites
 */

// Disable workers during tests to avoid background processes
process.env.SMARTMENA_DISABLE_WORKERS = '1';
process.env.NODE_ENV = 'test';

// Test database configuration
// TODO: Update these with actual test Supabase credentials
process.env.SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_KEY || 'test-key';

// Disable real external services
process.env.META_OAUTH_ENABLED = 'false';
process.env.ML_SERVICE_URL = 'http://localhost:8001'; // Mock ML service

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress expected error logs in tests
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    // Allow through critical errors, suppress expected test errors
    if (!message.includes('Expected') && !message.includes('Test')) {
      originalConsoleError(...args);
    }
  };

  console.warn = (...args) => {
    // Suppress peer dependency warnings
    const message = args[0]?.toString() || '';
    if (!message.includes('peer') && !message.includes('deprecated')) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Cleanup between test suites
afterEach(() => {
  // Clear any timers
  jest.clearAllTimers();
});
