import QuickPOSPage from "./QuickPOSPage";

/** Quick POS copy that lists only out-of-stock products and creates AWAITING_STOCK orders. */
export default function PreOrderPOSPage() {
  return <QuickPOSPage preOrderMode />;
}
