/**
 * SIWE Session API Route
 *
 * GET /api/siwe/session
 * - Returns the current session state
 * - Used to check if user is logged in on page load
 *
 * DELETE /api/siwe/session
 * - Destroys the session (logout)
 * - Clears all session data
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SiweSessionData, defaultSession, sessionOptions } from "~~/utils/siwe";

/**
 * GET - Check current session
 */
export async function GET() {
  try {
    const session = await getIronSession<SiweSessionData>(await cookies(), sessionOptions);

    // Return session data (or default if not logged in)
    if (session.isLoggedIn && session.address) {
      return NextResponse.json({
        isLoggedIn: true,
        address: session.address,
        chainId: session.chainId,
        signedInAt: session.signedInAt,
      });
    }

    return NextResponse.json(defaultSession);
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json(defaultSession);
  }
}

/**
 * DELETE - Logout / destroy session
 */
export async function DELETE() {
  try {
    const session = await getIronSession<SiweSessionData>(await cookies(), sessionOptions);

    // Destroy the session
    session.destroy();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error destroying session:", error);
    return NextResponse.json({ ok: false, error: "Failed to logout" }, { status: 500 });
  }
}
