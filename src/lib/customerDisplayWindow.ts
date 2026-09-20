type ScreenLike = {
  left?: number;
  top?: number;
  availLeft?: number;
  availTop?: number;
  width?: number;
  height?: number;
  availWidth?: number;
  availHeight?: number;
  isPrimary?: boolean;
};

type ScreenDetailsLike = {
  currentScreen?: ScreenLike;
  screens?: ScreenLike[];
};

type WindowWithScreenDetails = Window & {
  getScreenDetails?: () => Promise<ScreenDetailsLike>;
};

const SECOND_SCREEN_AUTO_KEY = "customer_display_auto_second_screen";

function getBounds(screenLike?: ScreenLike) {
  const left = Math.round(screenLike?.availLeft ?? screenLike?.left ?? window.screenX ?? 0);
  const top = Math.round(screenLike?.availTop ?? screenLike?.top ?? window.screenY ?? 0);
  const width = Math.max(
    800,
    Math.round(
      screenLike?.availWidth ?? screenLike?.width ?? window.outerWidth ?? window.innerWidth ?? 1024,
    ),
  );
  const height = Math.max(
    600,
    Math.round(
      screenLike?.availHeight ?? screenLike?.height ?? window.outerHeight ?? window.innerHeight ?? 768,
    ),
  );
  return { left, top, width, height };
}

function readAutoSecondScreenPreference() {
  try {
    return localStorage.getItem(SECOND_SCREEN_AUTO_KEY) !== "false";
  } catch {
    return true;
  }
}

function rememberAutoSecondScreen(enabled: boolean) {
  try {
    localStorage.setItem(SECOND_SCREEN_AUTO_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

async function resolveTargetBounds() {
  const screenApiWindow = window as WindowWithScreenDetails;
  if (!readAutoSecondScreenPreference() || typeof screenApiWindow.getScreenDetails !== "function") {
    return getBounds();
  }

  try {
    const details = await screenApiWindow.getScreenDetails();
    const screens = details.screens ?? [];
    const current = details.currentScreen;
    const secondary =
      screens.find((screenLike) => screenLike !== current && !screenLike.isPrimary) ??
      screens.find((screenLike) => screenLike !== current);

    if (secondary) {
      rememberAutoSecondScreen(true);
      return getBounds(secondary);
    }
  } catch {
    // Permission denied or unsupported browser behavior. Fall back to current screen.
  }

  return getBounds();
}

function buildPopupFeatures(bounds: { left: number; top: number; width: number; height: number }) {
  return [
    `left=${bounds.left}`,
    `top=${bounds.top}`,
    `width=${bounds.width}`,
    `height=${bounds.height}`,
    "popup=yes",
    "resizable=yes",
    "scrollbars=no",
    "toolbar=no",
    "menubar=no",
    "location=no",
    "status=no",
  ].join(",");
}

export async function openCustomerDisplayWindow(sessionId: string) {
  const bounds = await resolveTargetBounds();
  const popup = window.open(
    `/pos/customer-display?session=${encodeURIComponent(sessionId)}&autofullscreen=1`,
    "pos_customer_display",
    buildPopupFeatures(bounds),
  );

  if (!popup) return null;

  try {
    popup.moveTo(bounds.left, bounds.top);
    popup.resizeTo(bounds.width, bounds.height);
  } catch {
    // Browsers may block manual placement even after opening.
  }

  rememberAutoSecondScreen(true);
  return popup;
}
