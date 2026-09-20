/**
 * Counter-top customer display (pole display) over the Web Serial API.
 *
 * Handles both hardware families found on shop counters:
 *   • 2x20 character VFD displays  ("Test Product" / "TOTAL Rs 1500.00")
 *   • numeric-only LED displays     ("1500.00"   the 00.0 style panels)
 *
 * Works in Chrome / Edge on desktop over HTTPS (or localhost). The browser
 * needs one user gesture to grant a COM port; after that the grant is
 * remembered and we reconnect silently on later page loads.
 *
 * No server / DB writes   purely local hardware.
 */

import type { CustomerDisplayState } from "./customerDisplaySync";

const COLS = 20;

const BAUD_KEY = "pos_pole_display_baud";
const ENABLED_KEY = "pos_pole_display_enabled";
const PROTOCOL_KEY = "pos_pole_display_protocol";
const PORT_INDEX_KEY = "pos_pole_display_port_index";

export const POLE_BAUD_RATES = [2400, 4800, 9600, 19200, 38400, 57600, 115200];

/**
 * Wire protocol used to talk to the display.
 *  - `vfd2x20`  ESC/POS style: form-feed then two padded 20-char lines.
 *  - `escQA`    ESC Q A <text> CR   the most common price-display command.
 *  - `numeric`  Bare digits + CR, for LED panels that only show a number.
 */
export type PoleProtocol = "vfd2x20" | "escQA" | "numeric";

export const POLE_PROTOCOLS: Array<{ value: PoleProtocol; label: string; hint: string }> = [
  {
    value: "vfd2x20",
    label: "2-line text display (VFD)",
    hint: "Shows item name on top, total below",
  },
  {
    value: "escQA",
    label: "Price display (ESC Q A)",
    hint: "Most common for single-line price displays",
  },
  {
    value: "numeric",
    label: "Numeric LED only",
    hint: "Panels that can only show digits, e.g. 00.0",
  },
];

/* ---------- Web Serial typings (not in the default TS DOM lib) ---------- */

export interface SerialOpenOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: "none" | "even" | "odd";
  bufferSize?: number;
  flowControl?: "none" | "hardware";
}

export interface SerialPortLike {
  open(options: SerialOpenOptions): Promise<void>;
  close(): Promise<void>;
  forget?: () => Promise<void>;
  readonly writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

function getSerial(): SerialLike | null {
  const nav = navigator as Navigator & { serial?: SerialLike };
  return nav.serial ?? null;
}

export function isPoleDisplaySupported(): boolean {
  return Boolean(getSerial());
}

/** Human label for a granted port   the Web Serial API hides the COM name. */
export function describePort(port: SerialPortLike, index: number): string {
  const info = port.getInfo?.();
  if (info?.usbVendorId != null) {
    const vid = info.usbVendorId.toString(16).padStart(4, "0");
    const pid = (info.usbProductId ?? 0).toString(16).padStart(4, "0");
    return `Port ${index + 1}   USB ${vid}:${pid}`;
  }
  return `Port ${index + 1}   built-in / Bluetooth`;
}

export async function listGrantedPorts(): Promise<SerialPortLike[]> {
  const serial = getSerial();
  if (!serial) return [];
  try {
    return await serial.getPorts();
  } catch {
    return [];
  }
}

/** Opens the browser port picker so the user can grant another COM port. */
export async function requestNewPort(): Promise<SerialPortLike | null> {
  const serial = getSerial();
  if (!serial) return null;
  try {
    return await serial.requestPort();
  } catch {
    return null; // user dismissed the picker
  }
}

/* ---------- Stored preferences ---------- */

export function getPoleDisplayBaud(): number {
  const n = parseInt(localStorage.getItem(BAUD_KEY) ?? "", 10);
  return POLE_BAUD_RATES.includes(n) ? n : 9600;
}

export function setPoleDisplayBaud(baud: number): void {
  localStorage.setItem(BAUD_KEY, String(baud));
}

export function getPoleProtocol(): PoleProtocol {
  const raw = localStorage.getItem(PROTOCOL_KEY);
  return raw === "escQA" || raw === "numeric" || raw === "vfd2x20" ? raw : "vfd2x20";
}

export function setPoleProtocol(p: PoleProtocol): void {
  localStorage.setItem(PROTOCOL_KEY, p);
}

/* ---------- Connection state ---------- */

let port: SerialPortLike | null = null;
let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let writeQueue: Promise<void> = Promise.resolve();
const listeners = new Set<(connected: boolean) => void>();

export function onPoleDisplayChange(cb: (connected: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isPoleDisplayConnected(): boolean {
  return Boolean(port && writer);
}

function emit(): void {
  const connected = isPoleDisplayConnected();
  listeners.forEach((cb) => cb(connected));
}

/**
 * Turns the browser's terse `Failed to open serial port` into something a
 * cashier can act on.
 */
function explainOpenError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/already open|in use|locked/i.test(raw)) {
    return "That port is already in use. Close QZ Tray, the desktop POS app, or any other browser tab using the display, then try again.";
  }
  if (/access denied|permission/i.test(raw)) {
    return "Windows refused access to that port. Another program is holding it   close it and retry.";
  }
  if (/failed to open/i.test(raw)) {
    return "Could not open that port. It's usually the wrong port, or another program is holding it. Try 'Auto-detect' to test every port.";
  }
  if (/device.*(lost|disconnected)|no device/i.test(raw)) {
    return "The device disconnected. Check the display cable and try again.";
  }
  return raw || "Could not open the serial port.";
}

async function openPort(
  target: SerialPortLike,
  baudRate: number,
): Promise<void> {
  // Explicit framing   some CH340 / Prolific drivers refuse the defaults.
  await target.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none",
    bufferSize: 1024,
  });
  if (!target.writable) throw new Error("Serial port opened but is not writable");
  port = target;
  writer = target.writable.getWriter();
  emit();
  // ESC @   reset the display to a known state
  await writeBytes(new Uint8Array([0x1b, 0x40]));
}

/**
 * Connects to a specific granted port. `portIndex` refers to the order
 * returned by `listGrantedPorts()`.
 */
export async function connectToPort(
  portIndex: number,
  baudRate = getPoleDisplayBaud(),
): Promise<{ ok: boolean; error?: string }> {
  const ports = await listGrantedPorts();
  const target = ports[portIndex];
  if (!target) return { ok: false, error: "That port is no longer available. Click 'Add port'." };

  await disconnectPoleDisplay(true);
  try {
    await openPort(target, baudRate);
    setPoleDisplayBaud(baudRate);
    localStorage.setItem(PORT_INDEX_KEY, String(portIndex));
    localStorage.setItem(ENABLED_KEY, "true");
    return { ok: true };
  } catch (err) {
    port = null;
    writer = null;
    emit();
    return { ok: false, error: explainOpenError(err) };
  }
}

/** Prompts for a port, then connects to it. */
export async function connectPoleDisplay(
  baudRate = getPoleDisplayBaud(),
): Promise<{ ok: boolean; error?: string }> {
  const serial = getSerial();
  if (!serial) {
    return {
      ok: false,
      error: "This browser can't talk to serial devices. Use Chrome or Edge on a desktop PC.",
    };
  }
  const chosen = await requestNewPort();
  if (!chosen) return { ok: false }; // picker dismissed   stay quiet
  const ports = await listGrantedPorts();
  const index = ports.indexOf(chosen);
  return connectToPort(index >= 0 ? index : 0, baudRate);
}

/** Reconnects to the last working port with no prompt. Call on POS mount. */
export async function reconnectPoleDisplay(): Promise<boolean> {
  if (!getSerial()) return false;
  if (localStorage.getItem(ENABLED_KEY) !== "true") return false;
  if (isPoleDisplayConnected()) return true;

  const ports = await listGrantedPorts();
  if (!ports.length) return false;

  const saved = parseInt(localStorage.getItem(PORT_INDEX_KEY) ?? "0", 10);
  const order = [saved, ...ports.map((_, i) => i).filter((i) => i !== saved)];

  for (const i of order) {
    if (!ports[i]) continue;
    const res = await connectToPort(i, getPoleDisplayBaud());
    if (res.ok) return true;
  }
  return false;
}

export async function disconnectPoleDisplay(remember = true): Promise<void> {
  if (!remember) localStorage.setItem(ENABLED_KEY, "false");
  try {
    writer?.releaseLock();
  } catch {
    /* ignore */
  }
  writer = null;
  try {
    await port?.close();
  } catch {
    /* ignore */
  }
  port = null;
  emit();
}

/* ---------- Frame building ---------- */

function fit(text: string, width = COLS): string {
  const t = (text ?? "").replace(/[\r\n]/g, " ");
  return t.length > width ? t.slice(0, width) : t.padEnd(width, " ");
}

/** Left label + right value squeezed onto one 20-char line. */
function pair(left: string, right: string): string {
  const r = right.slice(0, COLS);
  const l = left.slice(0, Math.max(0, COLS - r.length - 1));
  return `${l}${" ".repeat(Math.max(1, COLS - l.length - r.length))}${r}`;
}

function center(text: string): string {
  const s = text.slice(0, COLS);
  return " ".repeat(Math.floor((COLS - s.length) / 2)) + s;
}

function money(n: number): string {
  return `Rs ${Number(n ?? 0).toFixed(2)}`;
}

function writeBytes(bytes: Uint8Array): Promise<void> {
  if (!writer) return Promise.resolve();
  // Serialise writes so rapid cart updates can't interleave mid-frame
  writeQueue = writeQueue
    .then(() => writer?.write(bytes))
    .catch(() => {
      // Cable unplugged / device reset   drop the connection cleanly
      void disconnectPoleDisplay();
    });
  return writeQueue;
}

/**
 * Sends one screen to the display, encoded for the configured protocol.
 * `line1` is the descriptive line, `amount` the number the customer cares about.
 */
function send(line1: string, line2: string, amount: number, protocol = getPoleProtocol()): void {
  if (!isPoleDisplayConnected()) return;
  const enc = new TextEncoder();

  if (protocol === "numeric") {
    // LED panels that render digits only   no letters, no padding.
    void writeBytes(enc.encode(`${Number(amount ?? 0).toFixed(2)}\r`));
    return;
  }

  if (protocol === "escQA") {
    // ESC Q A <text> CR   single line, cleared automatically by the display.
    void writeBytes(
      new Uint8Array([
        0x1b, 0x51, 0x41,
        ...enc.encode(line2.trim().slice(0, COLS)),
        0x0d,
      ]),
    );
    return;
  }

  // vfd2x20: form feed clears, then two fixed-width lines fill the panel.
  void writeBytes(enc.encode(`\x0C${fit(line1)}${fit(line2)}`));
}

/** Low-level escape hatch   writes two raw lines with the current protocol. */
export function showOnPoleDisplay(line1: string, line2: string, amount = 0): void {
  send(line1, line2, amount);
}

/** Renders the shared customer-display payload onto the display. */
export function renderPoleDisplay(
  state: Pick<
    CustomerDisplayState,
    "items" | "lastItem" | "total" | "status" | "businessName"
  > & { change?: number },
): void {
  if (!isPoleDisplayConnected()) return;

  if (state.status === "success") {
    if (state.change && state.change > 0) {
      send(pair("CHANGE", money(state.change)), center("THANK YOU!"), state.change);
    } else {
      send(pair("PAID", money(state.total)), center("THANK YOU!"), state.total);
    }
    return;
  }

  if (!state.items?.length) {
    send(
      center(state.businessName?.toUpperCase() ?? "WELCOME"),
      center("WELCOME!"),
      0,
    );
    return;
  }

  const last = state.lastItem;
  const label = last
    ? last.quantity > 1
      ? `${last.quantity}x ${last.name}`
      : last.name
    : `ITEMS ${state.items.length}`;
  send(fit(label), pair("TOTAL", money(state.total)), state.total);
}

/** Sends a sample frame so the cashier can confirm wiring / baud / protocol. */
export function testPoleDisplay(protocol = getPoleProtocol()): void {
  send(fit("Test Product"), pair("TOTAL", money(1500)), 1500, protocol);
}

/* ---------- Auto-detect ---------- */

export interface DetectAttempt {
  portIndex: number;
  portLabel: string;
  baudRate: number;
  protocol: PoleProtocol;
  opened: boolean;
  error?: string;
}

export interface DetectResult {
  attempts: DetectAttempt[];
  /** Every combination that opened successfully and got a test frame. */
  candidates: DetectAttempt[];
}

/**
 * Walks every granted port at the common baud rates, opens it and pushes a
 * test frame in each protocol. The cashier watches the display and picks
 * whichever attempt actually showed something.
 */
export async function autoDetectPoleDisplay(
  onProgress?: (attempt: DetectAttempt, done: number, totalSteps: number) => void,
  perFrameDelayMs = 700,
): Promise<DetectResult> {
  const ports = await listGrantedPorts();
  const attempts: DetectAttempt[] = [];
  const candidates: DetectAttempt[] = [];

  const bauds = [9600, 2400, 19200, 4800, 38400, 115200];
  const protocols: PoleProtocol[] = ["vfd2x20", "escQA", "numeric"];
  const totalSteps = ports.length * bauds.length * protocols.length;
  let done = 0;

  await disconnectPoleDisplay(true);

  for (let i = 0; i < ports.length; i += 1) {
    const label = describePort(ports[i], i);

    for (const baudRate of bauds) {
      let opened = false;
      let openError: string | undefined;

      try {
        await openPort(ports[i], baudRate);
        opened = true;
      } catch (err) {
        openError = explainOpenError(err);
      }

      for (const protocol of protocols) {
        const attempt: DetectAttempt = {
          portIndex: i,
          portLabel: label,
          baudRate,
          protocol,
          opened,
          error: openError,
        };

        if (opened) {
          testPoleDisplay(protocol);
          candidates.push(attempt);
          await new Promise((r) => setTimeout(r, perFrameDelayMs));
        }

        attempts.push(attempt);
        done += 1;
        onProgress?.(attempt, done, totalSteps);
      }

      if (opened) await disconnectPoleDisplay(true);
    }
  }

  return { attempts, candidates };
}

/** Locks in a combination found during auto-detect. */
export async function applyDetected(
  attempt: Pick<DetectAttempt, "portIndex" | "baudRate" | "protocol">,
): Promise<{ ok: boolean; error?: string }> {
  setPoleProtocol(attempt.protocol);
  return connectToPort(attempt.portIndex, attempt.baudRate);
}
