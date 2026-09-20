/**
 * Mirror of the backend's src/modules/courier/shipment-edit-policy.ts.
 *
 * Kept in sync deliberately: the backend is the authority and will reject a bad
 * edit, but the UI needs to know up-front which fields to disable so the user
 * isn't invited to type something that will bounce.
 */

export type ShipmentEditZone = 'FREE' | 'POST_DISPATCH' | 'LOCKED';

const FREELY_EDITABLE = [
  'PENDING_APPROVAL',
  'PROCESSING',
  'PACKAGING',
  'WAITING_COURIER_PICKUP',
  'PENDING',
  'PENDING_PICKUP',
];

const POST_DISPATCH = [
  'RELEASED_TO_COURIER',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'RESCHEDULED',
  'DATE_CHANGED',
  'REARRANGED',
  'FAILED_DELIVERY',
  'DELIVERY_FAILED',
  'DAMAGED',
];

const LOCKED = [
  'DELIVERED',
  'CANCELLED',
  'RETURNED_TO_LOCATION',
  'RETURNED',
  'RETURNED_TO_SENDER',
  'RETURN_PENDING',
  'RETURN_COMPLETE',
];

/** Fields an admin may still change once the courier holds the parcel. */
export const POST_DISPATCH_EDITABLE_FIELDS = [
  'recipientPhone',
  'recipientPhone2',
  'deliveryInstructions',
  'notes',
  'actualShippingCost',
  'estimatedDeliveryDate',
] as const;

export const getShipmentEditZone = (status?: string): ShipmentEditZone => {
  const s = String(status || '').toUpperCase();
  if (LOCKED.includes(s)) return 'LOCKED';
  if (POST_DISPATCH.includes(s)) return 'POST_DISPATCH';
  if (FREELY_EDITABLE.includes(s)) return 'FREE';
  return 'POST_DISPATCH'; // unknown provider status → be conservative
};

export const isAdminRole = (role?: string) =>
  ['admin', 'super_admin'].includes(String(role || '').toLowerCase());

export const humanStatus = (status?: string) =>
  String(status || '')
    .replace(/_/g, ' ')
    .toLowerCase();

/** Can this field be edited right now? */
export const canEditField = (
  zone: ShipmentEditZone,
  field: string,
  role?: string,
): boolean => {
  if (zone === 'LOCKED') return false;
  if (zone === 'FREE') return true;
  return (
    isAdminRole(role) &&
    (POST_DISPATCH_EDITABLE_FIELDS as readonly string[]).includes(field)
  );
};

/** Human labels used by the change-preview list. */
export const SHIPMENT_FIELD_LABELS: Record<string, string> = {
  recipientName: 'Recipient name',
  recipientPhone: 'Phone',
  recipientPhone2: 'Second phone',
  recipientEmail: 'Email',
  recipientAddress: 'Address',
  recipientCity: 'City',
  recipientDistrict: 'District',
  recipientPostalCode: 'Postal code',
  weight: 'Weight (kg)',
  length: 'Length (cm)',
  width: 'Width (cm)',
  height: 'Height (cm)',
  numberOfPieces: 'Pieces',
  description: 'Package description',
  declaredValue: 'Declared value',
  shippingCharge: 'Shipping charge',
  insuranceCharge: 'Insurance charge',
  additionalCharges: 'Additional charges',
  actualShippingCost: 'Actual courier cost',
  codEnabled: 'COD enabled',
  codAmount: 'COD amount',
  notes: 'Notes',
  deliveryInstructions: 'Delivery instructions',
  estimatedDeliveryDate: 'Estimated delivery',
  pickupDate: 'Pickup date',
};

/** Fields the edit endpoint accepts, in the order we want them previewed. */
export const SHIPMENT_EDITABLE_FIELDS = Object.keys(SHIPMENT_FIELD_LABELS);

export type ShipmentChange = { field: string; label: string; from: any; to: any };

/** Compare the loaded shipment against the form and list what actually changed. */
export const diffShipment = (
  original: Record<string, any> | undefined,
  next: Record<string, any>,
): ShipmentChange[] => {
  if (!original) return [];
  const out: ShipmentChange[] = [];
  for (const field of SHIPMENT_EDITABLE_FIELDS) {
    if (!(field in next)) continue;
    const a = original[field];
    const b = next[field];
    const norm = (v: any) =>
      v === null || v === undefined || v === '' ? '' : String(v);
    if (norm(a) === norm(b)) continue;
    out.push({ field, label: SHIPMENT_FIELD_LABELS[field] ?? field, from: a, to: b });
  }
  return out;
};
