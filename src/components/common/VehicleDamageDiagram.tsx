/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export interface DamageMarker {
  x: number; // 0..100 (% of width)
  y: number; // 0..100 (% of height)
  view: string; // FRONT | REAR | LEFT | RIGHT | TOP
  type?: string;
  severity?: 'MINOR' | 'MODERATE' | 'SEVERE' | string;
  note?: string;
  photoUrl?: string;
}

const VIEWS = ['TOP', 'FRONT', 'REAR', 'LEFT', 'RIGHT'] as const;
const SEVERITY_COLORS: Record<string, string> = { MINOR: '#22c55e', MODERATE: '#f59e0b', SEVERE: '#ef4444' };
const SEVERITY_CYCLE = ['MINOR', 'MODERATE', 'SEVERE'];

/** Simple per-view vehicle outlines (viewBox 0 0 100 150). */
function VehicleOutline({ view }: { view: string }) {
  switch (view) {
    case 'FRONT':
    case 'REAR':
      return (
        <>
          <rect x="18" y="45" width="64" height="70" rx="10" fill="#e5e7eb" stroke="#9ca3af" />
          <rect x="26" y="52" width="48" height="24" rx="6" fill="#d1d5db" />
          <circle cx="30" cy="118" r="8" fill="#374151" />
          <circle cx="70" cy="118" r="8" fill="#374151" />
          <rect x="30" y="88" width="12" height="8" rx="2" fill="#cbd5e1" />
          <rect x="58" y="88" width="12" height="8" rx="2" fill="#cbd5e1" />
          <text x="50" y="140" textAnchor="middle" fontSize="6" fill="#6b7280">{view}</text>
        </>
      );
    case 'LEFT':
    case 'RIGHT':
      return (
        <>
          <path d="M10 95 L18 65 L40 55 L70 55 L88 75 L90 95 Z" fill="#e5e7eb" stroke="#9ca3af" />
          <path d="M40 57 L66 57 L80 74 L42 74 Z" fill="#d1d5db" />
          <circle cx="30" cy="98" r="9" fill="#374151" />
          <circle cx="72" cy="98" r="9" fill="#374151" />
          <text x="50" y="120" textAnchor="middle" fontSize="6" fill="#6b7280">{view} side</text>
        </>
      );
    default: // TOP
      return (
        <>
          <rect x="20" y="10" width="60" height="130" rx="18" fill="#e5e7eb" stroke="#9ca3af" />
          <rect x="28" y="24" width="44" height="26" rx="6" fill="#d1d5db" />
          <rect x="28" y="100" width="44" height="24" rx="6" fill="#d1d5db" />
          <rect x="30" y="56" width="40" height="38" rx="4" fill="#cbd5e1" />
          <text x="50" y="8" textAnchor="middle" fontSize="5" fill="#6b7280">FRONT</text>
          <text x="50" y="148" textAnchor="middle" fontSize="5" fill="#6b7280">REAR</text>
        </>
      );
  }
}

/**
 * Interactive multi-view vehicle damage diagram.
 * Pick a view, tap the car to drop a marker, tap a dot to cycle severity, add a note.
 */
export default function VehicleDamageDiagram({
  value = [], onChange, readOnly = false,
}: { value?: DamageMarker[]; onChange?: (m: DamageMarker[]) => void; readOnly?: boolean }) {
  const [activeView, setActiveView] = useState<string>('TOP');
  const [note, setNote] = useState('');

  const viewMarkers = value.map((m, i) => ({ m, i })).filter(({ m }) => (m.view || 'TOP') === activeView);

  const addMarker = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onChange) return;
    const rect = (e.currentTarget as any).getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onChange([...value, { x, y, view: activeView, severity: 'MINOR', note: note || undefined }]);
    setNote('');
  };
  const cycleSeverity = (i: number) => {
    if (readOnly || !onChange) return;
    const cur = value[i];
    const next = SEVERITY_CYCLE[(SEVERITY_CYCLE.indexOf(cur.severity || 'MINOR') + 1) % SEVERITY_CYCLE.length];
    onChange(value.map((m, idx) => idx === i ? { ...m, severity: next } : m));
  };
  const remove = (i: number) => { if (onChange) onChange(value.filter((_, idx) => idx !== i)); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-1.5">
        {VIEWS.map((v) => {
          const count = value.filter((m) => (m.view || 'TOP') === v).length;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setActiveView(v)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition ${activeView === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {v}{count > 0 && <span className="ml-1 opacity-80">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="mx-auto w-full max-w-[240px]">
        <div className="relative mx-auto aspect-[2/3] w-full overflow-hidden rounded-xl border bg-gray-50 select-none">
          <svg viewBox="0 0 100 150" className="absolute inset-0 h-full w-full cursor-crosshair" onClick={addMarker}>
            <VehicleOutline view={activeView} />
            {viewMarkers.map(({ m, i }, n) => (
              <g key={i} onClick={(e) => { e.stopPropagation(); cycleSeverity(i); }} style={{ cursor: 'pointer' }}>
                <circle cx={m.x} cy={m.y * 1.5} r="4" fill={SEVERITY_COLORS[m.severity || 'MINOR'] || '#ef4444'} stroke="#fff" strokeWidth="1" />
                <text x={m.x} y={m.y * 1.5 + 2} textAnchor="middle" fontSize="4" fill="#fff">{n + 1}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {!readOnly && (
        <input
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
          placeholder={`Note for next mark on ${activeView} (e.g. scratch, dent)…`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}

      {viewMarkers.length > 0 && (
        <div className="space-y-1.5">
          {viewMarkers.map(({ m, i }, n) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center shrink-0" style={{ background: SEVERITY_COLORS[m.severity || 'MINOR'] }}>{n + 1}</span>
              <span className="font-medium">{m.severity || 'MINOR'}</span>
              <span className="text-muted-foreground flex-1 truncate">{m.note || m.view}</span>
              {!readOnly && <button type="button" onClick={() => remove(i)} className="text-red-500 shrink-0"><Trash2 className="w-3 h-3" /></button>}
            </div>
          ))}
        </div>
      )}
      {!readOnly && <p className="text-[10px] text-muted-foreground text-center">Pick a view · tap the car to mark · tap a dot to change severity</p>}
    </div>
  );
}
