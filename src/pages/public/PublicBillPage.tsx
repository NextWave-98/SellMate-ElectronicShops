import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_BASE_URL ||
  "https://gadget-chain-manager-backend.vercel.app/api";

interface BillLine {
  name: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  lineTotal: number;
  serialNumbers?: string[];
  warrantyMonths?: number;
}

interface PublicBill {
  saleId: string;
  saleNumber: string;
  saleDate: string;
  branding: {
    businessName: string;
    address?: string;
    telephone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
  };
  location?: { name?: string; address?: string; phone?: string };
  customer?: { name?: string; phone?: string; email?: string };
  cashier?: string;
  lines: BillLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  balanceDue: number;
  payments: { method: string; amount: number; reference?: string }[];
  warrantyNote?: string;
  footerNote?: string;
}

const money = (n: number | undefined) =>
  `Rs ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Customer-facing bill page behind every `/bill/<token>` link sent from Quick POS.
 *
 * Unauthenticated by design: the 32-character token is the only thing that
 * resolves the sale, and the payload is the same receipt builder the printer
 * uses, so the header follows the branch-vs-organization setting.
 */
export default function PublicBillPage() {
  const { shareToken } = useParams();
  const [bill, setBill] = useState<PublicBill | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${BASE_URL}/public/bills/${shareToken}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) setBill(res.data.data);
        else setError(res.data?.message || "Bill not found");
      })
      .catch(() => {
        if (!cancelled) setError("This bill link is not valid or has been removed.");
      });
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6 text-center">
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500 text-sm">Loading bill…</p>
      </div>
    );
  }

  const b = bill.branding || ({} as PublicBill["branding"]);
  const pdfUrl = `${BASE_URL}/public/bills/${shareToken}/pdf?format=a4`;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 print:bg-white print:py-0">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex justify-end gap-2 print:hidden">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            Download PDF
          </a>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-[#1e3a8a] text-white text-sm hover:bg-[#1e40af]"
          >
            Print
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden print:shadow-none print:rounded-none">
          {/* Shop header */}
          <div className="px-5 pt-6 pb-4 text-center border-b border-dashed border-gray-200">
            {b.logoUrl && (
              <img
                src={b.logoUrl}
                alt={b.businessName}
                className="h-12 mx-auto mb-3 object-contain"
              />
            )}
            <h1 className="text-lg font-bold text-gray-900">{b.businessName}</h1>
            {b.address && <p className="text-xs text-gray-500 mt-1">{b.address}</p>}
            {b.telephone && <p className="text-xs text-gray-500">{b.telephone}</p>}
            {b.email && <p className="text-xs text-gray-500">{b.email}</p>}
            {b.website && <p className="text-xs text-gray-500">{b.website}</p>}
          </div>

          {/* Meta */}
          <div className="px-5 py-4 text-xs text-gray-600 space-y-1 border-b border-dashed border-gray-200">
            <div className="flex justify-between">
              <span>Bill No</span>
              <span className="font-semibold text-gray-900">{bill.saleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{new Date(bill.saleDate).toLocaleString()}</span>
            </div>
            {bill.customer?.name && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{bill.customer.name}</span>
              </div>
            )}
            {bill.cashier && (
              <div className="flex justify-between">
                <span>Served by</span>
                <span>{bill.cashier}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="px-5 py-4 space-y-3 border-b border-dashed border-gray-200">
            {bill.lines?.map((line, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-900 font-medium">{line.name}</span>
                  <span className="text-gray-900 whitespace-nowrap">
                    {money(line.lineTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                  <span>
                    {line.quantity} × {money(line.unitPrice)}
                    {line.discount ? ` − ${money(line.discount)}` : ""}
                  </span>
                  {!!line.warrantyMonths && (
                    <span>{line.warrantyMonths} mo warranty</span>
                  )}
                </div>
                {!!line.serialNumbers?.length && (
                  <p className="text-[11px] text-gray-400 mt-0.5 break-all">
                    S/N: {line.serialNumbers.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 text-sm space-y-1.5 border-b border-dashed border-gray-200">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{money(bill.subtotal)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span>− {money(bill.discount)}</span>
              </div>
            )}
            {bill.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{money(bill.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>{money(bill.total)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Paid</span>
              <span>{money(bill.paid)}</span>
            </div>
            {bill.balanceDue > 0 && (
              <div className="flex justify-between font-semibold text-orange-700">
                <span>Balance due</span>
                <span>{money(bill.balanceDue)}</span>
              </div>
            )}
          </div>

          {/* Payments */}
          {!!bill.payments?.length && (
            <div className="px-5 py-4 text-xs text-gray-600 space-y-1 border-b border-dashed border-gray-200">
              {bill.payments.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span>{p.method}</span>
                  <span>{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-5 text-center space-y-1">
            {bill.warrantyNote && (
              <p className="text-[11px] text-gray-500">{bill.warrantyNote}</p>
            )}
            <p className="text-xs text-gray-600">
              {bill.footerNote || "Thank you for shopping with us!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
