/**
 * Auto-fill merge rules for barcode product lookup.
 *
 * Pure and UI-free so the precedence rule is stated in exactly one place and is
 * obvious on review:
 *
 *     user-entered value  >  existing product data  >  external API data
 *
 * A field is only written when it is currently empty. Anything the user has
 * already typed is never silently replaced, however confident the provider is.
 */

/** Identification metadata only   never price, cost, stock or supplier. */
export interface ProductAutofillCandidate {
  name?: string;
  brand?: string;
  model?: string;
  description?: string;
  categoryId?: string;
  imageUrl?: string;
}

export type AutofillField = keyof ProductAutofillCandidate;

/** Current form values for the fields auto-fill is allowed to touch. */
export type ProductAutofillCurrent = Record<Exclude<AutofillField, 'imageUrl'>, string> & {
  /** Whether the form already has at least one image. */
  hasImage: boolean;
};

export interface AutofillPlan {
  /** Only the fields that should actually be written. */
  apply: ProductAutofillCandidate;
  /** Human-readable names of the fields written, for the toast. */
  filled: string[];
  /** Fields the provider offered but that the user had already filled in. */
  skipped: string[];
}

const FIELD_LABELS: Record<AutofillField, string> = {
  name: 'Name',
  brand: 'Brand',
  model: 'Model',
  description: 'Description',
  categoryId: 'Category',
  imageUrl: 'Image',
};

const isBlank = (value: string | undefined): boolean => !value || value.trim().length === 0;

/**
 * Decide what may be written to the form. Never mutates its inputs and never
 * returns a field whose current value is non-empty.
 */
export function planAutofill(
  current: ProductAutofillCurrent,
  candidate: ProductAutofillCandidate,
): AutofillPlan {
  const apply: ProductAutofillCandidate = {};
  const filled: string[] = [];
  const skipped: string[] = [];

  const consider = (field: Exclude<AutofillField, 'imageUrl'>) => {
    const incoming = candidate[field];
    if (isBlank(incoming)) return;
    if (!isBlank(current[field])) {
      skipped.push(FIELD_LABELS[field]);
      return;
    }
    apply[field] = incoming!.trim();
    filled.push(FIELD_LABELS[field]);
  };

  consider('name');
  consider('brand');
  consider('model');
  consider('description');
  consider('categoryId');

  // Images are additive in the existing form, but a product that already has
  // one should not silently gain a stranger's photo as well.
  if (!isBlank(candidate.imageUrl)) {
    if (current.hasImage) {
      skipped.push(FIELD_LABELS.imageUrl);
    } else {
      apply.imageUrl = candidate.imageUrl;
      filled.push(FIELD_LABELS.imageUrl);
    }
  }

  return { apply, filled, skipped };
}

/** "Open Food Facts" rather than "open_food_facts", for the toast. */
export function lookupSourceLabel(source: string | undefined): string {
  switch (source) {
    case 'sellmate':
      return 'SellMate';
    case 'open_food_facts':
      return 'Open Food Facts';
    case 'upcitemdb':
      return 'UPCitemDB';
    default:
      return 'product database';
  }
}
