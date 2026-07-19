# CRM Tasks & Website Leads — Full Guide

**Industry:** Not industry-gated the same way as rental/wash (permission-based)  
**Permission:** `crm.*`  
**Admin menu:** `/superadmin/crm-tasks`  
**Hook:** `src/hooks/useCrm.ts`  
**Backend:** `GadgetChain-Manager-backend/src/modules/crm/` · public writers in `modules/cms/`

## Purpose

Staff follow-up inbox. Manual tasks plus automatic tasks from the **public website** (contact leads and shop order requests).

## Who uses it

| Role | What they do |
|------|----------------|
| Sales / rental / shop desk | Work open tasks |
| Manager | Assign / prioritise |
| Public visitor | Submits contact or order → creates task |

## Screens

| Path | Page |
|------|------|
| `/superadmin/crm-tasks` | Task list / create / update |

Related: **Website CMS** (publish site, branding).  
Facebook Lead Ads are a separate Communication path (`/superadmin/facebook-leads`) unless you later link them into CRM.

---

## Manual workflow

1. **CRM Tasks → New**
2. Title, description, priority, related type (optional), assignee if available.
3. Work the task → update status → complete / close.

Typical statuses follow the CRM enums (e.g. open → in progress → done). Use the UI labels on the page.

---

## Automatic: Website lead

**Requires:** Website CMS **Published** (`isPublished`).

| Step | Detail |
|------|--------|
| Customer | Fills contact form on public site |
| API | `POST /api/public/site/:org/leads` |
| Body | `{ name, phone?, email?, message? }` |
| Result | `CrmTask` with `relatedType: WEBSITE_LEAD` |
| Title | `Website lead: {name}` |
| Description | Contact lines + message |

Desk calls / WhatsApps the lead and converts to booking, wash appointment, sale, etc.

---

## Automatic: Website order request

Used by **sellmate-shop-site** cart checkout.

| Step | Detail |
|------|--------|
| Customer | Submits bag + contact on `/[org]/cart` |
| API | `POST /api/public/site/:org/order-requests` |
| Body | `customer { name, phone, email?, address? }`, `items [{ productId, quantity }]`, `notes?` |
| Result | `CrmTask` with `relatedType: WEBSITE_ORDER` |
| Title | `Website order: {name}` |
| Description | Line items + LKR totals |

**Important:** Order requests do **not** mutate inventory until staff confirms / creates a real sale in SellMate. No data loss on catalogue stock from the public request alone.

---

## Public site URLs (local)

| Site | Contact / order |
|------|-----------------|
| Rental / glass site `:3001` | `/[org]/contact` → leads |
| Shop site `:3002` | `/[org]/contact` → leads; `/[org]/cart` → order-requests |

---

## Connections

| Module | How CRM helps |
|--------|----------------|
| Rental | Convert leads to bookings |
| Car wash / Garage | Convert to appointments |
| Shop / Inventory | Fulfil `WEBSITE_ORDER` as sales |
| Customers | Create customer from phone on follow-up |

---

## Full examples

### A. Rental lead

Visitor on `ceylon-drive` contact form:

> Need a van for a wedding in Galle, 12 Aug.

Task appears: **Website lead: Samanthi Fernando** with phone. Desk calls, creates rental booking for a van that weekend.

### B. Shop order

Customer adds 2 shirts to bag on `http://localhost:3002/my-boutique/cart`, submits name + phone + address.

Task: **Website order: Amaya K.** with lines and total LKR. Staff confirms stock, creates sale / courier shipment, then marks CRM task done.
