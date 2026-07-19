/** Shared bits for the Accounting sub-pages. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const money = (n: any) => `Rs ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
