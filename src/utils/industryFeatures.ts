import type { IndustryType } from '../context/BusinessContext';

export type IndustryFeature =
  | 'warranty'
  | 'jobsheets'
  | 'parts'
  | 'rental'
  | 'carwash'
  | 'garage'
  | 'tradein'
  | 'retail'; // POS / products / inventory / sales

/**
 * Feature → industry matrix.
 * GENERAL orgs get everything (default, all features available).
 *
 * warranty / jobsheets / parts : ELECTRONICS, GARAGE (garage reuses jobsheets & parts)
 * tradein                      : ELECTRONICS only
 * rental                       : VEHICLE_RENTAL only
 * carwash                      : CAR_WASH only
 * garage                       : GARAGE only
 * retail (POS/products/sales)  : ELECTRONICS, CLOTHING, GENERAL
 */
export function industryAllowsFeature(
  industryType: IndustryType,
  feature: IndustryFeature
): boolean {
  if (industryType === 'GENERAL') return true;

  switch (feature) {
    case 'jobsheets':
    case 'parts':
    case 'warranty':
      return industryType === 'ELECTRONICS' || industryType === 'GARAGE';
    case 'tradein':
      return industryType === 'ELECTRONICS';
    case 'rental':
      return industryType === 'VEHICLE_RENTAL';
    case 'carwash':
      return industryType === 'CAR_WASH';
    case 'garage':
      return industryType === 'GARAGE';
    case 'retail':
      return industryType === 'ELECTRONICS' || industryType === 'CLOTHING';
    default:
      return true;
  }
}

export const INDUSTRY_TYPE_OPTIONS: { value: IndustryType; label: string }[] = [
  { value: 'GENERAL', label: 'General Retail (all features)' },
  { value: 'ELECTRONICS', label: 'Electronics / Gadget Shop' },
  { value: 'CLOTHING', label: 'Clothing / Apparel' },
  { value: 'VEHICLE_RENTAL', label: 'Vehicle Rental (Rent-a-Car)' },
  { value: 'CAR_WASH', label: 'Car Wash / Detailing' },
  { value: 'GARAGE', label: 'Garage / Auto Workshop' },
];
