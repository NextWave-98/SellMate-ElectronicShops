/** 10 lakh LKR — amounts below this show as full numbers */
const TEN_LAKH = 1_000_000;

function formatMillionSuffix(amount: number): string {
  const m = Math.abs(amount) / TEN_LAKH;
  const rounded = Math.round(m * 10) / 10;
  return rounded % 1 === 0 ? `${rounded}M` : `${rounded.toFixed(1)}M`;
}

/**
 * Formats a number as Sri Lankan Rupees (LKR).
 * Full price up to 10 lakh; abbreviates to M (e.g. 1M) at 10 lakh and above.
 */
export const formatCurrency = (
  amount: number | undefined | null,
  options?: { decimals?: number }
): string => {
  if (amount == null || isNaN(amount)) return 'LKR 0.00';

  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (abs >= TEN_LAKH) {
    return `${sign}LKR ${formatMillionSuffix(amount)}`;
  }

  const decimals = options?.decimals ?? 2;
  return `${sign}LKR ${abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

/**
 * Same as formatCurrency — full prices below 10 lakh, M abbreviation above.
 */
export const formatLargeCurrency = formatCurrency;

/**
 * Chart axis/tooltip formatter — no compact K notation.
 */
export const formatChartCurrency = (value: number | undefined | null): string => {
  if (value == null || isNaN(value)) return 'LKR 0';
  return formatCurrency(value, { decimals: 0 });
};
