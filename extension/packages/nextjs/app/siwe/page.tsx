"use client";

import { useMemo } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowRightEndOnRectangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useSiwe } from "~~/hooks/useSiwe";
import { getSessionTimeRemaining, getTimeAgo } from "~~/utils/siwe";

/**
 * SIWE Demo Page
 *
 * Demonstrates the Sign in with Ethereum (SIWE) authentication flow.
 * Educational: Shows how SIWE works and provides a starting point for
 * developers to implement their own authentication.
 */
const SiwePage: NextPage = () => {
  const { isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const { address, chainId, isSignedIn, isLoading, error, siweMessage, signedInAt, signIn, signOut } = useSiwe();

  // Generate a random "API key" for demo purposes (stable across re-renders)
  const mockApiKey = useMemo(() => {
    const chars = "abcdef0123456789";
    let key = "sk_";
    for (let i = 0; i < 16; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }, []);

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <LockClosedIcon className="h-12 w-12 mx-auto mb-4 text-base-content" />
          <h1 className="text-4xl font-bold mb-2">Sign in with Ethereum</h1>
          <a
            href="https://eips.ethereum.org/EIPS/eip-4361"
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl font-semibold text-base-content/60 hover:text-accent transition-colors"
          >
            EIP-4361
          </a>
          <p className="text-lg text-base-content/70 mt-2">
            Authenticate using your Ethereum wallet. No passwords needed.
          </p>
        </div>

        {/* Get started hint */}
        <div className="text-center mb-8">
          <p className="text-sm text-base-content/60">
            Get started by editing{" "}
            <code className="italic bg-base-300 text-sm font-bold px-1 rounded">packages/nextjs/app/siwe/page.tsx</code>
          </p>
        </div>

        {/* Main Card - Consistent 2-row structure */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Action Area - Single row, fixed height */}
            <div className="h-12 flex items-center justify-center">
              {/* Not Connected (and not already signed in from session) */}
              {!isConnected && !isSignedIn && <RainbowKitCustomConnectButton />}

              {/* Connected but not signed in */}
              {isConnected && !isSignedIn && (
                <button className="btn btn-primary btn-lg gap-2" onClick={signIn} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Signing...
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="h-5 w-5" />
                      Sign in with Ethereum
                    </>
                  )}
                </button>
              )}

              {/* Signed In - Pill and button inline */}
              {isSignedIn && address && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 min-h-[48px] bg-success/10 border border-success/30 rounded-full">
                    <Address address={address} chain={targetNetwork} />
                  </div>
                  <button className="btn btn-outline btn-error btn-lg gap-2" onClick={signOut} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Signing out...
                      </>
                    ) : (
                      <>
                        <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
                        Sign Out
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Status Notification */}
            <div className="h-12 flex items-center justify-center my-2">
              {error ? (
                <div className="alert alert-error h-10 min-h-0 py-0 px-4">
                  <XCircleIcon className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : isSignedIn ? (
                <div className="alert alert-success h-10 min-h-0 py-0 px-4">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm">Successfully authenticated</span>
                </div>
              ) : isConnected ? (
                <div className="alert alert-warning h-10 min-h-0 py-0 px-4">
                  <ClockIcon className="h-5 w-5" />
                  <span className="text-sm">Waiting for authentication</span>
                </div>
              ) : (
                <div className="alert h-10 min-h-0 py-0 px-4">
                  <ClockIcon className="h-5 w-5" />
                  <span className="text-sm">Waiting for wallet</span>
                </div>
              )}
            </div>

            {/* SIWE Message Display (Educational) - Always present */}
            <details className="collapse collapse-arrow bg-base-200 rounded-lg">
              <summary className="collapse-title text-sm font-medium">
                <span className="inline-flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4" />
                  View SIWE Message
                </span>
              </summary>
              <div className="collapse-content">
                {siweMessage ? (
                  <>
                    <p className="text-sm text-base-content/60 mb-2">
                      {isSignedIn
                        ? "This is the EIP-4361 message that was signed:"
                        : isLoading
                          ? "SIWE message awaiting signature:"
                          : "SIWE message:"}
                    </p>
                    <pre className="bg-base-300 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {siweMessage}
                    </pre>
                  </>
                ) : (
                  <p className="text-sm text-base-content/50 italic">SIWE message will appear here during sign in.</p>
                )}
              </div>
            </details>

            {/* Protected Content Section */}
            <details className="collapse collapse-arrow bg-base-200 rounded-lg mt-3" open={isSignedIn}>
              <summary className="collapse-title text-sm font-medium">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Protected Content
                </span>
              </summary>
              <div className="collapse-content">
                {isSignedIn && address && chainId && signedInAt ? (
                  <>
                    {/* Session Details */}
                    <p className="text-sm text-base-content/60 mb-2">Session Details</p>
                    <div className="bg-base-300 p-4 rounded-lg mb-4">
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <span className="text-base-content/60">Address:</span>
                        <span>
                          <Address address={address} chain={targetNetwork} />
                        </span>
                        <span className="text-base-content/60">Signed in at:</span>
                        <span>
                          {new Date(signedInAt).toLocaleString()}{" "}
                          <span className="text-base-content/50">({getTimeAgo(signedInAt)})</span>
                        </span>
                        <span className="text-base-content/60">Session expires:</span>
                        <span>
                          {new Date(signedInAt + 7 * 24 * 60 * 60 * 1000).toLocaleString()}{" "}
                          <span className="text-base-content/50">({getSessionTimeRemaining(signedInAt)})</span>
                        </span>
                      </div>
                    </div>

                    {/* Secret Data Demo */}
                    <p className="text-sm text-base-content/60 mb-2">Secret Data (Demo)</p>
                    <div className="bg-base-300 p-4 rounded-lg mb-4">
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <span className="text-base-content/60">API Key:</span>
                        <span className="group font-mono cursor-pointer">
                          <span className="group-hover:hidden">{"•".repeat(19)}</span>
                          <span className="hidden group-hover:inline">{mockApiKey}</span>
                        </span>
                        <span className="text-base-content/60">User Role:</span>
                        <span>authenticated</span>
                        <span className="text-base-content/60">Access Level:</span>
                        <span>Full</span>
                      </div>
                    </div>

                    <p className="text-sm text-base-content/50 italic">
                      This content is only visible because you are authenticated. Sign out to see it disappear.
                    </p>
                  </>
                ) : (
                  <div className="py-2">
                    <p className="text-sm font-medium mb-1">Authentication Required</p>
                    <p className="text-sm text-base-content/60">
                      Sign in with Ethereum to access protected content. This demonstrates how to gate content behind
                      SIWE authentication.
                    </p>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>

        {/* What is SIWE Section */}
        <div className="mt-8 card bg-base-200">
          <div className="card-body">
            <h2 className="card-title text-lg">What is SIWE?</h2>
            <p className="text-sm text-base-content/70">
              Sign in with Ethereum (SIWE) is an authentication standard (EIP-4361) that allows users to authenticate to
              web applications using their Ethereum wallet. Instead of usernames and passwords, users prove ownership of
              their Ethereum address by signing a message.
            </p>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">How it works:</h3>
              <ol className="list-decimal list-inside text-sm text-base-content/70 space-y-1">
                <li>Server generates a unique nonce (prevents replay attacks)</li>
                <li>Client creates a SIWE message with domain, address, and nonce</li>
                <li>User signs the message with their wallet</li>
                <li>Server verifies the signature and creates a session</li>
              </ol>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="https://siwe.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-accent text-sm font-medium"
              >
                siwe.xyz — Official SIWE website →
              </a>
              <a
                href="https://eips.ethereum.org/EIPS/eip-4361"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-accent text-sm font-medium"
              >
                EIP-4361 — The SIWE standard specification →
              </a>
              <a
                href="https://viem.sh/docs/siwe/actions/verifySiweMessage"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-accent text-sm font-medium"
              >
                viem SIWE docs — This extension uses viem&apos;s native SIWE utilities →
              </a>
            </div>
          </div>
        </div>

        <div className="divider my-6"></div>

        {/* Hook Usage Example */}
        <details className="collapse collapse-arrow bg-base-200 rounded-lg">
          <summary className="collapse-title text-lg font-medium">Using the useSiwe Hook</summary>
          <div className="collapse-content">
            <p className="text-sm text-base-content/70 mb-4">
              Use the <code className="bg-base-300 px-1 rounded">useSiwe</code> hook in your components to add SIWE
              authentication:
            </p>
            <pre className="bg-base-300 p-4 rounded-lg text-xs overflow-x-auto">
              {`import { useSiwe } from "~~/hooks/useSiwe";

function MyComponent() {
  const { 
    isSignedIn, 
    address, 
    chainId,
    signedInAt,
    siweMessage,
    signIn, 
    signOut,
    isLoading,
    error,
  } = useSiwe();

  if (!isSignedIn) {
    return (
      <button onClick={signIn} disabled={isLoading}>
        Sign in with Ethereum
      </button>
    );
  }

  return (
    <div>
      <p>Signed in as {address}</p>
      <p>Chain ID: {chainId}</p>
      <p>Session started: {new Date(signedInAt).toLocaleString()}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}`}
            </pre>
          </div>
        </details>

        <div className="divider my-6"></div>

        {/* Configuration */}
        <details className="collapse collapse-arrow bg-base-200 rounded-lg">
          <summary className="collapse-title text-lg font-medium">Configuration</summary>
          <div className="collapse-content">
            <p className="text-sm text-base-content/70 mb-4">
              Customize SIWE settings in <code className="bg-base-300 px-1 rounded">utils/siwe.config.ts</code>:
            </p>
            <pre className="bg-base-300 p-4 rounded-lg text-xs overflow-x-auto">
              {`const siweConfig = {
  // Session cookie duration (days)
  sessionDurationDays: 7,

  // How long user has to sign (minutes)
  messageExpirationMinutes: 10,

  // Statement shown in SIWE message
  statement: "Sign in with Ethereum to the app.",
};`}
            </pre>
            <p className="text-sm text-base-content/50 mt-4">
              For production, set the <code className="bg-base-300 px-1 rounded">IRON_SESSION_SECRET</code> environment
              variable (32+ characters).
            </p>
          </div>
        </details>

        <div className="divider my-6"></div>

        {/* API Routes */}
        <details className="collapse collapse-arrow bg-base-200 rounded-lg">
          <summary className="collapse-title text-lg font-medium">API Routes</summary>
          <div className="collapse-content">
            <p className="text-sm text-base-content/70 mb-4">Three API endpoints handle the authentication flow:</p>
            <div className="overflow-x-auto">
              <table className="table table-sm text-sm">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code className="text-xs">/api/siwe/nonce</code>
                    </td>
                    <td>GET</td>
                    <td>Generate a fresh nonce for signing</td>
                  </tr>
                  <tr>
                    <td>
                      <code className="text-xs">/api/siwe/verify</code>
                    </td>
                    <td>POST</td>
                    <td>Verify signature and create session</td>
                  </tr>
                  <tr>
                    <td>
                      <code className="text-xs">/api/siwe/session</code>
                    </td>
                    <td>GET</td>
                    <td>Check current session status</td>
                  </tr>
                  <tr>
                    <td>
                      <code className="text-xs">/api/siwe/session</code>
                    </td>
                    <td>DELETE</td>
                    <td>Sign out (destroy session)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </details>

        <div className="divider my-6"></div>

        {/* Security */}
        <details className="collapse collapse-arrow bg-base-200 rounded-lg">
          <summary className="collapse-title text-lg font-medium">Security</summary>
          <div className="collapse-content">
            <p className="text-sm text-base-content/70 mb-4">
              This implementation includes built-in security features:
            </p>
            <ul className="list-disc list-inside text-sm text-base-content/70 space-y-1">
              <li>
                <strong>Domain validation</strong> — Prevents phishing attacks by verifying the message domain
              </li>
              <li>
                <strong>Nonce validation</strong> — Prevents replay attacks with single-use nonces
              </li>
              <li>
                <strong>Message expiration</strong> — Messages expire after 10 minutes (configurable)
              </li>
              <li>
                <strong>ERC-6492 support</strong> — Smart Contract Accounts (like Safe) work automatically
              </li>
              <li>
                <strong>Encrypted sessions</strong> — iron-session encrypts all session data
              </li>
            </ul>
          </div>
        </details>

        <div className="divider my-6"></div>
      </div>
    </div>
  );
};

export default SiwePage;
