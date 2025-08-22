import { Auth, HTTPException } from "@langchain/langgraph-sdk/auth";
import { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase-client.js";

const supabase = getSupabaseClient();

const STUDIO_USER_ID = "langgraph-studio-user";

// Helper function to check if user is studio user
const isStudioUser = (userIdentity: string): boolean => {
  return userIdentity === STUDIO_USER_ID;
};

// Helper function for operations that only need owner filtering
const createOwnerFilter = (user: { identity: string }) => {
  if (isStudioUser(user.identity)) {
    return;
  }
  return { owner: user.identity };
};

// Helper function for create operations that set metadata
const createWithOwnerMetadata = (value: any, user: { identity: string }) => {
  if (isStudioUser(user.identity)) {
    return;
  }

  value.metadata ??= {};
  value.metadata.owner = user.identity;
  return { owner: user.identity };
};

export const auth = new Auth()
  .authenticate(async (request: Request) => {
    if (request.method === "OPTIONS") {
      return {
        identity: "anonymous",
        permissions: [],
        is_authenticated: false,
        display_name: "CORS Preflight",
      };
    }
    const headersObj: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      // Redact authorization header to avoid leaking tokens in logs
      if (key.toLowerCase() === "authorization") {
        headersObj[key] = "<redacted>";
      } else {
        headersObj[key] = value;
      }
    }
    console.log("[auth] Incoming request", {
      url: request.url,
      method: request.method,
      headers: headersObj,
    });
    // Parse Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new HTTPException(401, { message: "Authorization header missing" });
    }
    let token: string | undefined;
    try {
      const [scheme, value] = authHeader.split(" ");
      if (scheme.toLowerCase() !== "bearer") throw new Error();
      token = value;
    } catch {
      throw new HTTPException(401, {
        message: "Invalid authorization header format",
      });
    }
    if (!supabase) {
      throw new HTTPException(500, {
        message: "Supabase client not initialized",
      });
    }
    // Validate JWT with Supabase
    let user: User | null = null;
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        throw new Error(error?.message || "User not found");
      }
      user = data.user;
      if (!user) {
        throw new HTTPException(401, { message: "User not found" });
      }
    } catch (e: any) {
      throw new HTTPException(401, {
        message: `Authentication error: ${e.message}`,
      });
    }
    return {
      identity: user.id,
      permissions: [
        "threads:create",
        "threads:create_run",
        "threads:read",
        "threads:delete",
        "threads:update",
        "threads:search",
        "assistants:create",
        "assistants:read",
        "assistants:delete",
        "assistants:update",
        "assistants:search",
        "deployments:read",
        "deployments:search",
        "store:access",
      ],
    };
  })

  // THREADS: create operations with metadata
  .on("threads:create", ({ value, user }) =>
    createWithOwnerMetadata(value, user),
  )
  .on("threads:create_run", ({ value, user }) =>
    createWithOwnerMetadata(value, user),
  )

  // THREADS: read, update, delete, search operations
  .on("threads:read", ({ user }) => createOwnerFilter(user))
  .on("threads:update", ({ user }) => createOwnerFilter(user))
  .on("threads:delete", ({ user }) => createOwnerFilter(user))
  .on("threads:search", ({ user }) => createOwnerFilter(user))

  // ASSISTANTS: create operation with metadata
  .on("assistants:create", ({ value, user }) =>
    createWithOwnerMetadata(value, user),
  )

  // ASSISTANTS: read, update, delete, search operations
  .on("assistants:read", ({ user }) => createOwnerFilter(user))
  .on("assistants:update", ({ user }) => createOwnerFilter(user))
  .on("assistants:delete", ({ user }) => createOwnerFilter(user))
  .on("assistants:search", ({ user }) => createOwnerFilter(user))

  // STORE: permission-based access
  .on("store", ({ user }) => {
    return { owner: user.identity };
  });
