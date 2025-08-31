import { Deployment } from "@/app/types/deployment";

/**
 * Get deployments for local development
 * For local LangGraph dev server, we use static configuration
 */
export function getLocalDeployments(): Deployment[] {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://about-chat-efae22149131518cae4094f2526134ad.us.langgraph.app";

  const defaultGraphId = process.env.NEXT_PUBLIC_ASSISTANT_ID || "aboutchat";

  return [
    {
      id: defaultGraphId,
      deploymentUrl: apiUrl,
      tenantId: "langgraph",
      name: defaultGraphId,
      defaultGraphId, // Must match your langgraph.json or env
      isDefault: true,
    },
  ];
}

/**
 * Fetch deployments - for LangGraph Cloud (not used in local dev)
 */
export async function fetchDeployments(jwt: string): Promise<Deployment[]> {
  // This would be used for LangGraph Cloud deployments
  const res = await fetch("/api/deployments", {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch deployments");
  return res.json();
}

/**
 * Get deployments based on environment
 */
export function getDeployments(): Deployment[] {
  // For local development, use static config
  // For production, you'd use fetchDeployments() instead
  const isLocal =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_API_URL?.includes("localhost");

  if (isLocal) {
    return getLocalDeployments();
  }

  // Production: avoid throwing. Use env configuration if available; otherwise, return empty.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const defaultGraphId = process.env.NEXT_PUBLIC_ASSISTANT_ID || "aboutchat";

  if (!apiUrl) {
    if (typeof window !== "undefined") {
      console.warn(
        "NEXT_PUBLIC_API_URL is not set; returning empty deployments in production.",
      );
    }
    return [];
  }

  return [
    {
      id: defaultGraphId,
      deploymentUrl: apiUrl,
      tenantId: "langgraph",
      name: defaultGraphId,
      defaultGraphId,
      isDefault: true,
    },
  ];
}
