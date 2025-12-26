/**
 * Phantom Mobile Wallet Connection with explicit redirect
 * 
 * On mobile, when user clicks "Connect Wallet", we need to:
 * 1. Build a deep link to Phantom app with redirect URL
 * 2. Phantom opens, user approves
 * 3. Phantom redirects back to our app URL with connection info
 * 4. We process the redirect and establish the connection
 */

import { getDevice } from './device';

/**
 * Detect if we're on mobile and should use Phantom's mobile deep link flow
 */
export function shouldUseMobileDeepLink(): boolean {
  const device = getDevice();
  
  // Use deep link if on mobile AND not already in Phantom's WebView
  // (if in Phantom's WebView, the injected provider works directly)
  return device.isMobile && !device.isPhantomWebView;
}

/**
 * Build Phantom's universal link for mobile wallet connection
 * This ensures user is redirected back to browser after approval
 */
export function buildPhantomConnectURL(): string {
  // Current page URL - this is where Phantom will redirect back to
  const redirectUrl = window.location.href;
  
  // Phantom's universal link format:
  // https://phantom.app/ul/v1/connect?app_url=<encoded-url>&redirect_link=<encoded-url>
  const appUrl = encodeURIComponent(window.location.origin);
  const redirect = encodeURIComponent(redirectUrl);
  
  // cluster parameter (mainnet-beta)
  const cluster = 'mainnet-beta';
  
  const phantomUrl = `https://phantom.app/ul/v1/connect?app_url=${appUrl}&redirect_link=${redirect}&cluster=${cluster}`;
  
  console.log('[PhantomMobile] Building connect URL:', {
    appUrl: window.location.origin,
    redirectUrl,
    phantomUrl: phantomUrl.substring(0, 100) + '...'
  });
  
  return phantomUrl;
}

/**
 * Trigger mobile wallet connection by opening Phantom app
 * After approval, Phantom will redirect back to the browser
 */
export function connectPhantomMobile(): void {
  const connectUrl = buildPhantomConnectURL();
  
  console.log('[PhantomMobile] Opening Phantom app for connection...');
  
  // Set a flag so we know we're waiting for redirect
  sessionStorage.setItem('phantom-mobile-connecting', 'true');
  sessionStorage.setItem('phantom-redirect-timestamp', Date.now().toString());
  
  // Open Phantom app via universal link
  // User will approve in Phantom, then be redirected back
  window.location.href = connectUrl;
}

/**
 * Check if we just returned from Phantom mobile redirect
 */
export function isReturningFromPhantom(): boolean {
  const connecting = sessionStorage.getItem('phantom-mobile-connecting');
  const timestamp = sessionStorage.getItem('phantom-redirect-timestamp');
  
  if (!connecting) return false;
  
  // Check if redirect happened recently (within last 60 seconds)
  if (timestamp) {
    const elapsed = Date.now() - parseInt(timestamp);
    const recentRedirect = elapsed < 60000; // 60 seconds
    
    if (recentRedirect) {
      console.log('[PhantomMobile] Detected return from Phantom redirect');
      return true;
    }
  }
  
  return false;
}

/**
 * Clear redirect flags after processing
 */
export function clearPhantomRedirectFlags(): void {
  sessionStorage.removeItem('phantom-mobile-connecting');
  sessionStorage.removeItem('phantom-redirect-timestamp');
}

/**
 * Process the redirect from Phantom and extract connection info
 * Phantom adds query parameters with the connection details
 */
export function processPhantomRedirect(): {
  publicKey?: string;
  session?: string;
} | null {
  if (!isReturningFromPhantom()) return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  
  // Phantom adds these params on redirect
  const publicKey = urlParams.get('phantom_encryption_public_key');
  const session = urlParams.get('nonce');
  
  if (publicKey) {
    console.log('[PhantomMobile] Processing redirect with public key:', publicKey.substring(0, 20) + '...');
    
    // Clean up URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    clearPhantomRedirectFlags();
    
    return { publicKey, session };
  }
  
  return null;
}

