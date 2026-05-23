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

- Enable Maps Platform APIs (Maps, Routes, Places, Environment — see `lib/maps-free-tier.ts`)
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
GCP_PROJECT_ID=coba-409011
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
```

(`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` still work as aliases.)

Usage counts are loaded on demand per API card (Refresh). The server needs ADC + Monitoring IAM on the project.

`GCP_PROJECT_ID` must be the same project as `GOOGLE_MAPS_API_KEY`. The Places card reads **`places.googleapis.com`** (Places API New), not legacy `places-backend.googleapis.com`.

**MCP `show-map-at-coordinates`** uses **Static Maps** (`static-maps-backend.googleapis.com`) and **Maps Embed** (`maps-embed-backend.googleapis.com`). If you get *API key is not authorized to use this service*, enable both APIs on the project and add them to the key’s **API restrictions** (same key as Places is fine):

```fish
gcloud services enable static-maps-backend.googleapis.com maps-embed-backend.googleapis.com --project=coba-409011
gcloud services api-keys update projects/PROJECT_NUMBER/locations/global/keys/KEY_ID \
  --project=coba-409011 \
  --api-target=service=places.googleapis.com \
  --api-target=service=static-maps-backend.googleapis.com \
  --api-target=service=maps-embed-backend.googleapis.com
```

[Credentials](https://console.cloud.google.com/apis/credentials?project=coba-409011) → your key → **API restrictions**.

### APIs on `/maps-usage`

The quota dashboard tracks **22** Google Maps Platform products with Essentials (or Pro) monthly free caps — grouped as Maps, Routes, Places & location, and Environment. Each card maps to a Cloud Monitoring `consumed_api` service name. Enable APIs in [Maps API list](https://console.cloud.google.com/google/maps-apis/api-list?project=coba-409011) or:

```fish
gcloud services enable places.googleapis.com routes.googleapis.com static-maps-backend.googleapis.com maps-embed-backend.googleapis.com roads.googleapis.com timezone-backend.googleapis.com tile.googleapis.com pollen.googleapis.com solar.googleapis.com weather.googleapis.com --project=coba-409011
```

Full list: `lib/maps-free-tier.ts`. [Pricing & free caps](https://developers.google.com/maps/billing-and-pricing/pricing).

## Troubleshooting

- **Permission denied** — your user needs *API Keys Admin* (or Owner) on the project.
- **Billing not enabled** — link a billing account to the project in Cloud Console.
- **Key works locally but not in prod** — add your production origin under API key HTTP referrers in [Credentials](https://console.cloud.google.com/apis/credentials).
- **Dashboard 401** — run `gcloud auth application-default login` and ensure Monitoring roles on the project.
