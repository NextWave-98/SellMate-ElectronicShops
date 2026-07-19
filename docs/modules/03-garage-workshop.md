# Garage / Workshop — Full Guide

**Industry:** `GARAGE` (or `GENERAL`)  
**Permission:** `garage.*` (often also `jobsheets.*`, `parts.*`)  
**Admin menu:** `/superadmin/garage`  
**Hook:** `src/hooks/useGarage.ts`  
**Backend:** `GadgetChain-Manager-backend/src/modules/garage/`

## Purpose

Workshop operations for customer vehicles: estimates (with customer approval links), vehicle registry, service reminders. Repair execution reuses **Job Sheets** and **Parts** when those features are enabled.

## Who uses it

| Role | What they do |
|------|----------------|
| Service advisor | Estimates, reminders, customer contact |
| Technicians | Job sheets, labor, parts |
| Customer | Approve / reject estimate via public link |
| Parts desk | Stock for approved jobs |

## Screens

| Path | Page |
|------|------|
| `/superadmin/garage` | Estimates |
| `/superadmin/garage/vehicles` | Customer vehicles |
| `/superadmin/garage/reminders` | Service reminders |
| `/superadmin/job-sheets/monitor` | Job sheets (feature `jobsheets`) |

**Public:** estimate approval via token URL (no login) — `GET/POST /api/public/estimates/:id`

Related: `/superadmin/appointments`, `/superadmin/towing`, rental loan vehicles.

---

## Setup

1. Register **customers**.
2. **Vehicles** — plate, make/model, VIN/odometer, owner customer.
3. Ensure **parts** catalogue / stock if you bill parts from inventory.
4. Optional: **Appointments** for booking slots into the workshop.

---

## Workflow (create → operate → complete)

1. Intake vehicle (walk-in, appointment, or towing delivery).
2. Create **Estimate**
   - Labor lines (description, hours/amount)
   - Parts lines (linked products where applicable)
3. Send approval link (SMS / WhatsApp).
4. Customer opens public estimate → **Approve** or **Reject**.
5. On approve → open **Job Sheet**; consume parts; log labor.
6. Complete job; invoice / collect payment (org process).
7. Create **Reminder** (next service by km and/or date).
8. Optional: issue **loan vehicle** from Rental (`isLoanVehicle` on rental booking) while the car is in the bay.

---

## Connections

| Module | How it links |
|--------|----------------|
| Customers | Vehicle owner |
| Parts / Inventory | Parts on estimates & job sheets |
| Job Sheets | Execution after approval |
| Rental | Loan / replacement cars |
| Towing | Vehicle delivered into workshop |
| Appointments | Slot booking |
| Accounting | Workshop revenue journals |

---

## Public APIs

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/public/estimates/:id` | View estimate (token) |
| POST | `/api/public/estimates/:id/respond` | Approve / reject |
| GET/POST | `/api/public/appointment/:businessId/...` | Online booking |

---

## Full example — Lanka Motors Workshop (Kandy)

**Vehicle:** Honda Vezel `WP CAB-8890`, owner Nimal Perera.

**Estimate**

| Line | Amount (LKR) |
|------|----------------|
| Brake pads (parts) | 12,000 |
| Labor — pad replacement | 4,500 |
| **Total** | **16,500** |

1. Advisor sends WhatsApp approval link.
2. Nimal **approves**.
3. Job sheet opens; pads drawn from stock; labor logged.
4. Reminder set: **5,000 km** or **6 months**.
5. While waiting, Nimal drives loan Aqua from the rental desk.

Towing hand-off: if the Vezel arrived via roadside SOS, the towing request is closed after delivery and the estimate continues as above.
