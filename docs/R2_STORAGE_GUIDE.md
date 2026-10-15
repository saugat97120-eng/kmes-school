# KMES School — Cloudflare R2 Storage Guide (`media.kmes.com.np`)

This guide explains how **Cloudflare R2** replaces Cloudinary to host all gallery photos, notices, syllabus PDFs, and attachments on your own branded domain: **`https://media.kmes.com.np`**.

---

## Why Cloudflare R2?

* **Zero Egress Fees**: Free bandwidth forever (no per-download costs).
* **10 GB Storage Free**: Every month at $0 cost.
* **100% Branded Experience**: All URLs look like `https://media.kmes.com.np/media/...` rather than third-party Cloudinary URLs.
* **Fast Edge Delivery**: Served through Cloudflare's global content delivery network (CDN).

---

## 1. Create Your R2 Bucket in Cloudflare

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **Storage & Databases** $\rightarrow$ **R2**.
3. If this is your first time using R2, click **Enable R2** (it offers free tier with no upfront cost).
4. Click **Create bucket**:
   * **Bucket name**: `kmes-school-media`
   * **Location**: *Automatic* (defaults to the lowest latency region)
5. Click **Create Bucket**.

---

## 2. Connect Your Custom Domain (`media.kmes.com.np`)

1. Inside your new `kmes-school-media` bucket page, click on **Settings**.
2. Scroll to the **Custom Domains** section and click **Connect Domain**.
3. In the domain box, type:
   ```text
   media.kmes.com.np
   ```
4. Click **Continue** $\rightarrow$ click **Connect Domain**.
5. Cloudflare will automatically:
   * Issue a free SSL/TLS certificate for `media.kmes.com.np`.
   * Add the DNS record pointing to your R2 bucket.
   * Allow public reads from `https://media.kmes.com.np`.

---

## 3. Generate Your R2 API Credentials

Your backend needs an S3-compatible API token to upload and delete files.

1. Go back to the main **R2** dashboard overview.
2. In the right sidebar, click **Manage R2 API Tokens**.
3. Click **Create API token**:
   * **Token name**: `kmes-backend-r2`
   * **Permissions**: Select **Object Read & Write**
   * **Specify bucket**: Select **kmes-school-media** (or Apply to all buckets)
   * **TTL**: Leave as default / never expire
4. Click **Create API Token**.
5. Cloudflare will display three values (copy them immediately, they are only shown once):
   * **Access Key ID**
   * **Secret Access Key**
   * **Endpoint URL** (e.g. `https://<account_id>.r2.cloudflarestorage.com`)

---

## 4. Add Environment Variables to Render

In your [Render Dashboard](https://dashboard.render.com/) under your backend service (`kmes-school-60eq`) $\rightarrow$ **Environment**, add:

| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `R2_ACCOUNT_ID` | `a4556a7dd2c35190a791424061384ece` | Your Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | *(Your R2 Access Key ID)* | Generated in Step 3 |
| `R2_SECRET_ACCESS_KEY` | *(Your R2 Secret Access Key)* | Generated in Step 3 |
| `R2_BUCKET_NAME` | `kmes-school-media` | Bucket name |
| `R2_PUBLIC_URL` | `https://media.kmes.com.np` | Public custom media domain |

*(Optional)* If you had Cloudinary credentials configured on Render, you can safely remove them. The backend will automatically route 100% of uploads and deletions through Cloudflare R2!

---

## 5. Verification

1. Log in to the KMES Admin Portal (`/admin/media` or `/admin/notices`).
2. Upload a new school notice with a PDF attachment or a photo in the Media Library.
3. Inspect the file URL:
   * It will begin with `https://media.kmes.com.np/...`.
   * The file is served with high speed directly from Cloudflare's edge with valid HTTPS.
