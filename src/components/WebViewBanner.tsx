import { useState, useEffect } from 'react';
import { getDevice } from '../utils/device';

/**
 * Banner shown to mobile users who are inside Phantom's in-app browser.
 * Suggests opening in Safari/Chrome for better game performance.
 * The game still works in Phantom's browser, just with potential lag.
 */
export default function WebViewBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    const device = getDevice();
    // Only show on mobile WebViews (Phantom, etc.)
    // Check if user previously dismissed this session
    const wasDismissed = sessionStorage.getItem('webview-banner-dismissed');
    if (device.isPhantomWebView && !wasDismissed) {
      setShowBanner(true);
    }
  }, []);
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem('webview-banner-dismissed', 'true');
  };
  
  if (!showBanner || dismissed) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)',
      borderBottom: '2px solid #9b5cff',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: '0 4px 20px rgba(155, 92, 255, 0.3)',
    }}>
      {/* Header with close button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div style={{
          color: '#fff',
          fontSize: '13px',
          lineHeight: '1.4',
          flex: 1,
        }}>
          <span style={{ fontSize: '16px' }}>🚀</span>{' '}
          <strong style={{ color: '#4ef0c5' }}>Better Performance Available!</strong>
          <br />
          <span style={{ color: '#ccc', fontSize: '12px' }}>
            Open in Safari/Chrome for smoother gameplay. Copy the link below:
          </span>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 0 0 10px',
            lineHeight: '1',
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      
      {/* Copy link button */}
      <button
        onClick={handleCopyLink}
        style={{
          background: copied 
            ? 'linear-gradient(135deg, #4ef0c5, #00ff88)' 
            : 'linear-gradient(135deg, #9b5cff, #4ef0c5)',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 16px',
          color: '#0a0517',
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        {copied ? (
          <>✅ Link Copied! Paste in Safari/Chrome</>
        ) : (
          <>📋 Copy Game Link</>
        )}
      </button>
      
      {/* Small note */}
      <div style={{
        color: '#888',
        fontSize: '10px',
        textAlign: 'center',
      }}>
        You can still play here, but your browser runs the game faster
      </div>
    </div>
  );
}

