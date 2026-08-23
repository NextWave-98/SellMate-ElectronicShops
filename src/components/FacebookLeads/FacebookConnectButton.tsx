import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import alert from '../../utils/alert';
import facebookLeadsService from '../../services/facebookLeadsService';
import type { FacebookPage } from '../../services/facebookLeadsService';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        callback: (response: { authResponse?: { accessToken?: string } }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
  }
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;

// Permissions required to read a Page's lead-gen forms and retrieve leads.
// Overridable via VITE_FB_LEADS_SCOPE so scopes can be tuned (e.g. to test
// incrementally) without a code change — must match what the Meta app has enabled.
const FB_LEADS_SCOPE =
  (import.meta.env.VITE_FB_LEADS_SCOPE as string | undefined) ||
  'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_manage_ads,leads_retrieval,business_management';

interface FacebookConnectButtonProps {
  organizationId: string;
  branchId: string;
  /** Called with the list of pages returned after a successful connect. */
  onConnected: (pages: FacebookPage[]) => void;
  disabled?: boolean;
}

const FacebookConnectButton: React.FC<FacebookConnectButtonProps> = ({
  organizationId,
  branchId,
  onConnected,
  disabled,
}) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    if (!META_APP_ID) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v19.0',
      });
      setSdkReady(true);
      setSdkError(null);
    };

    // If the SDK is loaded but doesn't initialize within a few seconds, stop
    // spinning forever and tell the user why (blocked script / bad app id / domain).
    const timeout = window.setTimeout(() => {
      setSdkReady((ready) => {
        if (!ready) {
          setSdkError(
            'Facebook SDK did not load. Disable ad/tracking blockers, then check that VITE_META_APP_ID is set and this domain is whitelisted in the Meta app.',
          );
        }
        return ready;
      });
    }, 8000);

    if (document.getElementById('facebook-jssdk')) {
      if (window.FB) setSdkReady(true);
      return () => window.clearTimeout(timeout);
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = () =>
      setSdkError('Could not download the Facebook SDK (connect.facebook.net was blocked).');
    document.body.appendChild(script);

    return () => window.clearTimeout(timeout);
  }, []);

  const exchangeToken = useCallback(
    async (token: string) => {
      const res = await facebookLeadsService.connect(organizationId, branchId, token);
      onConnected(res.data.pages);
    },
    [organizationId, branchId, onConnected],
  );

  const handleConnect = () => {
    if (!META_APP_ID) {
      alert.error('VITE_META_APP_ID is not configured.');
      return;
    }
    if (!window.FB || !sdkReady) {
      alert.error('Facebook SDK is still loading. Please wait a moment.');
      return;
    }
    // Facebook blocks FB.login on http pages — fail with a clear message instead
    // of the SDK's cryptic console error.
    if (window.location.protocol !== 'https:') {
      alert.error(
        'Facebook login requires HTTPS. Open the app at https://localhost:<port> ' +
          '(set VITE_HTTPS=true in the frontend .env and restart the dev server).',
      );
      return;
    }
    if (!branchId) {
      alert.error('Select a branch first.');
      return;
    }

    setConnecting(true);

    // NOTE: FB.login requires a *plain* (non-async) callback — passing an async
    // function throws "Expression is of type asyncfunction, not function".
    // Do the async work inside an IIFE instead.
    window.FB.login(
      (response) => {
        void (async () => {
          try {
            const token = response.authResponse?.accessToken;
            if (!token) {
              alert.warn('Facebook connection was cancelled.');
              return;
            }
            await exchangeToken(token);
            alert.success('Facebook account connected. Now select a page.');
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to connect Facebook';
            alert.error(msg);
          } finally {
            setConnecting(false);
          }
        })();
      },
      {
        scope: FB_LEADS_SCOPE,
        return_scopes: true,
        // Force Meta to re-prompt for any previously declined / missing scopes
        // (e.g. pages_manage_ads). Without this, reconnect keeps the old grants.
        auth_type: 'rerequest',
      },
    );
  };

  if (!META_APP_ID) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        Set <code className="font-mono">VITE_META_APP_ID</code> in your frontend environment to
        enable Facebook lead connection.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleConnect}
        disabled={disabled || connecting || !sdkReady}
        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white h-12 text-base font-semibold"
      >
        {connecting
          ? 'Connecting…'
          : sdkReady
            ? '🔵 Continue with Facebook'
            : sdkError
              ? 'Facebook SDK unavailable'
              : 'Loading Facebook SDK…'}
      </Button>
      {sdkError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          {sdkError}
        </p>
      )}
    </div>
  );
};

export default FacebookConnectButton;
