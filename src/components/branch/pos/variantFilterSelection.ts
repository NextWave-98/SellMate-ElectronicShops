/** variant attribute key -> selected values (any one matches). */
export type VariantFilterSelection = Record<string, string[]>;

export function countVariantSelections(selection: VariantFilterSelection): number {
  return Object.values(selection).reduce((n, values) => n + values.length, 0);
}
