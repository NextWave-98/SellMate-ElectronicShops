# Vehicle Rental   Full Guide

**Industry:** `VEHICLE_RENTAL` (or `GENERAL`)  
**Permission:** `rental.*`  
**Admin menu:** `/superadmin/rental`  
**Hook:** `src/hooks/useRental.ts`  
**Backend:** `GadgetChain-Manager-backend/src/modules/rental/`

## Purpose

Manage a rent-a-car business end-to-end: fleet, rate plans, bookings, check-out / check-in condition reports, fuel logs, maintenance, insurance claims, and public online booking requests.

## Who uses it

| Role | What they do |
|------|----------------|
| Org admin / rental desk | Fleet, bookings, pricing, agreements |
| Ops staff | Check-out / check-in, fuel, maintenance |
| Public customer | Browse fleet + request booking (no login) |

## Screens

| Path | Page |
|------|------|
| `/superadmin/rental` | Dashboard / stats |
| `/superadmin/rental/fleet` | Vehicle list |
| `/superadmin/rental/fleet/new` (and edit) | Vehicle form |
| `/superadmin/rental/bookings` | Bookings + quote + condition dialogs |
| `/superadmin/rental/pricing` | Rate plans, extras, coupons |
| `/superadmin/rental/fuel` | Fuel logs |
| `/superadmin/rental/maintenance` | Service / maintenance |
| `/superadmin/rental/claims` | Insurance claims |

**Public**

| URL | Notes |
|-----|--------|
| Next.js: `http://localhost:3001/{org}/fleet` | Glass storefront |
| Next.js: `http://localhost:3001/{org}/book` | Booking request |
| SellMate SPA: `/rent/:businessId` | Legacy public page |

Website CMS must be **Published** for public rental APIs.

---

## Setup (first time)

1. Open **Fleet** → add vehicles (registration no, make/model/year, class, seats, transmission, fuel type, photos, status).
2. Open **Pricing** → create **rate plans** (daily/hourly base rate, included km, deposit, driver fee, late fee).
3. Optional: extra fees, coupons, duration tiers, blocked days (holidays).
4. Optional: link driver licenses on customers for identity reuse.

---

## Booking lifecycle (desk)

```
PENDING → CONFIRMED → CHECKED_OUT → RETURNED → COMPLETED
              ↘ CANCELLED / NO_SHOW
```

### Step-by-step

1. **Bookings → New Booking**
   - Select **vehicle** (active, not `RETIRED`) and **customer**.
   - Set start / end dates and times.
   - Optional: rate plan, with-driver, loan/replacement vehicle (for garage customers).
   - Capture **NIC**, **driving licence**, identity photos (`DriverLicensePicker`).
2. **Get Quote**   days × day rate + pricing rules + extras − coupon → total + deposit.
3. **Create** → status `PENDING`.
4. **Confirm** → `CONFIRMED`.
5. **Check-Out (Handover)**
   - Odometer, fuel level (`FULL` / `3/4` / `1/2` / `1/4` / `EMPTY`).
   - Condition photos, damage diagram (TOP / FRONT / REAR / LEFT / RIGHT; severity MINOR → MODERATE → SEVERE).
   - Customer signature, optional payment collected.
   - Status → `CHECKED_OUT`.
6. **Check-In (Return)**   same condition payload; system can apply excess-km / late fees from rate plan → `RETURNED`.
7. **Complete** → `COMPLETED`.
8. **Agreement**   view text, send SMS / WhatsApp, download PDF, print.

Cancel from pending/confirmed when needed → `CANCELLED`.

---

## Public booking flow

1. Customer opens `{org}/fleet`, picks pickup / return dates.
2. Selects a vehicle → `/book` with dates + vehicle id.
3. Submits name, phone, email, NIC, notes.
4. API: `POST /api/public/rental/:org/booking-requests`
5. Desk sees a **PENDING** booking with `bookingNumber` + estimated total (LKR). Confirm by phone, then continue normal check-out flow.

### Public APIs

| Method | Path |
|--------|------|
| GET | `/api/public/rental/:businessId/fleet?startAt&endAt&vehicleClass?` |
| GET | `/api/public/rental/:businessId/vehicles/:vehicleId` |
| POST | `/api/public/rental/:businessId/booking-requests` |

`:businessId` accepts UUID **or** org slug.

---

## Important fields & statuses

| Area | Values |
|------|--------|
| Booking status | `PENDING`, `CONFIRMED`, `CHECKED_OUT`, `RETURNED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| Actions | `confirm`, `checkout`, `checkin`, `cancel`, `complete` |
| Vehicle | `registrationNo`, make/model/year, `vehicleClass`, seats, transmission, `fuelType`, photos, `status` (incl. `RETIRED`), `isActive`, `currentOdometer` |
| Booking money | `baseAmount`, `extrasAmount`, `discountAmount`, `depositAmount`, `totalAmount` |
| Identity | `renterNic`, `renterLicenseNo`, `driverLicenseId`, `identityPhotos` |
| Flags | `withDriver`, `isLoanVehicle` |

---

## Connections to other modules

- **Customers**   required on desk bookings; public creates/links by phone.
- **Garage**   `isLoanVehicle` for replacement cars while a workshop job is open.
- **Towing**   roadside jobs may feed rental roadside assist.
- **Accounting**   post rental income manually as journals.
- **Website CMS**   publish gate for public fleet/booking.

Rental vehicles are **not** POS stock products; they live in the rental fleet ledger.

---

## Full example   Ceylon Drive Rentals (Colombo)

**Fleet:** Toyota Aqua `CAB-4521` (2021, auto, petrol), class Compact.

**Rate:** LKR **8,500**/day, 100 km included, deposit LKR **25,000**.

**Customer:** Kasun Perera   077-1234567, NIC `199512345678`, licence `B2345678`.

**Trip:** Friday 10:00 → Sunday 10:00 (2 days).

1. Desk creates booking, gets quote ≈ LKR 17,000 + deposit 25,000.
2. Confirm → Check-out at 10:00, full tank, odometer **42,100**, customer signs damage diagram.
3. Sunday check-in: ½ tank, odometer **42,340** (240 km) → 40 km over allowance → excess-km fee from rate plan.
4. Complete booking; agreement PDF archived / sent on WhatsApp.

**Public path:** Customer requests the same Aqua from `http://localhost:3001/ceylon-drive/fleet` → pending booking appears on Bookings for the desk to confirm.
