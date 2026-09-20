import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Check,
  Loader2,
  Plug,
  RefreshCw,
  Tv2,
  X,
  Zap,
} from "lucide-react";
import {
  applyDetected,
  autoDetectPoleDisplay,
  connectToPort,
  describePort,
  disconnectPoleDisplay,
  getPoleDisplayBaud,
  getPoleProtocol,
  isPoleDisplayConnected,
  isPoleDisplaySupported,
  listGrantedPorts,
  POLE_BAUD_RATES,
  POLE_PROTOCOLS,
  requestNewPort,
  setPoleProtocol,
  testPoleDisplay,
  type DetectAttempt,
  type PoleProtocol,
} from "../../../lib/poleDisplay";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PoleDisplayModal({ open, onClose }: Props) {
  const supported = isPoleDisplaySupported();

  const [ports, setPorts] = useState<string[]>([]);
  const [portIndex, setPortIndex] = useState(0);
  const [baud, setBaud] = useState(getPoleDisplayBaud());
  const [protocol, setProtocol] = useState<PoleProtocol>(getPoleProtocol());
  const [connected, setConnected] = useState(isPoleDisplayConnected());
  const [busy, setBusy] = useState(false);

  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [candidates, setCandidates] = useState<DetectAttempt[]>([]);

  const refreshPorts = useCallback(async () => {
    const list = await listGrantedPorts();
    setPorts(list.map((p, i) => describePort(p, i)));
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshPorts();
    setConnected(isPoleDisplayConnected());
  }, [open, refreshPorts]);

  if (!open) return null;

  const addPort = async () => {
    const granted = await requestNewPort();
    if (!granted) return;
    await refreshPorts();
    const list = await listGrantedPorts();
    setPortIndex(Math.max(0, list.length - 1));
    toast.success("Port added   now click Connect");
  };

  const connect = async () => {
    setBusy(true);
    try {
      setPoleProtocol(protocol);
      const res = await connectToPort(portIndex, baud);
      setConnected(isPoleDisplayConnected());
      if (res.ok) {
        toast.success("Pole display connected");
        testPoleDisplay(protocol);
      } else if (res.error) {
        toast.error(res.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    await disconnectPoleDisplay(false);
    setConnected(false);
    toast.success("Pole display disconnected");
  };

  const runAutoDetect = async () => {
    const list = await listGrantedPorts();
    if (!list.length) {
      toast.error("Add at least one port first");
      return;
    }
    setDetecting(true);
    setCandidates([]);
    try {
      const result = await autoDetectPoleDisplay((attempt, done, total) => {
        setProgress({
          done,
          total,
          label: `${attempt.portLabel} · ${attempt.baudRate} baud · ${attempt.protocol}`,
        });
      });
      setCandidates(result.candidates);
      setConnected(isPoleDisplayConnected());
      if (!result.candidates.length) {
        toast.error("No port could be opened. See the troubleshooting notes below.");
      } else {
        toast.success(
          `${result.candidates.length} combination(s) sent a test frame   pick the one that showed up`,
        );
      }
    } finally {
      setDetecting(false);
      setProgress({ done: 0, total: 0, label: "" });
    }
  };

  const useCandidate = async (c: DetectAttempt) => {
    const res = await applyDetected(c);
    setConnected(isPoleDisplayConnected());
    if (res.ok) {
      setPortIndex(c.portIndex);
      setBaud(c.baudRate);
      setProtocol(c.protocol);
      toast.success("Saved   this is now your pole display");
      testPoleDisplay(c.protocol);
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 p-4">
          <Tv2 className="h-5 w-5 text-[#1e3a8a]" />
          <h2 className="flex-1 text-lg font-bold text-gray-900">Pole Display Setup</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              connected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {connected ? "Connected" : "Not connected"}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {!supported && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                This browser can&apos;t talk to serial devices. Open the POS in{" "}
                <strong>Chrome</strong> or <strong>Edge</strong> on a desktop PC.
              </span>
            </div>
          )}

          {/* Auto-detect */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-600" />
              <strong className="text-sm text-indigo-900">
                Don&apos;t know which port? Auto-detect
              </strong>
            </div>
            <p className="mb-3 text-xs text-indigo-800">
              Sends a test frame to every port at every speed. Watch the display  
              when something appears, pick that line below.
            </p>
            <button
              onClick={runAutoDetect}
              disabled={detecting || !supported}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {detecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {detecting ? "Testing…" : "Run auto-detect"}
            </button>

            {detecting && progress.total > 0 && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
                <p className="mt-1 truncate text-xs text-indigo-700">{progress.label}</p>
              </div>
            )}

            {candidates.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-indigo-900">
                  Which one appeared on the display?
                </p>
                {candidates.map((c, i) => (
                  <button
                    key={`${c.portIndex}-${c.baudRate}-${c.protocol}-${i}`}
                    onClick={() => useCandidate(c)}
                    className="flex w-full items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-left text-xs hover:bg-indigo-100"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="flex-1">
                      {c.portLabel} · {c.baudRate} baud ·{" "}
                      {POLE_PROTOCOLS.find((p) => p.value === c.protocol)?.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual setup */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-semibold text-gray-700">
                COM port
                <button
                  onClick={refreshPorts}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1e3a8a] hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              </label>
              <div className="flex gap-2">
                <select
                  value={portIndex}
                  onChange={(e) => setPortIndex(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                >
                  {!ports.length && <option value={0}>No ports granted yet</option>}
                  {ports.map((label, i) => (
                    <option key={label} value={i}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addPort}
                  disabled={!supported}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                >
                  <Plug className="h-4 w-4" />
                  Add port
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Speed (baud)
                </label>
                <select
                  value={baud}
                  onChange={(e) => setBaud(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                >
                  {POLE_BAUD_RATES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Display type
                </label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as PoleProtocol)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                >
                  {POLE_PROTOCOLS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {POLE_PROTOCOLS.find((p) => p.value === protocol)?.hint}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={connect}
                disabled={busy || !supported || !ports.length}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect
              </button>
              <button
                onClick={() => testPoleDisplay(protocol)}
                disabled={!connected}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Send test
              </button>
              <button
                onClick={disconnect}
                disabled={!connected}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Troubleshooting */}
          <details className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800">
              &quot;Failed to open serial port&quot;   what to check
            </summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-gray-600">
              <li>
                <strong>Close anything else using the port</strong>   QZ Tray, the
                desktop POS app, Notepad-style COM tools, or another browser tab
                that already connected. Windows only lets one program hold a port.
              </li>
              <li>
                <strong>Skip Bluetooth ports.</strong> Entries like
                &quot;Bluetooth Peripheral Device&quot; or &quot;JL_SPP&quot; are
                headsets, not your display   they will always fail to open.
              </li>
              <li>
                <strong>Check Device Manager → Ports (COM &amp; LPT).</strong> A USB
                display shows up as USB-SERIAL CH340, Prolific or FTDI. If you see a
                yellow warning triangle, install that driver first.
              </li>
              <li>
                <strong>Built-in POS displays</strong> are usually on COM1 or COM2 at
                2400 or 9600 baud   auto-detect covers both.
              </li>
              <li>
                Still nothing? Unplug and replug the display cable, then reload this
                page and try auto-detect again.
              </li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
