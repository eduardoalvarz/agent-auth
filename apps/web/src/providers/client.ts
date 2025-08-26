import { Client } from "@langchain/langgraph-sdk";

export function createClient(apiUrl: string, jwt?: string) {
  console.log(
    "[createClient] apiUrl=",
    apiUrl,
    "jwt=",
    jwt ? "present" : "missing",
  );

  // Ensure apiUrl is absolute for the SDK (it calls new URL(base + path))
  let clientApiUrl = apiUrl;
  try {
    if (clientApiUrl && clientApiUrl.startsWith("/")) {
      // Build absolute URL from current origin (browser) or env fallbacks (SSR)
      if (typeof window !== "undefined") {
        clientApiUrl = `${window.location.origin}${clientApiUrl}`;
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        clientApiUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${clientApiUrl}`;
      } else if (process.env.VERCEL_URL) {
        clientApiUrl = `https://${process.env.VERCEL_URL}${clientApiUrl}`;
      } else {
        clientApiUrl = `http://localhost:3000${clientApiUrl}`;
      }
    }
  } catch (e) {
    console.error("[createClient] Failed to normalize apiUrl:", e);
  }

  console.log("[createClient] Using clientApiUrl=", clientApiUrl);

  // Configure the client with proper headers
  const config: any = {
    apiUrl: clientApiUrl,
  };

  // Add authorization headers if JWT is present
  if (jwt) {
    config.defaultHeaders = {
      Authorization: `Bearer ${jwt}`,
      "x-supabase-access-token": jwt,
      "Content-Type": "application/json",
    };
  }

  // Do NOT set X-Api-Key from the browser. Keys must be injected server-side via the Next.js proxy.

  console.log("[createClient] config=", config);

  return new Client(config);
}
