# Accounting   Full Guide

**Industry:** All industries  
**Permission:** `accounting.*`  
**Admin menu:** `/superadmin/accounting`  
**Hook:** `src/hooks/useAccounting.ts`  
**Backend:** `GadgetChain-Manager-backend/src/modules/accounting/`

## Purpose

Lightweight organisation ledger: chart of **accounts**, **journal** entries, and basic **reports**. Complements POS / vertical ops   it does not replace them.

## Who uses it

| Role | What they do |
|------|----------------|
| Finance / org admin | Chart of accounts, journals, reports |
| Manager | Month-end review |

Always visible by industry flag; still requires accounting permissions.

## Screens

| Path | Page |
|------|------|
| `/superadmin/accounting` | Chart of accounts |
| `/superadmin/accounting/journals` | Journal entries |
| `/superadmin/accounting/reports` | Reports |

---

## Setup

1. Open **Accounts**   create or review chart:
   - Assets (cash, bank, receivables)
   - Liabilities (payables, deposits)
   - Equity
   - Income (rental revenue, wash income, sales)
   - Expenses (fuel, maintenance, salaries)
2. Agree naming and codes with your accountant.
3. Optionally seed opening balances via journals.

---

## Workflow

### Post a journal

1. **Journals → New**
2. Enter date + memo (e.g. “Rental income 18 Jul”).
3. Add balanced lines:
   - Debit account(s)
   - Credit account(s)
4. Totals must balance (Dr = Cr).
5. Save / post.

### Reports

1. Open **Reports**.
2. Select period.
3. Review trial balance / P&L-style / balance views as provided by the page.

```
Accounts (chart) → Journals (daily postings) → Reports (period close)
```

---

## Connections

| Source of truth | How accounting uses it |
|-----------------|-------------------------|
| Rental bookings | Manual revenue / deposit journals |
| Car wash | Daily wash income |
| Garage / sales | Invoice / sale income |
| Fuel / maintenance | Expense journals |
| Bank | Cash / bank asset accounts |

Automation from verticals into journals may be limited   treat accounting as the finance layer you post into.

**No public APIs.**

---

## Full example   Ceylon Drive month-end

**18 Jul   three completed rentals, cash banked LKR 25,500**

| Account | Debit | Credit |
|---------|-------|--------|
| Bank | 25,500 | |
| Rental revenue | | 25,500 |

**Fuel expense same week LKR 8,200**

| Account | Debit | Credit |
|---------|-------|--------|
| Fuel expense | 8,200 | |
| Bank | | 8,200 |

**Reports** for July show rental income vs fuel/maintenance expenses for the rental org.
