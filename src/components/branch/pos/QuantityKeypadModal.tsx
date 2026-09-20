import { useEffect, useMemo, useState } from 'react';
import {
  formatQty,
  formatUnitPrice,
  fromSubUnit,
  isWeighted,
  minQtyOf,
  snapQty,
  stepOf,
  subUnitName,
  unitOf,
  validateQty,
  type UomProduct,
} from '../../../utils/qty';

interface KeypadProduct extends UomProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  isService?: boolean;
}

/**
 * Quantity entry for products that are not sold by the piece.
 *
 * Tapping a weighted product cannot just add "1" to the cart   one kilo of rice
 * is rarely what the customer asked for. This asks for the amount first, in
 * whichever unit the cashier is thinking in (grams or kilos), and shows the line
 * total live so a mis-typed weight is obvious before it reaches the bill.
 */
export default function QuantityKeypadModal({
  product,
  initialQuantity,
  onConfirm,
  onClose,
}: {
  product: KeypadProduct;
  initialQuantity?: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}) {
  const sub = subUnitName(product);
  const unit = unitOf(product);

  // Default to the smaller unit (grams) when the shop has one: below a kilo is
  // how most counter sales are actually spoken.
  const [useSubUnit, setUseSubUnit] = useState(!!sub);
  const [raw, setRaw] = useState('');

  useEffect(() => {
    if (initialQuantity && initialQuantity > 0) {
      setUseSubUnit(false);
      setRaw(String(initialQuantity));
    }
  }, [initialQuantity]);

  const typed = Number(raw) || 0;
  const quantity = useMemo(
    () => (useSubUnit && sub ? fromSubUnit(typed, product) : typed),
    [typed, useSubUnit, sub, product],
  );

  const lineTotal = Math.round(quantity * Number(product.price || 0) * 100) / 100;
  const error = raw === '' ? null : validateQty(quantity, product);
  const overStock =
    !product.isService && quantity > Number(product.stock || 0)
      ? `Only ${formatQty(Number(product.stock || 0), product)} in stock`
      : null;

  const press = (key: string) => {
    if (key === 'C') return setRaw('');
    if (key === '<') return setRaw((r) => r.slice(0, -1));
    if (key === '.') {
      if (useSubUnit || raw.includes('.')) return;
      return setRaw((r) => (r === '' ? '0.' : r + '.'));
    }
    setRaw((r) => (r === '0' ? key : r + key));
  };

  const confirm = () => {
    if (quantity <= 0 || error || overStock) return;
    onConfirm(snapQty(quantity, product));
  };

  const quickAmounts = useSubUnit && sub ? [100, 250, 500, 750, 1000] : [0.5, 1, 2, 5, 10];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {formatUnitPrice(Number(product.price || 0), product)}
          {!product.isService && (
            <span className="ml-2 text-gray-400">
              &middot; {formatQty(Number(product.stock || 0), product)} in stock
            </span>
          )}
        </p>

        {/* Unit toggle: the cashier types 250 for grams or 0.25 for kilos,
            whichever they are thinking in. */}
        {sub && (
          <div className="mt-3 inline-flex rounded-lg border border-gray-200 p-0.5">
            {[
              { on: true, label: sub },
              { on: false, label: unit.toLowerCase() },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  setUseSubUnit(o.on);
                  setRaw('');
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  useSubUnit === o.on
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* Live readout   the amount and what it costs, together */}
        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-right">
          <div className="text-3xl font-bold tabular-nums text-gray-900">
            {raw || '0'}
            <span className="ml-1 text-base font-medium text-gray-400">
              {useSubUnit && sub ? sub : unit.toLowerCase()}
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {formatQty(quantity, product)} &middot;{' '}
            <span className="font-semibold text-gray-800">
              Rs. {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {(error || overStock) && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {overStock ?? error}
          </p>
        )}

        {/* Common amounts   most counter sales are one of these */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickAmounts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setRaw(String(a))}
              className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:border-orange-400 hover:text-orange-600"
            >
              {a}
              {useSubUnit && sub ? sub : unit.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', useSubUnit ? 'C' : '.', '0', '<'].map(
            (k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                className="rounded-xl bg-gray-100 py-3 text-lg font-semibold text-gray-800 transition-colors hover:bg-gray-200 active:bg-gray-300"
              >
                {k === '<' ? '⌫' : k}
              </button>
            ),
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setRaw('')}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={quantity <= 0 || !!error || !!overStock}
            className="flex-[2] rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to cart
          </button>
        </div>

        <p className="mt-2 text-center text-xs text-gray-400">
          Steps of {stepOf(product)} {unit.toLowerCase()}, minimum{' '}
          {formatQty(minQtyOf(product), product)}
        </p>
      </div>
    </div>
  );
}

export { isWeighted };
