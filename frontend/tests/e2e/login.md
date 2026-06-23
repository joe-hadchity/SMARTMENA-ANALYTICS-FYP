# Login Flow — Test Cases

## TC-01: Valid credentials → redirect to dashboard

**Steps:**
1. Navigate to `/login`
2. Enter email `born2hike@smartmena.local`
3. Enter password `Born2Hike2026!`
4. Click **Sign in**

**Expected:** Redirected to `/` (dashboard), sidebar is visible.

---

## TC-02: Wrong password → error toast

**Steps:**
1. Navigate to `/login`
2. Enter email `born2hike@smartmena.local`
3. Enter password `wrongpassword`
4. Click **Sign in**

**Expected:** Stay on `/login`, error toast appears, no redirect.

---

## TC-03: Empty fields → form does not submit

**Steps:**
1. Navigate to `/login`
2. Leave email and password blank
3. Click **Sign in**

**Expected:** Form validation blocks submission, no network request fired.

---

## TC-04: Fill demo account button

**Steps:**
1. Navigate to `/login`
2. Click **Fill demo account**

**Expected:** Email field shows `born2hike@smartmena.local`, password field is filled.

---

## TC-05: Already authenticated → skip login

**Steps:**
1. Log in successfully (TC-01)
2. Navigate to `/login` again

**Expected:** Redirected away from `/login` to `/` without showing the login form.

---

## TC-06: Sign out → back to login

**Steps:**
1. Log in successfully (TC-01)
2. Click the user avatar in the sidebar footer
3. Click **Sign out**

**Expected:** Redirected to `/login`, session is cleared, protected routes redirect back to login.
