# SellMate Vertical Modules   Documentation Index

This folder explains how to use each vertical module in **SellMate**, with full workflows and Sri Lanka–style examples.

| Document | Module | Typical industry |
|----------|--------|------------------|
| [01-vehicle-rental.md](./modules/01-vehicle-rental.md) | Vehicle Rental | `VEHICLE_RENTAL` |
| [02-car-wash.md](./modules/02-car-wash.md) | Car Wash | `CAR_WASH` |
| [03-garage-workshop.md](./modules/03-garage-workshop.md) | Garage / Workshop | `GARAGE` |
| [04-trade-in.md](./modules/04-trade-in.md) | Trade-In | `ELECTRONICS` |
| [05-accounting.md](./modules/05-accounting.md) | Accounting | All industries |
| [06-towing.md](./modules/06-towing.md) | Towing / Roadside | `GARAGE`, `VEHICLE_RENTAL` |
| [07-crm.md](./modules/07-crm.md) | CRM Tasks & Website Leads | All (permission-based) |

## How modules appear in the menu

1. Organisation **industry type** must allow the feature (see each doc).
2. User needs the matching **module permission** (e.g. `rental.read`).
3. Industry `GENERAL` unlocks every feature for testing.

See also: [industry-features.md](./industry-features.md)

## Shared building blocks

- **Customers**   used by rental, wash, garage, trade-in, towing, CRM.
- **Website CMS**   public storefront; contact/order forms create CRM tasks.
- **Appointments**   shared online booking for garage, car wash, rental.
- **Branches / locations**   multi-branch orgs filter ops by location where applicable.

## Public sites (local)

| Site | Port | Use |
|------|------|-----|
| `sellmate-shop-site` | `3001` | Electronics / clothing shop (Almina-style) |
| `rental-public-site` | `3002` | Glass rental storefront (not for car wash) |

Both read org CMS settings + published content. Publish the website under **Website CMS** before public URLs work.

## Quick map

```
Rental ── public fleet/book ──► Bookings desk
Wash   ── appointments ──────► Queue
Garage ── estimate link ─────► Job sheets + Parts
Towing ── SOS ───────────────► Garage / customer
Shop/CMS contact & orders ───► CRM Tasks
All verticals ───────────────► Accounting (manual journals)
```
