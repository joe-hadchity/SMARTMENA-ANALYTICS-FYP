# Test Cases: OAuth & Social Account Connections

**Module**: OAuth / Social Account Management
**Priority**: Critical
**Last Updated**: 2026-05-30

---

## Test Case Summary

| Test Case ID | Test Case Title | Steps | Risk | Expected Result | Status | Automation File |
|--------------|----------------|-------|------|-----------------|--------|-----------------|
| TC-OAUTH-001 | Initialize Meta OAuth Flow | 1. Login to SmartMENA<br>2. Navigate to /connections<br>3. Click "Connect Instagram"<br>4. Observe redirect URL | **HIGH** - Core integration | Redirected to Facebook OAuth dialog<br>oauth_state saved in DB<br>Correct scope requested (instagram_basic, pages_read_engagement)<br>Redirect URI includes workspace context | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |
| TC-OAUTH-002 | Meta OAuth Callback Success | 1. Complete OAuth authorization on Facebook<br>2. User grants permissions<br>3. Facebook redirects to callback URL<br>4. Backend processes callback | **CRITICAL** - Security & Data | Access token received from Meta<br>Token encrypted with AES-256-GCM<br>Stored in oauth_connections table<br>Pages and IG accounts synced<br>Redirect to /connections with success message | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js`<br>`backend/src/services/oauth/tokenCrypto.test.js` |
| TC-OAUTH-003 | Meta OAuth Callback with Denied Permissions | 1. Start OAuth flow<br>2. User clicks "Cancel" on Facebook dialog<br>3. Facebook redirects with error<br>4. Backend handles error | **MEDIUM** | Error parameter in callback URL<br>User shown: "Permission denied"<br>No connection created<br>Redirect to /connections?oauth=meta&status=error | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |
| TC-OAUTH-004 | OAuth State CSRF Protection | 1. Start OAuth flow (state1 generated)<br>2. Manually craft callback with different state (state2)<br>3. Send crafted request to callback<br>4. Observe rejection | **CRITICAL** - Security | Request rejected<br>Error: "Invalid OAuth state"<br>Status: 400<br>No connection created<br>CSRF attack prevented | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |
| TC-OAUTH-005 | OAuth Token Encryption | 1. Receive access token from Meta<br>2. Encrypt token with AES-256-GCM<br>3. Store encrypted token in DB<br>4. Verify encryption | **CRITICAL** - Security | Token encrypted with 12-byte IV<br>16-byte auth tag attached<br>Version byte 0x01 prepended<br>Stored as PostgreSQL bytea (\\x...)<br>Plaintext token never in DB | ✅ Passing | `backend/src/services/oauth/tokenCrypto.test.js` |
| TC-OAUTH-006 | OAuth Token Decryption | 1. Retrieve encrypted token from DB<br>2. Decrypt token<br>3. Use token for Meta API call<br>4. Verify successful decryption | **CRITICAL** - Security | Token decrypted successfully<br>Auth tag validated<br>Original plaintext recovered<br>Meta API call succeeds | ✅ Passing | `backend/src/services/oauth/tokenCrypto.test.js` |
| TC-OAUTH-007 | Token Tampering Detection | 1. Retrieve encrypted token<br>2. Modify ciphertext bytes<br>3. Attempt to decrypt<br>4. Observe rejection | **CRITICAL** - Security | Decryption throws error<br>Error: "Unsupported state or incorrect secret key"<br>Auth tag validation fails<br>Tampered token rejected | ✅ Passing | `backend/src/services/oauth/tokenCrypto.test.js` |
| TC-OAUTH-008 | Sync Pages and Instagram Accounts | 1. Complete OAuth connection<br>2. Backend calls Meta Graph API /me/accounts<br>3. For each Page, get connected Instagram account<br>4. Store accounts in social_accounts | **HIGH** - Core functionality | All Pages retrieved<br>Instagram Business accounts discovered<br>Accounts saved with: platform, external_account_id, display_name, profile_picture_url<br>last_synced_at timestamp set | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |
| TC-OAUTH-009 | Manual Account Sync | 1. User has connected account<br>2. Navigate to /connections<br>3. Click "Sync Now" on account<br>4. Backend re-fetches account data | **MEDIUM** | API call to GET /api/social-accounts/:id/sync<br>Latest posts fetched (last 30 days)<br>Metrics updated<br>last_synced_at updated<br>Success message shown | ⏳ To Do | `backend/tests/integration/socialAccounts.integration.test.js` |
| TC-OAUTH-010 | Disconnect Social Account | 1. User has connected account<br>2. Click "Disconnect" button<br>3. Confirm in modal<br>4. Backend revokes connection | **MEDIUM** | Confirmation modal shown<br>API call to DELETE /api/oauth/meta/connection/:id<br>oauth_connection marked as revoked<br>social_accounts entries remain (historical data)<br>Cannot fetch new data | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |
| TC-OAUTH-011 | OAuth Connection Status Check | 1. Call GET /api/oauth/meta/status<br>2. Backend checks active connections<br>3. Returns connection details | **MEDIUM** | Response includes: connected (bool), scopes granted, pages count, IG accounts count<br>Warnings if scopes missing<br>Status: 200 | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |
| TC-OAUTH-012 | OAuth Token Expiration Handling | 1. Access token expires (60 days default)<br>2. Backend attempts API call with expired token<br>3. Meta returns 190 error<br>4. System handles gracefully | **HIGH** - Reliability | Error detected: "Access token expired"<br>User notified: "Please reconnect your account"<br>Connection marked as expired<br>Re-authorization required | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |
| TC-OAUTH-013 | Mock Account Connection (Demo Mode) | 1. Navigate to /connections<br>2. META_OAUTH_ENABLED=false<br>3. Click "Connect Instagram"<br>4. Fill mock account form | **LOW** | Mock connection form shown<br>User enters: handle, display name<br>Account created without real OAuth<br>Used for demo/testing | ⏳ To Do | `backend/tests/integration/socialAccounts.integration.test.js` |
| TC-OAUTH-014 | Multiple Account Connections | 1. Connect first Instagram account<br>2. Connect second Instagram account<br>3. Connect Facebook Page<br>4. View all in /connections | **MEDIUM** | Multiple accounts shown<br>Each with platform badge (Instagram/Facebook)<br>Independent sync buttons<br>Workspace can have many accounts | ⏳ To Do | `frontend/tests/e2e/connections.spec.ts` |
| TC-OAUTH-015 | OAuth Scope Validation | 1. Complete OAuth with partial scopes<br>2. Call GET /api/oauth/meta/diagnostics<br>3. Check granted vs required scopes | **HIGH** - Feature completeness | Response lists: granted scopes, missing scopes<br>Warnings for missing critical scopes<br>Recommendations shown to user<br>Partial functionality available | ⏳ To Do | `backend/tests/integration/oauth.integration.test.js` |

---

## Test Coverage Summary

- **Total Test Cases**: 15
- **Status**:
  - ✅ Passing: 3 (20%) - Token encryption tests
  - ⏳ To Do: 12 (80%)
- **Risk Level**:
  - CRITICAL: 4 (Token security, CSRF)
  - HIGH: 5
  - MEDIUM: 5
  - LOW: 1

---

## Automation Files

### Backend Unit Tests
- `backend/src/services/oauth/tokenCrypto.test.js` - ✅ Token encryption (21/21 passing)
- `backend/src/services/oauth/metaOAuthService.test.js` - To be created

### Backend Integration Tests
- `backend/tests/integration/oauth.integration.test.js` - To be created
- `backend/tests/integration/socialAccounts.integration.test.js` - To be created

### Frontend E2E Tests
- `frontend/tests/e2e/connections.spec.ts` - To be created

---

## Dependencies

- Meta Graph API v19
- TOKEN_ENCRYPTION_KEY environment variable
- META_APP_ID and META_APP_SECRET
- Supabase tables: oauth_connections, oauth_states, social_accounts
- Crypto module (Node.js) for AES-256-GCM

---

## Notes

- **Encryption**: All OAuth tokens encrypted at rest using AES-256-GCM
- **CSRF Protection**: oauth_state parameter prevents cross-site request forgery
- **Token Expiration**: Meta long-lived tokens expire after 60 days
- **Mock Mode**: System works without real OAuth (META_OAUTH_ENABLED=false) for testing
- **Multi-Account**: Users can connect multiple Instagram and Facebook accounts to one workspace
