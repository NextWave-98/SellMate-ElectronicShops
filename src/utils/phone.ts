// Utilities for handling Sri Lankan phone numbers
// Behavior:
// - Accept input in formats: `+94xxxxxxxxx`, `+94 xx xxx xxxx`, `0xxxxxxxxx`, `07xxxxxxxx` or `9-digit local` (e.g., 771234567)
// - `formatSriLankaPhone` normalizes the number to `+94 XX XXX XXXX` (spaces added for readability)
// - `isValidSriLankaPhone` returns true for acceptable input (including `0` prefixed 10-digit)

export const isValidSriLankaPhone = (phone?: string | null): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '');
  if (/^\+94[1-9]\d{8}$/.test(cleaned)) return true; // +94XXXXXXXXX (first digit not 0)
  if (/^0[1-9]\d{8}$/.test(cleaned)) return true; // 0XXXXXXXXX (10 digits, first after 0 not 0)
  if (/^[1-9]\d{8}$/.test(cleaned)) return true; // XXXXXXXXX (9 digits, first not 0)
  return false;
};

export const formatSriLankaPhone = (phone?: string | null): string => {
  if (!phone) return '';
  // Remove spaces and non-digit except +
  const cleaned = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '');
  let normalized = cleaned;

  // Strip leading + if present when determining the national part
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }

  // Remove country code if present
  if (normalized.startsWith('94')) {
    normalized = normalized.slice(2);
  }

  // If it begins with a leading zero, drop it
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = normalized.slice(1);
  }

  // At this point we expect 9 digits (e.g., 771234567 or 112345678)
  if (!/^\d{9}$/.test(normalized)) {
    // If the input was something else, just return trimmed original and allow backend to validate
    return phone.trim();
  }

  const part1 = normalized.slice(0, 2);
  const part2 = normalized.slice(2, 5);
  const part3 = normalized.slice(5);

  return `+94 ${part1} ${part2} ${part3}`;
};

// Convert international +94 or 94 or +94-format to local 0-prefixed format (e.g., +94771234567 -> 0771234567)
export const toLocalSriLankaPhone = (phone?: string | null): string => {
  if (!phone) return '';

  // strip spaces and non-digit except +
  const cleaned = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '');

  if (cleaned.startsWith('+94')) {
    // remove +94 -> produce 9 digits and add leading 0 -> 10 digits
    const national = cleaned.slice(3);
    return national.length === 9 ? `0${national}` : phone.trim();
  }

  if (cleaned.startsWith('94')) {
    const national = cleaned.slice(2);
    return national.length === 9 ? `0${national}` : phone.trim();
  }

  // Already local 0-prefixed
  if (/^0\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // If 9 digit without leading 0
  if (/^\d{9}$/.test(cleaned)) {
    return `0${cleaned}`;
  }

  // Unrecognized; return the original trimmed string
  return phone.trim();
};

export default {
  isValidSriLankaPhone,
  formatSriLankaPhone,
  toLocalSriLankaPhone,
};
