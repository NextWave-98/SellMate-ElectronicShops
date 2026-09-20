import { useCallback, useEffect, useState } from "react";
import {
  isPoleDisplayConnected,
  isPoleDisplaySupported,
  onPoleDisplayChange,
  reconnectPoleDisplay,
} from "../lib/poleDisplay";

/**
 * Tracks the counter-top serial pole display (the small screen that shows the
 * customer each price). Silently reconnects to the last working COM port;
 * `openSetup` opens the setup dialog for picking/auto-detecting a port.
 */
export function usePoleDisplay() {
  const supported = isPoleDisplaySupported();
  const [connected, setConnected] = useState(isPoleDisplayConnected);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => onPoleDisplayChange(setConnected), []);

  useEffect(() => {
    if (!supported) return;
    void reconnectPoleDisplay();
  }, [supported]);

  const openSetup = useCallback(() => setSetupOpen(true), []);
  const closeSetup = useCallback(() => setSetupOpen(false), []);

  return { supported, connected, setupOpen, openSetup, closeSetup };
}
