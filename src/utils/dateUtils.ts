/**
 * Utility functions for date and time formatting.
 *
 * All display + "today" helpers are pinned to Asia/Colombo (Sri Lanka, UTC+05:30)
 * so output is consistent regardless of the viewer's browser timezone.
 */

export const SL_TIMEZONE = 'Asia/Colombo';

/**
 * Formats a date string or Date object to display both date and time (Sri Lanka time).
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date || (typeof date === 'string' && date.trim() === '')) {
    return '';
  }
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    timeZone: SL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Formats a date string or Date object to display only date (Sri Lanka time).
 */
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    timeZone: SL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Today's date as YYYY-MM-DD in Sri Lanka time. Use for date-input defaults,
 * export filenames and "today" filters instead of `new Date().toISOString().slice(0,10)`
 * (which returns the UTC calendar day and is a day behind late at night in Sri Lanka).
 */
export const todayColombo = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: SL_TIMEZONE });

/** Calendar day (YYYY-MM-DD) in Sri Lanka time for any date. */
export const toColomboDateString = (date: string | Date): string =>
  new Date(date).toLocaleDateString('en-CA', { timeZone: SL_TIMEZONE });
