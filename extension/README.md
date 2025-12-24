# SIWE Extension

This Scaffold-ETH 2 project includes **Sign-In with Ethereum (SIWE)** authentication.

## Getting Started

1. Start the app:
   ```bash
   yarn start
   ```

2. Visit [http://localhost:3000/siwe](http://localhost:3000/siwe) to see the demo

3. Connect your wallet and click "Sign in with Ethereum"

## Using SIWE in Your App

```tsx
import { useSiwe } from "~~/hooks/useSiwe";

function MyProtectedPage() {
  const { isSignedIn, address, signIn, signOut } = useSiwe();

  if (!isSignedIn) {
    return <button onClick={signIn}>Sign in with Ethereum</button>;
  }

  return (
    <div>
      <p>Welcome, {address}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## Configuration

Edit `utils/siwe.config.ts` to customize session duration, message expiration, and statement.

## Production

Set `IRON_SESSION_SECRET` environment variable (32+ characters):

```bash
openssl rand -base64 32
```

## Learn More

- [EIP-4361 (SIWE Standard)](https://eips.ethereum.org/EIPS/eip-4361)
- [Scaffold-ETH 2 Documentation](https://docs.scaffoldeth.io)

