/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Receipt,
  Printer,
  Calendar,
  Hash,
  Download,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { OrderData } from "./PaymentModal";
import { formatDateTime } from "../../../utils/dateUtils";
import useSales from "../../../hooks/useSales";
import { formatCurrency } from "../../../utils/currency";
import PrintOptionsModal from "./PrintOptionsModal";
import CashDrawerOpenOverlay from "./CashDrawerOpenOverlay";
import { usePOSSettings } from "../../../hooks/usePOSSettings";
import toast from "react-hot-toast";

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: OrderData | null;
  responseData: any;
}

const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  orderData,
  responseData,
}) => {
  const { downloadInvoice, silentPrintInvoice } = useSales();
  const { getSettings } = usePOSSettings();
  const posSettings = getSettings();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showCashDrawer, setShowCashDrawer] = useState(false);

  // Show cash drawer overlay when this is a cash payment
  useEffect(() => {
    if (
      isOpen &&
      orderData?.payment?.method === "cash" &&
      posSettings.autoCashDrawer
    ) {
      setShowCashDrawer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || !orderData || !orderData.payment) return null;

  const handleDownloadPDF = () => {
    downloadInvoice(responseData.saleId, { format: "a4" });
  };

  const calculateSubtotal = () => {
    return orderData.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  };

  const calculateDiscountAmount = () => {
    return orderData.discount || 0;
  };

  const calculateChange = () => {
    if (orderData.payment.method === "cash" && orderData.payment.cashReceived) {
      return orderData.payment.cashReceived - orderData.payment.totalAmount;
    }
    return 0;
  };

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl p-0  ">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 no-print">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Payment Successful
              </DialogTitle>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 no-print">
            <div className="space-y-6">
              {/* Success Message */}
              <div className="flex flex-col items-center justify-center">
                <div className="bg-green-50 p-6 rounded-full mb-4">
                  <CheckCircle className="w-15 h-15 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Payment Successful!
                </h3>
                <p className="text-gray-600 mb-2">
                  Transaction completed successfully
                </p>
              </div>

              {/* Invoice Summary */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Invoice Summary
                  </h3>
                  <Receipt className="w-5 h-5 text-gray-500" />
                </div>

                {/* Bill Details */}
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Bill Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Bill Number</p>
                        <p className="text-sm font-medium text-gray-900">
                          {responseData?.saleNumber ||
                            responseData?.saleId ||
                            "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Date & Time</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(orderData.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {orderData.items && orderData.items.length > 0 && (
                  <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Items Purchased
                    </h4>
                    <div className="space-y-2">
                      {orderData.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="text-gray-900 font-medium truncate block">
                              {item.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatCurrency(item.price)} × {item.quantity}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                <div className="border-t border-gray-300 pt-4">
                  <div className="space-y-2">
                    {/* Subtotal */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(calculateSubtotal())}
                      </span>
                    </div>

                    {/* Discount */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        Discount
                        {parseFloat(String(orderData.discount || 0)) > 0 && (
                          <>
                            (
                            {orderData.discountType === "PERCENTAGE"
                              ? `${((parseFloat(String(orderData.discount)) / calculateSubtotal()) * 100).toFixed(2)}%`
                              : `${formatCurrency(Number(orderData.discount || 0))}`}
                            )
                          </>
                        )}
                        {/* {orderData.discountReason && (
                          <span className="text-xs text-gray-500">({orderData.discountReason})</span>
                        )} */}
                      </span>
                      <span
                        className={`font-medium ${parseFloat(String(orderData.discount || 0)) > 0 ? "text-red-600" : "text-gray-900"}`}
                      >
                        {parseFloat(String(orderData.discount || 0)) > 0
                          ? "-"
                          : ""}
                        {formatCurrency(calculateDiscountAmount())}
                      </span>
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {orderData.payment.method}
                      </span>
                    </div>

                    {/* Reference Number */}
                    {(responseData?.referenceNumber ||
                      responseData?.reference ||
                      responseData?.payments?.[0]?.reference) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Reference #</span>
                        <span className="font-medium text-gray-900 font-mono">
                          {responseData?.referenceNumber ||
                            responseData?.reference ||
                            responseData?.payments?.[0]?.reference}
                        </span>
                      </div>
                    )}

                    {orderData.payment.method === "cash" &&
                      orderData.payment.cashReceived && (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Cash Received</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(orderData.payment.cashReceived)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-semibold text-gray-900">
                              Change
                            </span>
                            <span className="text-2xl font-bold text-green-600">
                              {formatCurrency(calculateChange())}
                            </span>
                          </div>
                        </>
                      )}

                    <div className="h-px bg-gray-300 my-2"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">
                        Total Paid
                      </span>
                      <span className="text-3xl font-bold text-orange-600">
                        {formatCurrency(orderData.payment.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={async () => {
                    if (posSettings.defaultPrinterId) {
                      try {
                        await silentPrintInvoice(responseData.saleId, {
                          format: posSettings.defaultFormat,
                        });
                        toast.success(
                          `Printed to default printer (${posSettings.defaultFormat})`,
                          { duration: 3000 },
                        );
                      } catch {
                        toast.error(
                          "Failed to print. Check printer connection.",
                        );
                      }
                    } else {
                      setIsPrintModalOpen(true);
                    }
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Printer className="w-5 h-5" />
                  Print Default Receipt
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Download className="w-5 h-5" />
                  Download A4 Invoice
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Drawer Opening Overlay */}
      <CashDrawerOpenOverlay
        visible={showCashDrawer}
        onDone={() => setShowCashDrawer(false)}
      />

      {/* Print Options Modal */}
      {responseData?.saleId && (
        <PrintOptionsModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          saleId={responseData.saleId}
          defaultPrinterId={posSettings.defaultPrinterId}
          defaultFormat={posSettings.defaultFormat}
        />
      )}
    </>
  );
};

export default BillModal;
