# Google Maps API key setup

## 1. Log in to Google Cloud (one time)

`gcloud` is installed at `~/google-cloud-sdk/bin/gcloud`.

In your terminal:

```fish
set -x PATH $HOME/google-cloud-sdk/bin $PATH
gcloud auth login
```

A browser opens — sign in with the Google account that owns your GCP project.

**No browser?** Use:

```fish
gcloud auth login --no-launch-browser
```

Open the printed URL, sign in, then paste the verification code back into the terminal.

Verify login:

```fish
gcloud auth list
```

You should see `ACTIVE` next to your email.

## 2. GCP project requirements

Before creating a key you need:

| Requirement | Where |
|-------------|--------|
| A GCP project | [Create project](https://console.cloud.google.com/projectcreate) |
| Billing enabled | [Billing](https://console.cloud.google.com/billing) (Maps has a free monthly credit, but billing must be linked) |
| Maps Platform terms | [Maps APIs](https://console.cloud.google.com/google/maps-apis) — enable if prompted |

## 3. Create the API key (after login)

From the repo root:

```fish
fish scripts/google-maps-api-key.fish
```

If you have several projects:

```fish
fish scripts/google-maps-api-key.fish --project YOUR_PROJECT_ID
```

The script will:

- Enable Maps, Geocoding, and Places backends
- Create a browser-restricted key (localhost only)
- Write `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local` (gitignored)

## 4. Tell the agent to finish

After you run `gcloud auth login`, reply in chat (e.g. “logged in”) and the agent can run the script for you.

## 5. Quota dashboard

| Page | URL | Auth |
|------|-----|------|
| Usage | `/maps-usage` | Google sign-in |

Design mock: `designs/quota.pen` / `designs/quota.png`.

```fish
pnpm dev
```

### Server GCP (usage counts)

```fish
gcloud auth application-default login
```

### Google sign-in

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → **Create OAuth client ID** (Web).
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Add to `.env.local`:

```env
GCP_PROJECT_ID=koisose-65e33
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
```

(`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` still work as aliases.)

Usage counts are loaded on demand per API card (Refresh). The server needs ADC + Monitoring IAM on the project.

## Troubleshooting

- **Permission denied** — your user needs *API Keys Admin* (or Owner) on the project.
- **Billing not enabled** — link a billing account to the project in Cloud Console.
- **Key works locally but not in prod** — add your production origin under API key HTTP referrers in [Credentials](https://console.cloud.google.com/apis/credentials).
- **Dashboard 401** — run `gcloud auth application-default login` and ensure Monitoring roles on the project.
