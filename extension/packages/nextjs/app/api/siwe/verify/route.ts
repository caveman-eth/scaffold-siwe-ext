/**
 * SIWE Verify API Route
 *
 * POST /api/siwe/verify
 * - Receives the SIWE message and signature from the client
 * - Verifies the message and signature using viem's verifySiweMessage
 * - Creates an authenticated session on success
 *
 * Security checks performed by verifySiweMessage:
 * 1. Domain matches our server's domain (prevents cross-site attacks)
 * 2. Nonce matches what we issued (prevents replay attacks)
 * 3. Message hasn't expired (if expirationTime is set)
 * 4. Current time is after notBefore (if set)
 * 5. Signature is cryptographically valid
 * 6. ERC-6492 support for Smart Contract Accounts
 *
 * Request body: { message: string, signature: string }
 * Response: { ok: true, address: string, chainId: number } or { ok: false, error: string }
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { Chain, Hex, createPublicClient, http } from "viem";
import { arbitrum, base, gnosis, hardhat, mainnet, optimism, polygon, scroll, sepolia, zkSync } from "viem/chains";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { SiweSessionData, sessionOptions } from "~~/utils/siwe";

/**
 * Map of chainId to viem Chain configuration
 * Add more chains as needed for your application
 */
const SUPPORTED_CHAINS: Record<number, Chain> = {
  // Mainnets
  [mainnet.id]: mainnet,
  [polygon.id]: polygon,
  [optimism.id]: optimism,
  [arbitrum.id]: arbitrum,
  [base.id]: base,
  [gnosis.id]: gnosis,
  [scroll.id]: scroll,
  [zkSync.id]: zkSync,
  // Testnets
  [sepolia.id]: sepolia,
  // Local development (hardhat.id = 31337, also used by Anvil)
  [hardhat.id]: hardhat,
};

/**
 * Get a public client for the specified chainId
 * Falls back to mainnet if chain is not supported (for ENS resolution)
 */
function getPublicClientForChain(chainId: number | undefined) {
  const chain = chainId ? SUPPORTED_CHAINS[chainId] : mainnet;

  return createPublicClient({
    chain: chain || mainnet,
    transport: http(),
  });
}

/**
 * Analyze why verification failed and return a helpful error message
 */
function getVerificationErrorMessage(
  parsedMessage: ReturnType<typeof parseSiweMessage>,
  expectedDomain: string,
  expectedNonce: string,
): string {
  const now = new Date();

  // Check domain mismatch
  if (parsedMessage.domain !== expectedDomain) {
    return `Domain mismatch. Expected: ${expectedDomain}, Got: ${parsedMessage.domain}`;
  }

  // Check nonce mismatch
  if (parsedMessage.nonce !== expectedNonce) {
    return "Nonce mismatch. Please request a new nonce and try again.";
  }

  // Check expiration
  if (parsedMessage.expirationTime && new Date(parsedMessage.expirationTime) < now) {
    return "Message has expired. Please sign a new message.";
  }

  // Check notBefore
  if (parsedMessage.notBefore && new Date(parsedMessage.notBefore) > now) {
    return "Message is not yet valid. Please wait and try again.";
  }

  // Check required fields
  if (!parsedMessage.address) {
    return "Message is missing required field: address";
  }

  if (!parsedMessage.chainId) {
    return "Message is missing required field: chainId";
  }

  // Default: likely a signature issue
  return "Invalid signature. The message was not signed by the claimed address.";
}

export async function POST(request: NextRequest) {
  try {
    // =========================================================================
    // Step 1: Parse and validate request body
    // =========================================================================
    const body = await request.json();
    const { message, signature } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid 'message' field. Expected a string." },
        { status: 400 },
      );
    }

    if (!signature || typeof signature !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid 'signature' field. Expected a hex string." },
        { status: 400 },
      );
    }

    // =========================================================================
    // Step 2: Retrieve stored nonce from session
    // =========================================================================
    const session = await getIronSession<SiweSessionData>(await cookies(), sessionOptions);

    if (!session.nonce) {
      return NextResponse.json(
        { ok: false, error: "No nonce found in session. Please call GET /api/siwe/nonce first." },
        { status: 400 },
      );
    }

    const storedNonce = session.nonce;

    // =========================================================================
    // Step 3: Parse the SIWE message to extract fields
    // =========================================================================
    let parsedMessage: ReturnType<typeof parseSiweMessage>;
    try {
      parsedMessage = parseSiweMessage(message);
    } catch (parseError) {
      console.error("Failed to parse SIWE message:", parseError);
      return NextResponse.json(
        { ok: false, error: "Invalid SIWE message format. Could not parse EIP-4361 message." },
        { status: 400 },
      );
    }

    // =========================================================================
    // Step 4: Get expected domain and create public client
    // =========================================================================
    const expectedDomain = request.headers.get("host") || "";

    if (!expectedDomain) {
      console.error("Could not determine host from request headers");
      return NextResponse.json(
        { ok: false, error: "Could not determine server domain for verification." },
        { status: 500 },
      );
    }

    // Create a public client for the chain specified in the SIWE message
    // This is used for ENS resolution and ERC-6492 smart contract signature verification
    const publicClient = getPublicClientForChain(parsedMessage.chainId);

    // =========================================================================
    // Step 5: Verify the SIWE message (validation + signature in one call)
    // =========================================================================
    // verifySiweMessage performs:
    // - Domain validation (matches expectedDomain)
    // - Nonce validation (matches storedNonce)
    // - Time validation (expirationTime, notBefore)
    // - Signature verification (supports EOA and ERC-6492 smart contract accounts)
    let isValid: boolean;
    try {
      isValid = await verifySiweMessage(publicClient, {
        message,
        signature: signature as Hex,
        domain: expectedDomain,
        nonce: storedNonce,
      });
    } catch (verifyError) {
      console.error("SIWE verification error:", verifyError);
      // Provide detailed error message based on what likely failed
      const errorMessage = getVerificationErrorMessage(parsedMessage, expectedDomain, storedNonce);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 400 });
    }

    if (!isValid) {
      // Verification returned false - analyze and provide helpful error
      const errorMessage = getVerificationErrorMessage(parsedMessage, expectedDomain, storedNonce);
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 400 });
    }

    // =========================================================================
    // Step 6: Verification passed - create authenticated session
    // =========================================================================
    // After successful verifySiweMessage, address and chainId are guaranteed to exist
    // (viem validates all required EIP-4361 fields during verification)
    const signedInAt = Date.now();
    session.address = parsedMessage.address!;
    session.chainId = parsedMessage.chainId!;
    session.isLoggedIn = true;
    session.signedInAt = signedInAt;
    session.nonce = undefined; // Clear nonce after successful use (prevents replay attacks)
    await session.save();

    return NextResponse.json({
      ok: true,
      address: parsedMessage.address,
      chainId: parsedMessage.chainId,
      signedInAt,
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in SIWE verification:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred during verification. Please try again." },
      { status: 500 },
    );
  }
}
