/**
 * Content script (MAIN world) — injected into every page.
 *
 * Intercepts `window.ethereum.request` calls for transaction-signing methods
 * and posts a message to the ISOLATED world bridge for Clarity analysis
 * before allowing the wallet popup to open.
 *
 * D1-2 scaffold. Implementation follows in the Engine integration phase.
 */

const INTERCEPTED_METHODS = new Set([
  'eth_sendTransaction',
  'eth_signTypedData_v4',
  'eth_signTypedData_v3',
  'personal_sign',
]);

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
      [key: string]: unknown;
    };
  }
}

function installEthereumShim() {
  const existing = window.ethereum;
  if (!existing || (existing as { __clarityShimInstalled?: boolean }).__clarityShimInstalled) {
    return;
  }

  const originalRequest = existing.request.bind(existing);
  existing.request = async (args) => {
    if (INTERCEPTED_METHODS.has(args.method)) {
      // Placeholder: in D3-4 we will post a message to the bridge
      // and wait for user approval before forwarding.
      console.debug('[Clarity] intercepted:', args.method, args.params);
    }
    return originalRequest(args);
  };
  (existing as { __clarityShimInstalled?: boolean }).__clarityShimInstalled = true;
  console.debug('[Clarity] ethereum shim installed');
}

if (window.ethereum) {
  installEthereumShim();
} else {
  // Wait for provider injection from the wallet extension.
  const onInjected = () => installEthereumShim();
  window.addEventListener('ethereum#initialized', onInjected, { once: true });
  // Fallback polling in case the event is missed.
  const start = Date.now();
  const interval = setInterval(() => {
    if (window.ethereum) {
      installEthereumShim();
      clearInterval(interval);
    } else if (Date.now() - start > 3000) {
      clearInterval(interval);
    }
  }, 100);
}

export {};
