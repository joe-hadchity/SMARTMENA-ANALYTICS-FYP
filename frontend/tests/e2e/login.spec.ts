import { test, expect } from '@playwright/test';

const DEMO_EMAIL = 'born2hike@smartmena.local';
const DEMO_PASSWORD = 'Born2Hike2026!';
const BASE = 'http://localhost:3000';

test.describe('Login flow', () => {

  // TC-01: Valid credentials → redirect to dashboard
  test('TC-01: valid credentials redirect to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL(`${BASE}/`, { timeout: 10_000 });
    await expect(page).toHaveURL(`${BASE}/`);
    await expect(page.locator('aside')).toBeVisible();
  });

  // TC-02: Wrong password → error toast, no redirect
  test('TC-02: wrong password shows error toast', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Still on login page
    await expect(page).toHaveURL(`${BASE}/login`);
    // Toast with an error message appears
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5_000 });
  });

  // TC-03: Empty fields → browser validation blocks submit
  test('TC-03: empty fields block submission', async ({ page }) => {
    await page.goto(`${BASE}/login`);

    let requestFired = false;
    page.on('request', (req) => {
      if (req.url().includes('/auth')) requestFired = true;
    });

    await page.getByRole('button', { name: 'Sign in' }).click();

    // Form should not have submitted — still on login page
    await expect(page).toHaveURL(`${BASE}/login`);
    expect(requestFired).toBe(false);
  });

  // TC-04: Fill demo account button populates fields
  test('TC-04: fill demo account populates fields', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByRole('button', { name: 'Fill demo account' }).click();

    await expect(page.getByLabel('Email')).toHaveValue(DEMO_EMAIL);
    // Password field should be non-empty
    const passwordValue = await page.getByLabel('Password').inputValue();
    expect(passwordValue.length).toBeGreaterThan(0);
  });

  // TC-05: Already authenticated → redirect away from /login
  test('TC-05: authenticated user is redirected away from /login', async ({ page }) => {
    // Log in first
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 });

    // Now try to visit /login again
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(1_500);

    // Should be redirected away
    await expect(page).not.toHaveURL(`${BASE}/login`);
  });

  // TC-06: Sign out clears session and returns to /login
  test('TC-06: sign out redirects to login', async ({ page }) => {
    // Log in
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 10_000 });

    // Open user menu in sidebar footer and sign out
    await page.locator('aside').getByRole('button').last().click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();

    await page.waitForURL(`${BASE}/login`, { timeout: 8_000 });
    await expect(page).toHaveURL(`${BASE}/login`);

    // Confirm session is gone — going to / redirects back to login
    await page.goto(`${BASE}/`);
    await page.waitForURL(`${BASE}/login`, { timeout: 5_000 });
    await expect(page).toHaveURL(`${BASE}/login`);
  });

});
