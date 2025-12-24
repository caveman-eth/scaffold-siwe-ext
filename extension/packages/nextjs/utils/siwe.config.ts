/**
 * SIWE Configuration
 *
 * Customize your Sign in with Ethereum settings here.
 * These values are used by the session management and SIWE message creation.
 */

const siweConfig = {
  /**
   * Session duration in days.
   * After this time, the user will need to sign in again.
   * @default 7
   */
  sessionDurationDays: 7,

  /**
   * SIWE message expiration in minutes.
   * This is how long the user has to sign the message after it's created.
   * If they take longer, the signature will be rejected.
   * @default 10
   */
  messageExpirationMinutes: 10,

  /**
   * Statement shown in the SIWE message.
   * This is the human-readable message the user sees when signing.
   * Customize this to match your application's branding.
   */
  statement: "Sign in with Ethereum to the app.",
} as const;

export default siweConfig;

// Export individual values for convenience
export const { sessionDurationDays, messageExpirationMinutes, statement } = siweConfig;
