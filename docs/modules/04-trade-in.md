# Trade-In — Full Guide

**Industry:** `ELECTRONICS` only (or `GENERAL`)  
**Permission:** `tradein.*`  
**Admin menu:** `/superadmin/trade-ins`  
**Hook:** `src/hooks/useTradeIn.ts`  
**Backend:** `GadgetChain-Manager-backend/src/modules/tradein/`

## Purpose

Electronics buyback / trade-in: configure price **rules** by device and condition, then create trade-in cases that can credit a new sale or pay cash. Accepted devices can enter used inventory.

## Who uses it

| Role | What they do |
|------|----------------|
| Sales / buyback desk | Assess devices, create trade-ins |
| Manager | Maintain price rules |
| Inventory | Restock accepted used units |

**Not available** on pure rental / car-wash / garage industries unless industry is `GENERAL` or `ELECTRONICS`.

## Screens

| Path | Page |
|------|------|
| `/superadmin/trade-ins` | Trade-in list / cases |
| `/superadmin/trade-ins/rules` | Pricing rules |

---

## Setup

1. Open **Rules** — define offers by brand, model, storage, condition (and any other rule fields your UI exposes).
2. Keep **Products / inventory** ready if accepted devices should be restocked as used/refurb SKUs.
3. Ensure **Customers** exist for walk-in trade-ins.

---

## Workflow

1. Customer brings a device (or wants trade-in toward a new purchase).
2. Staff assess condition against a **rule** → system shows **offer value**.
3. Create **trade-in** case (customer, device details, offer).
4. Outcomes:
   - **Accept** — credit toward new sale and/or cash payout; optionally book device into used stock.
   - **Reject** / let offer expire.
5. If credited on a sale, complete the POS / sales flow with the trade-in discount / payment line as your process defines.

```
Assess → Offer → Accept / Reject / Expire
              ↘ (accepted) Credit sale + optional used stock
```

---

## Connections

- **Customers** — party on the trade-in.
- **POS / Sales / Inventory** — credit on sale; used stock intake.
- **CRM** — optional follow-up if offer is pending.
- No dedicated public trade-in page (staff-led / in-store).

---

## Full example — Gadget Hub (Pettah)

**Rule:** iPhone 12, 128GB, condition **Good** → offer **LKR 85,000**.

1. Customer wants a new A-series phone at LKR 185,000.
2. Desk creates trade-in; offer **85,000** accepted.
3. New sale net = 185,000 − 85,000 = **LKR 100,000** to collect.
4. iPhone 12 booked into **used inventory** for resale with a used SKU / condition grade.
