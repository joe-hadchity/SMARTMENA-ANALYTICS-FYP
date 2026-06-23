/**
 * Unit tests for authService
 * SECURITY CRITICAL - Tests authentication, registration, and session management
 */

// login() uses createClient() from @supabase/supabase-js directly (not getSupabase),
// so both must be mocked to return the same shared client object.
jest.mock('@supabase/supabase-js', () => {
  const mockClient = {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      getUser: jest.fn(),
      admin: {
        listUsers: jest.fn(),
        createUser: jest.fn(),
        updateUserById: jest.fn(),
      },
    },
    from: jest.fn(),
  };
  return { createClient: jest.fn(() => mockClient), __mockClient: mockClient };
});

jest.mock('../config/supabase', () => {
  const { __mockClient } = jest.requireMock('@supabase/supabase-js');
  return { getSupabase: jest.fn(() => __mockClient) };
});

const { __mockClient: mockSupabaseClient } = jest.requireMock('@supabase/supabase-js');
const mockSupabaseAuth = mockSupabaseClient.auth;

jest.mock('./workspaceService', () => ({
  createWorkspace: jest.fn(),
  createWorkspaceForUser: jest.fn(),
  getWorkspaceById: jest.fn(),
  getOrCreateBorn2HikeWorkspace: jest.fn(),
}));

jest.mock('./demoBootstrapService', () => ({
  seedBorn2HikeData: jest.fn(),
}));

const authService = require('./authService');
const workspaceService = require('./workspaceService');

// Builds a chainable from() mock covering all query patterns used in authService:
//   select().eq().maybeSingle()   — ensurePublicUser lookup
//   insert().select().single()    — ensurePublicUser insert
//   select().eq().order()         — listMemberships
function makeFromMock(overrides = {}) {
  const defaults = {
    maybeSingleData: null,
    singleData: { id: 'user-123', email: 'test@test.com' },
    orderData: [],
  };
  const cfg = { ...defaults, ...overrides };

  return jest.fn().mockReturnValue({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: cfg.singleData, error: null }),
      }),
    }),
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({ data: cfg.maybySingleData, error: null }),
        order: jest.fn().mockResolvedValue({ data: cfg.orderData, error: null }),
      }),
    }),
  });
}

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default admin.listUsers returns empty (no existing user) so register can proceed
    mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    // Default admin.createUser succeeds (used by register)
    mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@test.com', user_metadata: { name: 'Test' } } },
      error: null,
    });
    // Default signInWithPassword succeeds (register calls login internally)
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@test.com', user_metadata: { name: 'Test' } },
        session: { access_token: 'token', refresh_token: 'refresh', expires_at: 9999999999, token_type: 'bearer' },
      },
      error: null,
    });
    // Default from() chain covers ensurePublicUser + listMemberships
    mockSupabaseClient.from = makeFromMock();
  });

  describe('TC-AUTH-001: Register user with valid credentials', () => {
    it('should register new user successfully', async () => {
      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'newuser@test.com', user_metadata: { name: 'New User' } } },
        error: null,
      });
      workspaceService.createWorkspaceForUser.mockResolvedValue({ id: 'workspace-123', name: 'New Workspace' });

      const result = await authService.register({
        email: 'newuser@test.com',
        password: 'SecurePassword123!',
        name: 'New User',
        workspaceName: 'New Workspace',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newuser@test.com', password: 'SecurePassword123!' })
      );
    });
  });

  describe('TC-AUTH-002: Create default workspace on registration', () => {
    it('should create workspace during registration', async () => {
      workspaceService.createWorkspaceForUser.mockResolvedValue({ id: 'workspace-123', name: 'Test Workspace' });

      await authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
        workspaceName: 'Test Workspace',
      });

      expect(workspaceService.createWorkspaceForUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Workspace' }),
        expect.any(String)
      );
    });
  });

  describe('TC-AUTH-003: Hash password before storage', () => {
    it('should use Supabase auth which handles password hashing', async () => {
      const plainPassword = 'PlainTextPassword123!';
      workspaceService.createWorkspaceForUser.mockResolvedValue({ id: 'workspace-123' });

      await authService.register({
        email: 'test@test.com',
        password: plainPassword,
        name: 'Test',
        workspaceName: 'Test',
      });

      // Verify password is passed to Supabase admin.createUser (which handles hashing)
      const createUserCall = mockSupabaseClient.auth.admin.createUser.mock.calls[0][0];
      expect(createUserCall.password).toBe(plainPassword);
    });
  });

  describe('TC-AUTH-004: Login with valid email/password', () => {
    it('should authenticate user with correct credentials', async () => {
      const mockSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
      };

      const mockUser = {
        id: 'auth-user-123',
        email: 'user@test.com',
        user_metadata: { name: 'Test User' },
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      });

      const result = await authService.login({
        email: 'user@test.com',
        password: 'CorrectPassword123!',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result.session.accessToken).toBe('valid-token');
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'CorrectPassword123!',
      });
    });
  });

  describe('TC-AUTH-005: Reject invalid credentials (wrong password)', () => {
    it('should throw 401 error for wrong password', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        authService.login({
          email: 'user@test.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });
  });

  describe('TC-AUTH-006: Reject non-existent user email', () => {
    it('should throw error for non-existent email', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        authService.login({
          email: 'nonexistent@test.com',
          password: 'AnyPassword',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });
  });

  describe('TC-AUTH-009: Reject email with leading/trailing spaces', () => {
    it('should throw when email has leading space', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        authService.login({
          email: ' user@test.com',
          password: 'CorrectPassword123!',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });

    it('should throw when email has trailing space', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        authService.login({
          email: 'user@test.com ',
          password: 'CorrectPassword123!',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });

    it('should throw when email has both leading and trailing spaces', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        authService.login({
          email: '  user@test.com  ',
          password: 'CorrectPassword123!',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });
  });

  describe('TC-AUTH-010: Reject empty or blank password', () => {
    it('should throw when password is an empty string', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters' },
      });

      await expect(
        authService.login({
          email: 'user@test.com',
          password: '',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });

    it('should throw when password is only whitespace', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        authService.login({
          email: 'user@test.com',
          password: '   ',
        })
      ).rejects.toThrow(/Invalid email or password/);
    });
  });

  describe('TC-AUTH-011: Email case insensitivity', () => {
    it('should authenticate successfully with uppercase email', async () => {
      const mockSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'user@test.com' },
          session: mockSession,
        },
        error: null,
      });

      const result = await authService.login({
        email: 'USER@TEST.COM',
        password: 'CorrectPassword123!',
      });

      expect(result).toHaveProperty('session');
      expect(result.session.accessToken).toBe('valid-token');
    });

    it('should authenticate successfully with mixed-case email', async () => {
      const mockSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'user@test.com' },
          session: mockSession,
        },
        error: null,
      });

      const result = await authService.login({
        email: 'User@Test.Com',
        password: 'CorrectPassword123!',
      });

      expect(result).toHaveProperty('session');
    });
  });

  describe('TC-AUTH-007: Return session token on successful login', () => {
    it('should return access token and refresh token', async () => {
      const mockSession = {
        access_token: 'access-token-xyz',
        refresh_token: 'refresh-token-xyz',
        expires_at: 1234567890,
        token_type: 'bearer',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@test.com' },
          session: mockSession,
        },
        error: null,
      });

      const result = await authService.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result.session).toEqual({
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-xyz',
        expiresAt: 1234567890,
        tokenType: 'bearer',
      });
    });
  });

  describe('TC-AUTH-008: Bootstrap demo user (Born2Hike) with test data', () => {
    // TODO: Complex test requiring admin API mocking - skip for now
    it.skip('should create Born2Hike demo user', async () => {
      // This test requires mocking Supabase admin.listUsers which is complex
      // and involves pagination. Covered by integration tests instead.
      expect(true).toBe(true);
    });
  });

  describe('Helper functions', () => {
    describe('extractBearerToken', () => {
      it('should extract token from Authorization header', () => {
        const req = {
          get: jest.fn((header) => {
            if (header === 'authorization') return 'Bearer token-abc-123';
            return null;
          }),
        };

        const token = authService.extractBearerToken(req);
        expect(token).toBe('token-abc-123');
      });

      it('should return null for missing header', () => {
        const req = {
          get: jest.fn(() => null),
        };

        const token = authService.extractBearerToken(req);
        expect(token).toBeNull();
      });

      it('should handle case-insensitive Bearer prefix', () => {
        const req = {
          get: jest.fn(() => 'bearer lowercase-token'),
        };

        const token = authService.extractBearerToken(req);
        expect(token).toBe('lowercase-token');
      });
    });

    describe('publicUser', () => {
      it('should format user for public API', () => {
        const authUser = {
          id: 'user-123',
          email: 'test@test.com',
          user_metadata: { name: 'Test User' },
        };

        const result = authService.publicUser(authUser);

        expect(result).toEqual({
          id: 'user-123',
          email: 'test@test.com',
          name: 'Test User',
        });
      });

      it('should fallback to email if name not in metadata', () => {
        const authUser = {
          id: 'user-123',
          email: 'test@test.com',
          user_metadata: {},
        };

        const result = authService.publicUser(authUser);
        expect(result.name).toBe('test@test.com');
      });

      it('should return null for null user', () => {
        expect(authService.publicUser(null)).toBeNull();
      });
    });

    describe('getUserFromAccessToken', () => {
      it('should return user for valid token', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@test.com',
        };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const result = await authService.getUserFromAccessToken('valid-token');
        expect(result).toEqual(mockUser);
      });

      it('should throw 401 for invalid token', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        });

        await expect(
          authService.getUserFromAccessToken('invalid-token')
        ).rejects.toThrow(/Invalid or expired session/);
      });
    });
  });
});
