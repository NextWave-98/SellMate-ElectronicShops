# Vehicle Rental — Feature & UI Audit

**Date:** 2026-07-22
**Scope:** `SellMate-ElectronicShops` (frontend) + `GadgetChain-Manager-backend` (rental module)
**Verdict:** Core is ~95% complete. Backend + `useRental` hook are fully built. The gaps below are mostly **backend features that were never wired into the UI**, plus UI polish.

---

## 1. Missing features (backend/hook exists, UI does not use it)

These are the real "not added" items — the API is ready, the screen just doesn't call it.

| # | Feature | Backend / hook | UI status | Impact |
|---|---------|----------------|-----------|--------|
| 1 | **Add / remove ad-hoc charges on a booking** (post-return damage fee, cleaning, extra km, fine) | `POST /bookings/:id/charges`, `DELETE .../charges/:chargeId`; hook has `addCharge` | Bookings page never exposes it. `chargesAmount` shows on the record but can't be edited | **High** — can't bill damage/cleaning beyond the single "paid now" field |
| 2 | **Booking detail view** — review identity photos, check-out vs check-in condition reports, damage diagrams, charge breakdown, payment history | `getBookingById` in hook | Unused. No row click / detail modal | **High** — after check-in you can't review captured damage evidence for disputes |
| 3 | **Edit / reschedule a booking** (change dates, vehicle on a PENDING booking) | `updateBooking` in hook | Unused | Medium — must cancel & recreate |
| 4 | **Availability enforcement in New Booking** | `getAvailability` in hook + blocked-days API | Vehicle dropdown lists all active vehicles; no overlap/blocked-day check | **High** — double-booking risk |
| 5 | **Edit pricing entities** (rate plan base rate, tiers, rule, fee, coupon) | `updateRatePlan`, `updatePricingRule`, `updateExtraFee`, `updateCoupon` | Pricing page only **creates** + toggles `isActive`. No edit dialog | Medium — a wrong base rate/tier can't be fixed, only deactivated |
| 6 | **Delete pricing rules / fees / coupons** | Only `rate-plans` has a delete route; rules/fees/coupons have **no** delete (backend + UI) | — | Low/Medium — clutter builds up |
| 7 | **Driver-license management page** (all licenses on file, expiring soon) | Full CRUD + `expiringInDays` filter in hook | No page / nav; only reachable inside the booking picker | Medium |
| 8 | **Deposit release / refund** at completion | Model has `depositAmount`, `depositReleased` | No UI action to mark deposit released | Medium |
| 9 | Hook is missing `deleteCharge` and `deleteRatePlan` wrappers | routes exist | — | Low |

---

## 2. UI improvements needed

### Bookings page
- **No filters / search / pagination.** Loads `limit:100`, no status filter, no search by booking#/customer/vehicle, no date range. Won't scale past a few dozen bookings.
- **Money column shows only total.** No paid / balance / deposit at a glance — outstanding balance is invisible.
- **Check-in dialog doesn't preview excess-km / late fees.** The backend applies them from the rate plan, but staff can't see what will be charged before confirming.
- **"Notes / Damage remarks" is a single-line `<Input>`** — should be a `<textarea>`.
- **Cancel booking fires immediately** — no confirmation dialog.

### Fleet page
- No status/class filter, no pagination. Search needs Enter (no debounce).
- No availability-at-a-glance. "Delete" silently retires a vehicle with no confirm.

### Pricing page
- Long single-scroll of 5 cards — would read better as sub-tabs (Rate Plans / Rules / Fees / Coupons / Blocked Days).
- No edit (see gap #5); delete only via `isActive` toggle.

### Maintenance / Fuel / Claims
- **Maintenance:** can only advance status, can't edit or cancel a record; no vehicle filter.
- **Fuel:** delete exists but no edit; no per-vehicle filter; delete has no confirm.
- **Claims:** can't edit a claim after creation (only status); description is single-line.

### Cross-cutting
- **No confirm dialogs** on destructive actions (cancel booking, retire vehicle, delete fuel log / blocked day).
- **Raw `<input type="checkbox">` and `<select>`** used in many places instead of the shadcn design-system components — visually inconsistent.
- **Agreement view is raw monospace `<pre>`** (print path). PDF endpoint exists and is wired, but the on-screen/print layout isn't branded/letterhead.
- **Expiring-documents warning** (RentalLayout) lists vehicles but isn't clickable through to the vehicle.

---

## 3. What's already solid (no action needed)

Dashboard (charts + recent activity), fleet CRUD with makes/models inline-add + features + photos + compliance/service tracking, full booking lifecycle (quote → confirm → checkout → checkin → complete → cancel), damage diagram + signature + photos on condition reports, agreement generate/send SMS/WhatsApp/PDF/print, rate plans with duration tiers + preset + validation, price rules, extra fees, coupons, blocked days, fuel logs with efficiency + auto cost calc, maintenance, insurance claims with approve flow, availability calendar view, public browse + booking-request flow, permission + industry-feature route guards.

---

## Suggested priority order
1. Booking detail view (#2) + add-charges UI (#1) — needed for real desk operations & disputes.
2. Availability enforcement in New Booking (#4) — prevents double-booking.
3. Edit pricing entities (#5) + deposit release (#8).
4. Bookings/Fleet filters + pagination.
5. Confirm dialogs + textarea fixes + Pricing sub-tabs (polish).
