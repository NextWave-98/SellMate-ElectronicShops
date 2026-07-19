import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputClassName?: string;
  emptyMessage?: string;
  name?: string;
  onBlur?: () => void;
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  inputClassName = '',
  emptyMessage = 'No results found',
  name,
  onBlur,
}: SearchSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        o.sublabel?.toLowerCase().includes(term),
    );
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const handlePick = useCallback(
    (option: SearchSelectOption) => {
      onChange(option.value);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && filtered[highlighted]) handlePick(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const displayText = open ? query : selected?.label ?? '';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          name={name}
          value={displayText}
          disabled={disabled}
          placeholder={selected && !open ? selected.label : placeholder}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setHighlighted(-1);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            setHighlighted(-1);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full pl-9 pr-14 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 ${inputClassName}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              tabIndex={-1}
              className="p-0.5 text-gray-400 hover:text-gray-600"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            filtered.map((option, idx) => (
              <button
                key={option.value || `opt-${idx}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(option);
                }}
                className={`w-full text-left px-4 py-2 text-sm flex justify-between items-center gap-2 hover:bg-orange-50 ${
                  idx === highlighted ? 'bg-orange-50' : ''
                } ${option.value === value ? 'bg-orange-100 font-medium' : ''}`}
              >
                <span className="truncate">{option.label}</span>
                {option.sublabel && (
                  <span className="text-xs text-gray-400 shrink-0">{option.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
