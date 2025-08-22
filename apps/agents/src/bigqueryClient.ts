import { BigQuery } from "@google-cloud/bigquery";

// Prefer environment variables over local JSON files.
// Supports either Application Default Credentials via GOOGLE_APPLICATION_CREDENTIALS
// or explicit credentials via GCP_CLIENT_EMAIL / GCP_PRIVATE_KEY.

function getPrivateKeyFromEnv(): string | undefined {
  let key = process.env.GCP_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  if (key && key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  return key;
}

const projectId =
  process.env.BQ_PROJECT_ID ||
  process.env.GCP_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT;

const clientEmail = process.env.GCP_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = getPrivateKeyFromEnv();

export const bigquery = (() => {
  // Case 1: Explicit service account credentials provided
  if (clientEmail && privateKey) {
    if (!projectId) {
      throw new Error(
        "BQ_PROJECT_ID is required when using GCP_CLIENT_EMAIL/GCP_PRIVATE_KEY",
      );
    }
    return new BigQuery({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  // Case 2: ADC (GOOGLE_APPLICATION_CREDENTIALS or metadata server)
  // If projectId is set, pass it; otherwise let the library auto-detect it.
  if (projectId) {
    return new BigQuery({ projectId });
  }
  return new BigQuery();
})();
