# Live Production Auth API Tests (Zivolf)

This document provides copy-paste-ready testing for production auth APIs:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

Base URL:

```txt
https://api.zivolf.com
```

---

## Recommended Test Order

Run in this order for clean end-to-end validation:

1. `register`
2. `me`
3. `logout`
4. `login`
5. `me`
6. `forgot-password`
7. `reset-password` (with token from reset link)

---

## 1) Browser DevTools Console Script

Open browser DevTools Console and paste:

```js
(async () => {
  const BASE = "https://api.zivolf.com";

  // unique email for register testing
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const testUser = {
    email: `zivolf.test.${unique}@example.com`,
    password: "StrongPass@123",
    full_name: "Zivolf QA User"
  };

  const print = (title, res, data) => {
    console.log(`\n=== ${title} ===`);
    console.log("status:", res.status, "ok:", res.ok);
    console.log(data);
  };

  async function hit(path, method = "GET", body) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include", // required for cookie auth
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { raw: await res.text() };
    }
    return { res, data };
  }

  // 1) register
  const reg = await hit("/api/v1/auth/register", "POST", testUser);
  print("REGISTER", reg.res, reg.data);

  // 2) me
  const me1 = await hit("/api/v1/auth/me", "GET");
  print("ME after register", me1.res, me1.data);

  // 3) logout
  const logout = await hit("/api/v1/auth/logout", "POST", {});
  print("LOGOUT", logout.res, logout.data);

  // 4) login
  const login = await hit("/api/v1/auth/login", "POST", {
    email: testUser.email,
    password: testUser.password,
  });
  print("LOGIN", login.res, login.data);

  // 5) me
  const me2 = await hit("/api/v1/auth/me", "GET");
  print("ME after login", me2.res, me2.data);

  // 6) forgot-password
  const forgot = await hit("/api/v1/auth/forgot-password", "POST", {
    email: testUser.email,
  });
  print("FORGOT PASSWORD", forgot.res, forgot.data);

  // 7) reset-password
  // Use token from forgot-password response reset_url or from email link
  const resetToken = "PASTE_RESET_TOKEN_HERE";
  const newPassword = "NewStrongPass@456";

  if (resetToken !== "PASTE_RESET_TOKEN_HERE") {
    const reset = await hit("/api/v1/auth/reset-password", "POST", {
      token: resetToken,
      new_password: newPassword,
    });
    print("RESET PASSWORD", reset.res, reset.data);

    const loginNew = await hit("/api/v1/auth/login", "POST", {
      email: testUser.email,
      password: newPassword,
    });
    print("LOGIN with new password", loginNew.res, loginNew.data);
  } else {
    console.log("\n[SKIPPED RESET] Set resetToken first.");
  }

  console.log("\nTest user:", testUser);
})();
```

---

## 2) cURL Commands (Terminal)

### Setup variables

```bash
UNIQ=$(date +%s)
EMAIL="zivolf.test.${UNIQ}@example.com"
PASS="StrongPass@123"
NEWPASS="NewStrongPass@456"
BASE="https://api.zivolf.com"
COOKIE_FILE="/tmp/zivolf_auth_cookie.txt"
```

### 1. Register

```bash
curl -i -sS -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"full_name\":\"Zivolf QA User\"}"
```

### 2. Me

```bash
curl -i -sS -X GET "$BASE/api/v1/auth/me" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE"
```

### 3. Logout

```bash
curl -i -sS -X POST "$BASE/api/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" -c "$COOKIE_FILE"
```

### 4. Login

```bash
curl -i -sS -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
```

### 5. Forgot Password

```bash
curl -i -sS -X POST "$BASE/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}"
```

### 6. Reset Password

```bash
RESET_TOKEN="PASTE_TOKEN_HERE"

curl -i -sS -X POST "$BASE/api/v1/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$RESET_TOKEN\",\"new_password\":\"$NEWPASS\"}"
```

### Optional verification (login with new password)

```bash
curl -i -sS -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$NEWPASS\"}"
```

---

## 3) Postman Setup

Create collection: `Zivolf Auth Live`

Collection variables:

- `baseUrl` = `https://api.zivolf.com`
- `unique` = `{{$timestamp}}`
- `testEmail` = `zivolf.test.{{unique}}@example.com`
- `password` = `StrongPass@123`
- `newPassword` = `NewStrongPass@456`
- `fullName` = `Zivolf QA User`
- `registeredEmail` = *(blank initially)*
- `resetToken` = *(blank initially)*

> Keep Postman cookie jar enabled.

### Request 1: Register

- **POST** `{{baseUrl}}/api/v1/auth/register`
- Body (raw JSON):

```json
{
  "email": "{{testEmail}}",
  "password": "{{password}}",
  "full_name": "{{fullName}}"
}
```

Tests tab:

```js
pm.test("register success", function () {
  pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

const json = pm.response.json();
if (json?.user?.email) {
  pm.collectionVariables.set("registeredEmail", json.user.email);
}
```

### Request 2: Login

- **POST** `{{baseUrl}}/api/v1/auth/login`
- Body:

```json
{
  "email": "{{registeredEmail}}",
  "password": "{{password}}"
}
```

### Request 3: Me

- **GET** `{{baseUrl}}/api/v1/auth/me`
- No body

### Request 4: Logout

- **POST** `{{baseUrl}}/api/v1/auth/logout`
- No body (or empty JSON)

### Request 5: Forgot Password

- **POST** `{{baseUrl}}/api/v1/auth/forgot-password`
- Body:

```json
{
  "email": "{{registeredEmail}}"
}
```

Tests tab (extract token from `reset_url` when present):

```js
const json = pm.response.json();
if (json.reset_url) {
  const match = json.reset_url.match(/[?&]token=([^&]+)/);
  if (match) {
    pm.collectionVariables.set("resetToken", decodeURIComponent(match[1]));
  }
}
```

### Request 6: Reset Password

- **POST** `{{baseUrl}}/api/v1/auth/reset-password`
- Body:

```json
{
  "token": "{{resetToken}}",
  "new_password": "{{newPassword}}"
}
```

---

## Expected Success & Common Failure

### `POST /register`
- Success: `200/201`, message similar to `Registration successful`, user object, cookie set.
- Failure: `400` `{ "detail": "Email already registered" }`

### `POST /login`
- Success: `200`, message `Login successful`, user object, cookie set.
- Failure: `401` `{ "detail": "Invalid email or password" }`

### `GET /me`
- Success: `200`, returns authenticated user.
- Failure: `401` when cookie missing/expired/not sent.

### `POST /logout`
- Success: `200`, `{ "message": "Logged out successfully" }`, cookie cleared.

### `POST /forgot-password`
- Success: generic message (account existence not disclosed).
- Failure: `422` for invalid email/body format.

### `POST /reset-password`
- Success: `200`, `{ "message": "Password has been reset successfully" }`
- Failure: `400`, `{ "detail": "Invalid or expired reset token" }`

---

## Cookie Verification

### Browser
1. Network tab → open `register` or `login` request.
2. Verify `Set-Cookie` in response headers.
3. Application/Storage → Cookies → check domain `api.zivolf.com`.
4. Call `/me` with `credentials: 'include'` and confirm `200`.

### Postman
- Click **Cookies** and inspect cookies for `api.zivolf.com` after login/register.
- `/me` should work without Bearer token if cookie is present.

### cURL
- `-c` stores cookie, `-b` sends cookie.
- Check cookie file:

```bash
cat /tmp/zivolf_auth_cookie.txt
```

---

## Frontend vs Backend Issue Isolation

1. Test same endpoint/body in **curl** or **Postman**.
2. If curl/Postman succeed but browser fails → likely frontend issue (`credentials`, CORS, wrong URL/body, cookie policy).
3. If all clients fail with same status/detail → likely backend/API issue.
4. Compare request details across tools:
   - URL
   - method
   - headers
   - body JSON
   - cookie sent/received
   - response code + payload
