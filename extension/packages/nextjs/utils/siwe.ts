/**
 * SIWE (Sign in with Ethereum) Utilities
 *
 * This file contains:
 * 1. Session configuration for iron-session
 * 2. TypeScript types for SIWE sessions
 * 3. Helper functions for session management
 *
 * Used by:
 * - API routes (/api/siwe/*)
 * - useSiwe hook
 */
import siweConfig from "./siwe.config";
import { SessionOptions } from "iron-session";
import { Address } from "viem";

// =============================================================================
// TYPES
// =============================================================================

/**
 * The data stored in an authenticated SIWE session
 */
export interface SiweSessionData {
  /** The authenticated Ethereum address (checksummed) */
  address?: Address;
  /** The chain ID the user authenticated on */
  chainId?: number;
  /** Nonce used during authentication (stored temporarily) */
  nonce?: string;
  /** Whether the user is currently authenticated */
  isLoggedIn: boolean;
  /** Unix timestamp (ms) when the session was created */
  signedInAt?: number;
}

/**
 * Default session data for unauthenticated users
 */
export const defaultSession: SiweSessionData = {
  isLoggedIn: false,
};

// =============================================================================
// SESSION CONFIGURATION
// =============================================================================

/**
 * Get the session password with production safety check.
 *
 * In production: IRON_SESSION_SECRET env var is REQUIRED (fails loudly if missing)
 * In development: Falls back to a default secret for convenience
 *
 * @throws Error if secret is missing in production or too short
 */
function getSessionPassword(): string {
  const secret = process.env.IRON_SESSION_SECRET;

  if (secret) {
    if (secret.length < 32) {
      throw new Error(
        "IRON_SESSION_SECRET must be at least 32 characters long. " +
          "Generate a secure secret: `openssl rand -base64 32`",
      );
    }
    return secret;
  }

  // No secret provided - only acceptable in development
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "IRON_SESSION_SECRET environment variable is required in production. " +
        "Generate a secure 32+ character secret: `openssl rand -base64 32`",
    );
  }

  // Development fallback (acceptable for local dev only)
  return "complex_password_at_least_32_characters_long_for_dev";
}

/**
 * iron-session configuration options
 *
 * @see https://github.com/vvo/iron-session
 */
export const sessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: "siwe-session",
  cookieOptions: {
    // Cookie is available across entire site
    path: "/",
    // Secure in production (HTTPS only)
    secure: process.env.NODE_ENV === "production",
    // Prevents JavaScript access to cookie
    httpOnly: true,
    // CSRF protection
    sameSite: "lax" as const,
    // Cookie expiration (configurable via siwe.config.ts)
    maxAge: 60 * 60 * 24 * siweConfig.sessionDurationDays,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Type guard to check if a session is authenticated
 */
export function isAuthenticated(
  session: SiweSessionData,
): session is SiweSessionData & { address: Address; chainId: number } {
  return session.isLoggedIn && !!session.address && !!session.chainId;
}

/**
 * Get the current origin (domain + protocol) for SIWE message
 * Used on the client side to construct SIWE messages
 */
export function getSiweMessageOptions() {
  return {
    domain: typeof window !== "undefined" ? window.location.host : "",
    uri: typeof window !== "undefined" ? window.location.origin : "",
    version: "1" as const,
    statement: siweConfig.statement,
  };
}

/**
 * Session max age in milliseconds (matches cookie maxAge)
 * Configurable via siwe.config.ts
 */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * siweConfig.sessionDurationDays * 1000;

/**
 * Get relative time string from timestamp
 * @param timestamp - Unix timestamp (ms)
 * @returns Formatted string like "2 min ago", "1 hour ago", "3 days ago"
 */
export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? "s" : ""} ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? "s" : ""} ago`;
}

/**
 * Calculate remaining session time from signedInAt timestamp
 * @param signedInAt - Unix timestamp (ms) when session was created
 * @returns Formatted string like "6d 23h 45m" or "Expired"
 */
export function getSessionTimeRemaining(signedInAt: number): string {
  const expiresAt = signedInAt + SESSION_MAX_AGE_MS;
  const remainingMs = expiresAt - Date.now();

  if (remainingMs <= 0) {
    return "Expired";
  }

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}
