import { GoogleAuth } from "google-auth-library";

const MONITORING_SCOPE = "https://www.googleapis.com/auth/monitoring";

let authClient: GoogleAuth | null = null;

export function getGoogleAuth() {
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: [MONITORING_SCOPE],
    });
  }
  return authClient;
}

export async function getMonitoringAccessToken() {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error(
      "No GCP access token. Run: gcloud auth application-default login",
    );
  }
  return token.token;
}

export async function monitoringFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getMonitoringAccessToken();
  const url = path.startsWith("http")
    ? path
    : `https://monitoring.googleapis.com/v3${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
