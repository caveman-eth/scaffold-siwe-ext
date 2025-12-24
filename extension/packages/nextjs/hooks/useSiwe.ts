"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Address } from "viem";
import { createSiweMessage } from "viem/siwe";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import siweConfig from "~~/utils/siwe.config";

/**
 * Safely extract error message from unknown error type
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

/**
 * SIWE session state returned by the useSiwe hook
 */
export interface SiweState {
  /** The authenticated address, if signed in */
  address: Address | null;
  /** The chain ID from the SIWE session */
  chainId: number | null;
  /** Whether the user is currently signed in with SIWE */
  isSignedIn: boolean;
  /** Whether an operation is in progress (signing, verifying, checking session) */
  isLoading: boolean;
  /** Error message from the last operation, if any */
  error: string | null;
  /** The last SIWE message that was signed (for educational display) */
  siweMessage: string | null;
  /** Unix timestamp (ms) when the session was created */
  signedInAt: number | null;
}

/**
 * useSiwe - React hook for Sign in with Ethereum authentication
 *
 * Provides a complete SIWE flow:
 * - Automatic session checking on mount
 * - signIn() - Generate nonce, create message, sign, and verify
 * - signOut() - Destroy the session
 *
 * @example
 * ```tsx
 * const { isSignedIn, address, signIn, signOut, isLoading, error } = useSiwe();
 *
 * if (!isSignedIn) {
 *   return <button onClick={signIn}>Sign in with Ethereum</button>;
 * }
 *
 * return (
 *   <div>
 *     <p>Signed in as {address}</p>
 *     <button onClick={signOut}>Sign Out</button>
 *   </div>
 * );
 * ```
 */
export function useSiwe() {
  // Wagmi hooks for wallet state
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  // SIWE state
  const [state, setState] = useState<SiweState>({
    address: null,
    chainId: null,
    isSignedIn: false,
    isLoading: true, // Start as loading to check session
    error: null,
    siweMessage: null,
    signedInAt: null,
  });

  /**
   * Check the current session status
   * Called on mount and after sign in/out
   */
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/siwe/session");
      const data = await response.json();

      setState(prev => ({
        ...prev,
        address: data.address || null,
        chainId: data.chainId || null,
        isSignedIn: data.isLoggedIn || false,
        isLoading: false,
        error: null,
        signedInAt: data.signedInAt || null,
      }));
    } catch (error) {
      console.error("Failed to check session:", error);
      setState(prev => ({
        ...prev,
        isSignedIn: false,
        isLoading: false,
        error: "Failed to check session status",
      }));
    }
  }, []);

  /**
   * Sign in with Ethereum
   * 1. Fetch a fresh nonce from the server
   * 2. Create a SIWE message
   * 3. Sign the message with the wallet
   * 4. Send to server for verification
   * 5. Update session state
   */
  const signIn = useCallback(async () => {
    // Validate wallet is connected
    if (!isConnected || !connectedAddress) {
      setState(prev => ({
        ...prev,
        error: "Please connect your wallet first",
      }));
      return { ok: false, error: "Wallet not connected" };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Step 1: Fetch nonce from server
      const nonceResponse = await fetch("/api/siwe/nonce");
      if (!nonceResponse.ok) {
        throw new Error("Failed to fetch nonce");
      }
      const { nonce } = await nonceResponse.json();

      // Step 2: Create SIWE message
      const now = new Date();
      const expirationTime = new Date(now.getTime() + siweConfig.messageExpirationMinutes * 60 * 1000);

      const message = createSiweMessage({
        address: connectedAddress,
        chainId,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: "1",
        statement: siweConfig.statement,
        issuedAt: now,
        expirationTime,
      });

      // Store the message for display purposes
      setState(prev => ({ ...prev, siweMessage: message }));

      // Step 3: Sign the message
      let signature: string;
      try {
        signature = await signMessageAsync({ message });
      } catch (signError: unknown) {
        // User rejected or wallet error
        const isRejection = signError instanceof Error && signError.message.toLowerCase().includes("rejected");
        const errorMessage = isRejection ? "Signature request was rejected" : "Failed to sign message";
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return { ok: false, error: errorMessage };
      }

      // Step 4: Verify with server
      const verifyResponse = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.ok) {
        const errorMessage = verifyData.error || "Verification failed";
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return { ok: false, error: errorMessage };
      }

      // Step 5: Success! Update state
      setState(prev => ({
        ...prev,
        address: verifyData.address,
        chainId: verifyData.chainId,
        isSignedIn: true,
        isLoading: false,
        error: null,
        signedInAt: verifyData.signedInAt,
      }));

      return { ok: true, address: verifyData.address };
    } catch (error: unknown) {
      console.error("SIWE sign in error:", error);
      const errorMessage = getErrorMessage(error, "An unexpected error occurred");
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { ok: false, error: errorMessage };
    }
  }, [isConnected, connectedAddress, chainId, signMessageAsync]);

  /**
   * Sign out - destroy the session
   */
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/siwe/session", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to sign out");
      }

      setState({
        address: null,
        chainId: null,
        isSignedIn: false,
        isLoading: false,
        error: null,
        siweMessage: null,
        signedInAt: null,
      });

      return { ok: true };
    } catch (error: unknown) {
      console.error("SIWE sign out error:", error);
      const errorMessage = getErrorMessage(error, "Failed to sign out");
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { ok: false, error: errorMessage };
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Track if we've seen the wallet connected (to avoid false auto-logout on page load)
  const hasSeenWalletConnected = useRef(false);

  // Update ref when wallet connects
  useEffect(() => {
    if (isConnected) {
      hasSeenWalletConnected.current = true;
    }
  }, [isConnected]);

  // Auto-logout if wallet disconnects or address changes
  useEffect(() => {
    // Address mismatch check - only if both addresses are available
    if (state.isSignedIn && connectedAddress && state.address) {
      if (connectedAddress.toLowerCase() !== state.address.toLowerCase()) {
        console.log("Wallet address changed, signing out...");
        signOut();
      }
    }

    // Disconnect check - only if we've previously seen the wallet connected
    // This prevents auto-logout on page refresh before wallet reconnects
    if (state.isSignedIn && !isConnected && hasSeenWalletConnected.current) {
      console.log("Wallet disconnected, signing out...");
      signOut();
    }
  }, [isConnected, connectedAddress, state.isSignedIn, state.address, signOut]);

  return {
    // State
    ...state,
    // Computed
    isWalletConnected: isConnected,
    connectedAddress,
    // Actions
    signIn,
    signOut,
    checkSession,
  };
}
