# Industry feature flags

Source: `src/utils/industryFeatures.ts`

| Feature | Industries that see it |
|---------|------------------------|
| `rental` | `VEHICLE_RENTAL` (+ `GENERAL`) |
| `carwash` | `CAR_WASH` (+ `GENERAL`) |
| `garage` | `GARAGE` (+ `GENERAL`) |
| `tradein` | `ELECTRONICS` (+ `GENERAL`) |
| `appointment` | `GARAGE`, `CAR_WASH`, `VEHICLE_RENTAL` (+ `GENERAL`) |
| `towing` | `GARAGE`, `VEHICLE_RENTAL` (+ `GENERAL`) |
| `accounting` | **All industries** |
| `jobsheets` / `parts` / `warranty` | `ELECTRONICS`, `GARAGE` (+ `GENERAL`) |
| `retail` (POS / stock / sales) | `ELECTRONICS`, `CLOTHING` (+ `GENERAL`); hidden for pure rental/wash/garage |

`GENERAL` unlocks every feature. Sidebar also hides retail-only items when `retail` is false.

Each module still requires the matching **permission** (e.g. `rental.read`, `crm.update`).
