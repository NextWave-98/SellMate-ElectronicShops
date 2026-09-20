export type CourierImportRowError = { row: number; message: string };

const DEFAULT_ROW_ERROR =
  'Failed to create shipment   check product code, stock at the selected branch, city, phone number, and COD amount';

/** Normalize backend / API error rows into a consistent { row, message } shape. */
export function normalizeCourierImportRowErrors(raw: unknown): CourierImportRowError[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((entry, index) => {
    if (typeof entry === 'string') {
      return { row: index + 2, message: entry.trim() || DEFAULT_ROW_ERROR };
    }

    const obj = (entry ?? {}) as Record<string, unknown>;
    const row = Number(obj.row ?? obj.rowNumber ?? obj.line ?? 0);
    const message = [obj.message, obj.error, obj.details, obj.reason].find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    ) as string | undefined;

    return {
      row: Number.isFinite(row) && row > 0 ? row : index + 2,
      message: message?.trim() || DEFAULT_ROW_ERROR,
    };
  });
}

/** Short toast summary for import failures (first few rows). */
export function formatCourierImportErrorToast(errors: CourierImportRowError[]): string {
  if (errors.length === 0) return 'Import failed';
  if (errors.length === 1) return `Row ${errors[0].row}: ${errors[0].message}`;

  const preview = errors
    .slice(0, 3)
    .map((e) => `Row ${e.row}: ${e.message}`)
    .join(' | ');

  return `${errors.length} rows failed   ${preview}${errors.length > 3 ? ' …' : ''}`;
}
