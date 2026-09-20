# Towing / Roadside   Full Guide

**Industry:** `GARAGE` or `VEHICLE_RENTAL` (or `GENERAL`)  
**Permission:** `towing.*`  
**Admin menu:** `/superadmin/towing`  
**Hook:** `src/hooks/useTowing.ts`  
**Backend:** `GadgetChain-Manager-backend/src/modules/towing/`  
**UI helpers:** map picker (`LeafletMapPicker`) for pickup / drop pins where enabled.

## Purpose

Capture and dispatch roadside / towing jobs (breakdown, accident, flatbed) and optionally hand the vehicle into the workshop.

## Who uses it

| Role | What they do |
|------|----------------|
| Dispatcher | Create / assign jobs |
| Driver | En route → on scene → deliver |
| Garage desk | Receive vehicle for estimate |
| Public | SOS request (no login) |

## Screens

| Path | Page |
|------|------|
| `/superadmin/towing` | Towing requests list + create / update |

---

## Workflow

1. **Create request** (admin or public SOS)
   - Contact phone / name
   - Vehicle details
   - Pickup location (map / address)
   - Optional drop-off (workshop / home)
   - Urgency / notes
2. **Dispatch** truck / driver.
3. Status progression (typical):
   ```
   Requested → Dispatched / En route → On scene → Completed
                      ↘ Cancelled
   ```
4. Collect fee / note payment as per org process.
5. If repairs needed → open **Garage** vehicle + estimate (and optional rental loan car).

---

## Public SOS

| Method | Path |
|--------|------|
| POST | `/api/public/towing/:businessId/requests` |

Body typically includes contact, location, vehicle, and message fields accepted by the towing DTO.

`:businessId` = UUID or org slug.

---

## Connections

| Module | Link |
|--------|------|
| Garage | Destination for repair estimates |
| Rental | Member roadside assist / loan car after tow |
| Customers | Phone / identity |
| CRM | Optional follow-up task if not closed |
| Appointments | Not required; SOS is on-demand |

---

## Full example   A9 breakdown near Matale

Tourist’s Toyota Axio stops on the A9.

1. Public SOS to **Lanka Motors** with GPS pin + phone.
2. Dispatcher assigns flatbed; status → en route → on scene.
3. Vehicle delivered to Kandy workshop.
4. Towing request **completed** with fee LKR 15,000.
5. Garage opens estimate for the owner; optional loan Aqua from rental while repairs run.
