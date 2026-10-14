# KMES School — Custom Domain Setup Guide (`kmes.com.np`)

This guide explains how `kmes.com.np` is configured across **Mercantile Communications (register.com.np)**, **Cloudflare DNS**, **Vercel (Frontend)**, and **Render (Backend)**.

---

## Architecture Overview

```
                                      ┌──────────────────────────────────────────────┐
                                      │             Cloudflare DNS Zone              │
                                      │                (kmes.com.np)                 │
                                      └──────────────────────┬───────────────────────┘
                                                             │
                             ┌───────────────────────────────┴───────────────────────────────┐
                             │                                                               │
                             ▼                                                               ▼
                     Apex & WWW Records                                              API Subdomain (Optional)
               kmes.com.np / www.kmes.com.np                                             api.kmes.com.np
                             │                                                               │
                             ▼                                                               ▼
                     ┌───────────────┐                                               ┌───────────────┐
                     │    Vercel     │                                               │    Render     │
                     │  (Frontend)   │                                               │ (Backend API) │
                     │  React SPA    │                                               │ Node/Express  │
                     └───────┬───────┘                                               └───────────────┘
                             │                                                               ▲
                             │                        API Requests                           │
                             └───────────────────────────────────────────────────────────────┘
```

---

## 1. Mercantile Communications (`register.com.np`)

`.np` domains are provided free of cost by Mercantile Communications and require manual document verification (National ID / Citizenship / School Registration).

1. Log in to [register.com.np](https://register.com.np/).
2. Check your domain application status for **`kmes.com.np`**:
   - **Active / Approved**: The domain is live and delegating to your nameservers.
   - **Pending**: Mercantile administrators are reviewing the submitted documents (typically takes 24–48 business hours).
3. Ensure the Name Servers are set to your Cloudflare nameservers (provided on your Cloudflare dashboard overview page):
   - Primary: `<assigned-name>.ns.cloudflare.com`
   - Secondary: `<assigned-name>.ns.cloudflare.com`

---

## 2. Cloudflare DNS Configuration

> [!IMPORTANT]
> **Do not point `@` or `www` directly to Render (`kmes-school-60eq.onrender.com`).**
> Render hosts the **backend API**, not the frontend user interface. The frontend is hosted on **Vercel**.
> Pointing `@` or `www` to Render causes Vercel domain verification to fail and prevents visitors from seeing the school website.

### Required DNS Records in Cloudflare:

| Type | Name | Content / Target | Proxy Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (or `kmes.com.np`) | `76.76.21.21` | **DNS only (Grey Cloud)** | Points root domain to Vercel edge |
| **CNAME** | `www` | `cname.vercel-dns.com` | **DNS only (Grey Cloud)** | Points www to Vercel edge |
| **CNAME** | `api` *(optional)* | `kmes-school-60eq.onrender.com` | Proxied or DNS only | Custom API endpoint for Render backend |

> [!TIP]
> **Why DNS Only (Grey Cloud)?**
> When connecting a custom domain to Vercel for the first time, Vercel must issue an SSL/TLS certificate via Let's Encrypt. If Cloudflare proxying (Orange Cloud) is enabled before Vercel validates the certificate, the challenge will fail. Keep Cloudflare set to **DNS only (Grey cloud)** until Vercel marks both domains as **Valid Configuration**.

---

## 3. Vercel Configuration (Frontend)

1. Go to your [Vercel Dashboard](https://vercel.com/) -> Select project `kmes-school`.
2. Navigate to **Settings** -> **Domains**.
3. Add the following two domains:
   - `kmes.com.np`
   - `www.kmes.com.np` (Select redirect to `kmes.com.np` or production).
4. Status check:
   - While Mercantile is pending, Vercel displays `Invalid Configuration` because the DNS servers cannot yet be resolved globally.
   - Once Mercantile approves the domain and Cloudflare DNS propagates, Vercel will automatically show **Valid Configuration** with a green checkmark.

---

## 4. Render Configuration (Backend)

The backend code has already been updated with built-in CORS support for `https://kmes.com.np` and `https://www.kmes.com.np`.

To ensure password reset links and allowed origins are fully synchronized, verify these environment variables in your [Render Dashboard](https://dashboard.render.com/) under **kmes-school-60eq** -> **Environment**:

| Environment Variable | Value | Purpose |
| :--- | :--- | :--- |
| `ALLOWED_ORIGINS` | `https://kmes.com.np,https://www.kmes.com.np,https://kmes-school-xi.vercel.app` | Explicit CORS whitelist for browser requests |
| `FRONTEND_URL` | `https://kmes.com.np` | Default frontend URL |
| `RESET_LINK_BASE` | `https://kmes.com.np` | Base URL used when building password reset emails |
| `EMAIL_PROVIDER` | `smtp` | Production email delivery |
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP server |
| `SMTP_PORT` | `587` | STARTTLS port |
| `SMTP_USER` | `ivanbhattarai042@gmail.com` | Admin email / sender account |
| `SMTP_PASSWORD` | `apxjocbgolomaqsl` | Google App Password (16 letters, no spaces) |
| `EMAIL_FROM` | `ivanbhattarai042@gmail.com` | Authorized sender address |
| `EMAIL_FROM_NAME` | `KMES School` | Sender display name |

---

## 5. Verification & Testing Checklist

Once Mercantile approves the domain:

1. **Verify DNS Resolution**:
   ```bash
   nslookup kmes.com.np
   nslookup www.kmes.com.np
   ```
   Both should return IP `76.76.21.21`.

2. **Verify Frontend**:
   - Visit `https://kmes.com.np` in your browser.
   - The school homepage should load with a valid SSL padlock.

3. **Verify API Communication & CORS**:
   - Open browser developer tools (`F12`) -> Network tab.
   - Check that notices, events, and site settings load with `200 OK` from `https://kmes-school-60eq.onrender.com`.

4. **Verify Password Reset Link**:
   - Go to `https://kmes.com.np/admin` -> Forgot password.
   - Request reset email -> check inbox -> ensure the link starts with `https://kmes.com.np/reset-password?token=...`.
