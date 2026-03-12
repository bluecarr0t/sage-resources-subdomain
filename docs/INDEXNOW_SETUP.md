# IndexNow Setup for Bing & Yandex

IndexNow notifies Bing and Yandex when content changes for faster indexing. Google does not support IndexNow.

## Setup

### 1. Generate API Key

```bash
openssl rand -hex 16
```

Example output: `6cb1b9bebef041ae9ab7809a54b93128`

### 2. Add Environment Variables

**Vercel / Production:**
- `INDEXNOW_KEY` – Your generated key (8–128 hex characters)
- `SITE_URL` – `https://resources.sageoutdooradvisory.com` (optional; defaults to this)
- `CRON_SECRET` – Secret for cron auth (optional; set if using Vercel Cron)

**Local `.env`:**
```
INDEXNOW_KEY=your-key-here
SITE_URL=https://resources.sageoutdooradvisory.com
```

### 3. Key File

The `prebuild` script writes `public/{key}.txt` when `INDEXNOW_KEY` is set. This file proves ownership to Bing/Yandex. It is served at `https://resources.sageoutdooradvisory.com/{key}.txt`.

### 4. Submission Methods

**Option A: Vercel Cron (recommended)**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/indexnow",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Runs daily at 6:00 UTC. Set `CRON_SECRET` in Vercel; the cron sends it as `Authorization: Bearer {CRON_SECRET}`.

**Option B: Manual after deploy**

```bash
INDEXNOW_KEY=your-key SITE_URL=https://resources.sageoutdooradvisory.com npm run indexnow:submit
```

**Option C: API route**

```bash
curl -X POST https://resources.sageoutdooradvisory.com/api/indexnow \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Verification

1. Deploy with `INDEXNOW_KEY` set.
2. Visit `https://resources.sageoutdooradvisory.com/{your-key}.txt` – it should display your key.
3. Trigger submission (cron or manual).
4. Check Bing Webmaster Tools for indexing status.

## References

- [IndexNow Documentation](https://www.indexnow.org/documentation)
- [Bing IndexNow Get Started](https://www.bing.com/indexnow/getstarted)
