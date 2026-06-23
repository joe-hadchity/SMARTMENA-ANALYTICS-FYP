import { test, expect, Page } from '@playwright/test';

/**
 * TC-005: Campaign Creation Flow - E2E Tests
 *
 * Tests the complete campaign creation workflow from navigation to database persistence.
 *
 * Prerequisites:
 * - Backend running on http://localhost:4000
 * - Frontend running on http://localhost:3000
 * - Test user credentials available
 * - Demo workspace (Born2Hike) seeded
 */

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000/api';

// Test data
const TEST_USER = {
  email: 'demo@born2hike.com',
  password: 'demo123456',
};

const TEST_CAMPAIGN = {
  name: 'Summer Sale 2026',
  platform: 'instagram',
  budget: 500,
  start_date: '2026-06-15',
  end_date: '2026-06-30',
};

// Helper: Login and get workspace ID
async function loginAndGetWorkspace(page: Page): Promise<string> {
  await page.goto(`${BASE_URL}/login`);

  // Fill login form
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

  // Get workspace ID from localStorage
  const workspaceId = await page.evaluate(() => {
    return localStorage.getItem('smartmena.workspaceId') || '';
  });

  expect(workspaceId).toBeTruthy();
  return workspaceId;
}

// Helper: Get auth token
async function getAuthToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    return localStorage.getItem('smartmena.token') || '';
  });

  expect(token).toBeTruthy();
  return token;
}

test.describe('TC-005: Campaign Creation Flow', () => {
  let workspaceId: string;
  let authToken: string;

  // Setup: Login before all tests
  test.beforeEach(async ({ page }: { page: Page }) => {
    workspaceId = await loginAndGetWorkspace(page);
    authToken = await getAuthToken(page);
  });

  /**
   * TC-CAMP-001: Navigate to Campaign Page
   * Risk: MEDIUM
   */
  test('TC-CAMP-001: Should navigate to campaigns page successfully', async ({ page }: { page: Page }) => {
    await page.click('a[href="/campaigns"], button:has-text("Campaigns")');
    await page.waitForURL(`${BASE_URL}/campaigns`, { timeout: 5000 });
    expect(page.url()).toBe(`${BASE_URL}/campaigns`);
    const title = await page.textContent('h1, h2');
    expect(title).toContain('Campaign');
    const campaignList = page.locator('[data-testid="campaign-list"], .campaign-list, main');
    await expect(campaignList).toBeVisible({ timeout: 5000 });
  });
  test('TC-CAMP-002: Should open campaign creation interface', async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/campaigns`);
    await page.waitForLoadState('networkidle');
    const createButton = page.locator(
      'button:has-text("Create Campaign"), button:has-text("New Campaign"), button:has-text("+ Campaign")'
    ).first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await expect(createButton).toBeEnabled();
    await createButton.click();
    const creationInterface = page.locator(
      '[role="dialog"], [data-testid="campaign-form"], .drawer, .modal, [data-testid="advisor-chat"]'
    ).first();

    await expect(creationInterface).toBeVisible({ timeout: 5000 });
  });

  /**
   * TC-CAMP-003, TC-CAMP-004, TC-CAMP-005: Complete Campaign Creation Flow
   * Risk: HIGH (Core functionality)
   */
  test('TC-CAMP-003-004-005: Should create campaign and display in UI', async ({ page }: { page: Page }) => {
    // Navigate to campaigns page
    await page.goto(`${BASE_URL}/campaigns`);
    await page.waitForLoadState('networkidle');

    // Click create button
    const createButton = page.locator(
      'button:has-text("Create Campaign"), button:has-text("New Campaign"), button:has-text("+ Campaign")'
    ).first();
    await createButton.click();

    // TC-CAMP-003: Enter campaign details
    // Note: This depends on whether you use a form or advisor chat

    // Try form-based input first
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Form-based creation
      await nameInput.fill(TEST_CAMPAIGN.name);

      const platformSelect = page.locator('select[name="platform"], [role="combobox"]').first();
      await platformSelect.selectOption(TEST_CAMPAIGN.platform);

      const budgetInput = page.locator('input[name="budget"], input[type="number"]').first();
      await budgetInput.fill(TEST_CAMPAIGN.budget.toString());

      const startDateInput = page.locator('input[name="start_date"], input[name="startDate"]').first();
      await startDateInput.fill(TEST_CAMPAIGN.start_date);

      const endDateInput = page.locator('input[name="end_date"], input[name="endDate"]').first();
      await endDateInput.fill(TEST_CAMPAIGN.end_date);

      // Expected Result: No validation errors
      const errorMessage = page.locator('[role="alert"], .error-message, .text-red-500');
      await expect(errorMessage).not.toBeVisible();

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
      await submitButton.click();
    } else {
      // Chat-based creation
      const chatInput = page.locator('textarea, input[type="text"]').last();
      await chatInput.fill(
        `Create a campaign named "${TEST_CAMPAIGN.name}" for ${TEST_CAMPAIGN.platform} ` +
        `with budget $${TEST_CAMPAIGN.budget} from ${TEST_CAMPAIGN.start_date} to ${TEST_CAMPAIGN.end_date}`
      );

      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').last();
      await sendButton.click();
    }

    // TC-CAMP-004: Expected Result - Loading indicator appears
    const loadingIndicator = page.locator('[role="status"], .loading, .spinner');
    // May be too fast to catch, so we won't assert on this

    // TC-CAMP-004: Expected Result - Success message displayed
    const successMessage = page.locator('text=/created|success|saved/i').first();
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // TC-CAMP-004: Expected Result - Dialog/drawer closes (or navigate away)
    // Wait for the creation interface to close or navigate
    await page.waitForTimeout(1000);

    // TC-CAMP-005: Expected Result - New campaign visible in list
    await page.goto(`${BASE_URL}/campaigns`);
    await page.waitForLoadState('networkidle');

    const campaignCard = page.locator(`text="${TEST_CAMPAIGN.name}"`).first();
    await expect(campaignCard).toBeVisible({ timeout: 5000 });

    // TC-CAMP-005: Expected Result - Campaign card shows correct data
    const campaignContainer = campaignCard.locator('..').locator('..'); // Navigate to parent container

    // Check platform icon (Instagram)
    const platformIcon = campaignContainer.locator('[data-testid="platform-icon"], img, svg');
    await expect(platformIcon).toBeVisible();

    // Check budget displays
    const budgetText = campaignContainer.locator('text=/\\$?500/');
    await expect(budgetText).toBeVisible();

    // TC-CAMP-005: Expected Result - Campaign is clickable
    await expect(campaignCard).toBeEnabled();
  });

  /**
   * TC-CAMP-006: Database Persistence Validation
   * Risk: CRITICAL (Data integrity)
   */
  test('TC-CAMP-006: Should persist campaign data correctly in database', async ({ page, request }: { page: Page; request: any }) => {
    // Step 1: Create campaign via API directly
    const response = await request.post(`${API_URL}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
        'Content-Type': 'application/json',
      },
      data: {
        name: TEST_CAMPAIGN.name + ' - DB Test',
        platform: TEST_CAMPAIGN.platform,
        budget: TEST_CAMPAIGN.budget,
        start_date: TEST_CAMPAIGN.start_date,
        end_date: TEST_CAMPAIGN.end_date,
      },
    });

    // TC-CAMP-004: Expected Result - Success response (200/201)
    expect(response.ok()).toBeTruthy();
    expect([200, 201]).toContain(response.status());

    const responseData = await response.json();

    // TC-CAMP-004: Expected Result - Response contains required fields
    expect(responseData.campaign).toBeDefined();
    expect(responseData.campaign.id).toBeTruthy();
    expect(responseData.campaign.name).toBe(TEST_CAMPAIGN.name + ' - DB Test');
    expect(responseData.campaign.workspace_id).toBe(workspaceId);
    expect(responseData.campaign.created_at).toBeTruthy();

    const campaignId = responseData.campaign.id;

    // Step 2 & 3: Verify data integrity via API (simulating database query)
    const getResponse = await request.get(`${API_URL}/campaigns/${campaignId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });

    expect(getResponse.ok()).toBeTruthy();

    const campaign = await getResponse.json();

    // Expected Result: All fields persisted correctly
    expect(campaign.id).toBeTruthy();
    expect(campaign.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i); // UUID format
    expect(campaign.workspace_id).toBe(workspaceId);
    expect(campaign.name).toBe(TEST_CAMPAIGN.name + ' - DB Test');
    expect(campaign.platform).toBe(TEST_CAMPAIGN.platform);
    expect(campaign.budget).toBe(TEST_CAMPAIGN.budget);
    expect(campaign.start_date).toContain('2026-06-15');
    expect(campaign.end_date).toContain('2026-06-30');
    expect(campaign.created_at).toBeTruthy();
    expect(campaign.updated_at).toBeTruthy();

    // Expected Result: Timestamps are ISO format
    expect(new Date(campaign.created_at).toISOString()).toBeTruthy();
    expect(new Date(campaign.updated_at).toISOString()).toBeTruthy();

    // Cleanup: Delete test campaign
    await request.delete(`${API_URL}/campaigns/${campaignId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
  });

  /**
   * TC-CAMP-009: Missing Required Fields
   * Risk: HIGH
   */
  test('TC-CAMP-009: Should validate required fields', async ({ page, request }: { page: Page; request: any }) => {
    // Attempt to create campaign without required fields
    const response = await request.post(`${API_URL}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
        'Content-Type': 'application/json',
      },
      data: {
        // Missing name and platform
        budget: 100,
      },
    });

    // Expected Result: Validation error
    expect(response.status()).toBe(400);

    const errorData = await response.json();
    expect(errorData.error || errorData.message).toBeTruthy();
  });

  /**
   * TC-CAMP-010: Cross-Workspace Access
   * Risk: CRITICAL (Security)
   */
  test('TC-CAMP-010: Should block cross-workspace campaign creation', async ({ page, request }: { page: Page; request: any }) => {
    // Step 2: Attempt to create campaign with different workspace ID
    const fakeWorkspaceId = '00000000-0000-0000-0000-000000000000';

    const response = await request.post(`${API_URL}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': fakeWorkspaceId, // Different workspace
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Unauthorized Campaign',
        platform: 'instagram',
        budget: 100,
        start_date: '2026-06-01',
        end_date: '2026-06-30',
      },
    });

    // Step 3: Expected Result - 403 Forbidden response
    expect(response.status()).toBe(403);

    // Expected Result - Error message
    const errorData = await response.json();
    expect(errorData.error || errorData.message).toMatch(/unauthorized|forbidden|access/i);

    // Verify campaign was NOT created
    const listResponse = await request.get(`${API_URL}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });

    const campaigns = await listResponse.json();
    const unauthorizedCampaign = campaigns.find((c: any) => c.name === 'Unauthorized Campaign');
    expect(unauthorizedCampaign).toBeUndefined();
  });

  /**
   * TC-CAMP-011: Duplicate Campaign Name
   * Risk: LOW
   */
  test('TC-CAMP-011: Should allow duplicate campaign names', async ({ page, request }: { page: Page; request: any }) => {
    const duplicateName = 'Duplicate Campaign Test';

    // Step 1: Create first campaign
    const response1 = await request.post(`${API_URL}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
        'Content-Type': 'application/json',
      },
      data: {
        name: duplicateName,
        platform: 'instagram',
        budget: 100,
        start_date: '2026-06-01',
        end_date: '2026-06-30',
      },
    });

    expect(response1.ok()).toBeTruthy();
    const campaign1 = await response1.json();

    // Step 2: Create second campaign with same name
    const response2 = await request.post(`${API_URL}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
        'Content-Type': 'application/json',
      },
      data: {
        name: duplicateName,
        platform: 'facebook',
        budget: 200,
        start_date: '2026-07-01',
        end_date: '2026-07-31',
      },
    });

    // Step 3: Expected Result - Campaign created successfully
    expect(response2.ok()).toBeTruthy();
    const campaign2 = await response2.json();

    // Expected Result - Both campaigns exist with same name
    expect(campaign1.campaign.name).toBe(duplicateName);
    expect(campaign2.campaign.name).toBe(duplicateName);

    // Expected Result - Different UUIDs
    expect(campaign1.campaign.id).not.toBe(campaign2.campaign.id);

    // Cleanup
    await request.delete(`${API_URL}/campaigns/${campaign1.campaign.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'x-workspace-id': workspaceId },
    });
    await request.delete(`${API_URL}/campaigns/${campaign2.campaign.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}`, 'x-workspace-id': workspaceId },
    });
  });
});
