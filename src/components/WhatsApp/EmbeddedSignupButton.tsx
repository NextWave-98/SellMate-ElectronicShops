import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import alert from '../../utils/alert';
import whatsappService from '../../services/whatsappService';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
  }
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const EMBEDDED_CONFIG_ID = import.meta.env.VITE_META_EMBEDDED_SIGNUP_CONFIG_ID as string | undefined;

interface EmbeddedSignupButtonProps {
  organizationId: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

const EmbeddedSignupButton: React.FC<EmbeddedSignupButtonProps> = ({
  organizationId,
  onSuccess,
  disabled,
}) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const phoneNumberIdRef = useRef<string | null>(null);
  const wabaIdRef = useRef<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return;
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.event === 'FINISH') {
          phoneNumberIdRef.current = data.data?.phone_number_id ?? null;
          wabaIdRef.current = data.data?.waba_id ?? null;
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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
    };

    if (document.getElementById('facebook-jssdk')) {
      if (window.FB) setSdkReady(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const exchangeCode = useCallback(
    async (code: string) => {
      const phoneNumberId = phoneNumberIdRef.current;
      const wabaId = wabaIdRef.current;

      if (!phoneNumberId || !wabaId) {
        throw new Error(
          'Missing phone number or WABA ID from Meta. Complete the signup popup and try again.',
        );
      }

      await whatsappService.embeddedSignup(organizationId, {
        code,
        phoneNumberId,
        wabaId,
      });
    },
    [organizationId],
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

    phoneNumberIdRef.current = null;
    wabaIdRef.current = null;
    setConnecting(true);

    const loginOptions: Record<string, unknown> = {
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: '',
        sessionInfoVersion: '3',
      },
    };

    if (EMBEDDED_CONFIG_ID) {
      loginOptions.config_id = EMBEDDED_CONFIG_ID;
    } else {
      loginOptions.scope = 'whatsapp_business_management,whatsapp_business_messaging';
      loginOptions.return_scopes = true;
    }

    window.FB.login(async (response) => {
      try {
        const code = response.authResponse?.code;
        if (!code) {
          alert.warn('WhatsApp connection was cancelled.');
          return;
        }

        await exchangeCode(code);
        alert.success('WhatsApp Business connected successfully!');
        onSuccess?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to connect WhatsApp';
        alert.error(msg);
      } finally {
        setConnecting(false);
      }
    }, loginOptions);
  };

  if (!META_APP_ID) {
    return (
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        Set <code className="font-mono">VITE_META_APP_ID</code> in your frontend environment to
        enable one-click WhatsApp signup.
      </p>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleConnect}
      disabled={disabled || connecting || !sdkReady}
      className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white h-12 text-base font-semibold"
    >
      {connecting ? 'Connecting…' : sdkReady ? '🔵 Continue with Facebook' : 'Loading Facebook SDK…'}
    </Button>
  );
};

export default EmbeddedSignupButton;
