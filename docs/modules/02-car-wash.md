# Car Wash — Full Guide

**Industry:** `CAR_WASH` (or `GENERAL`)  
**Permission:** `carwash.*`  
**Admin menu:** `/superadmin/carwash`  
**Hook:** `src/hooks/useCarWash.ts`  
**Backend:** `GadgetChain-Manager-backend/src/modules/carwash/`

## Purpose

Run a wash / detailing shop: service catalogue, live bay **queue**, membership packs, and staff performance.

## Who uses it

| Role | What they do |
|------|----------------|
| Wash desk | Intake tickets, assign bays |
| Washers | Complete jobs on the queue |
| Manager | Services, memberships, performance |
| Public customer | Online appointment (shared Appointments module) |

## Screens

| Path | Page |
|------|------|
| `/superadmin/carwash` | Live queue |
| `/superadmin/carwash/services` | Service packages |
| `/superadmin/carwash/memberships` | Membership packs |
| `/superadmin/carwash/performance` | Staff performance |

Related: `/superadmin/appointments` (industry feature `appointment`).

---

## Setup

1. **Services** — create packages (name, duration minutes, price, vehicle size / class if used).
2. **Memberships** — define packs (e.g. 8 or 10 washes / month, validity, price).
3. Ensure **staff** exist so queue assignment and performance work.
4. Optional: enable **Appointments** for online slot booking.

---

## Daily workflow (create → operate → complete)

1. Customer arrives (or appointment is due).
2. **Queue → new ticket**
   - Vehicle plate / description
   - Customer (existing or walk-in)
   - Service(s)
   - Optional: membership redemption
3. Assign **bay** and **staff**.
4. Move ticket: queued → in progress → completed (paid / closed).
5. If membership: remaining visits decrease.
6. Review **Performance** for jobs and revenue per staff / period.

### Typical ticket flow

```
Queued → In progress → Completed
              ↘ Cancelled
```

---

## Connections

- **Customers** — memberships and queue intake.
- **Appointments** — online booking feeds the day’s queue.
- **Staff / skills** — assignment and performance.
- **Accounting** — wash income can be journalled at day end.
- Not the same as rental fleet; wash is ticket-based.

### Public APIs (appointments)

| Method | Path |
|--------|------|
| GET | `/api/public/appointment/:businessId/info` |
| POST | `/api/public/appointment/:businessId/booking-requests` |

SellMate public page: `/book/:businessId`

---

## Full example — Sparkle Auto Spa (Nugegoda)

**Service:** Exterior + Interior — **LKR 3,500**, 45 minutes.

**Member:** Dilani Fernando — 10-wash pack (7 left).

1. Dilani books Saturday **11:00** via Appointments.
2. Ticket appears on **Queue**; assigned to washer **Ruwan**, bay 2.
3. Job completed; membership visits → **6 left**.
4. **Performance** shows Ruwan: 12 cars, LKR 38,000 revenue that day.
