/**
 * SIWE Nonce API Route
 *
 * GET /api/siwe/nonce
 * - Generates a random nonce using viem's generateSiweNonce
 * - Stores it in the session (to validate later)
 * - Returns the nonce to the client
 *
 * The nonce prevents replay attacks - each sign in attempt needs a fresh nonce.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { generateSiweNonce } from "viem/siwe";
import { SiweSessionData, sessionOptions } from "~~/utils/siwe";

export async function GET() {
  try {
    // Get the session from cookies
    const session = await getIronSession<SiweSessionData>(await cookies(), sessionOptions);

    // Generate a new nonce using viem's built-in utility
    const nonce = generateSiweNonce();

    // Store nonce in session (we'll verify it later)
    session.nonce = nonce;
    session.isLoggedIn = false; // Reset login state when getting new nonce
    await session.save();

    // Return the nonce to the client
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Error generating nonce:", error);
    return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
  }
}
