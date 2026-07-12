import { useCallback, useEffect, useState } from 'react';
import {
  whatsappOrdersService,
  type WhatsAppOrder,
  type WhatsAppOrderStatus,
  type OrderInput,
  type ShipmentInput,
} from '../services/whatsappService';
import alert from '../utils/alert';

export type OrderStatusFilter = WhatsAppOrderStatus | 'ALL';

export default function useWhatsAppOrders(orgId: string | undefined) {
  const [orders, setOrders] = useState<WhatsAppOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('DRAFT');
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await whatsappOrdersService.list(orgId, {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100,
      });
      setOrders(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch (err) {
      alert.error(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [orgId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmOrder = useCallback(
    async (id: string, shipment?: ShipmentInput): Promise<boolean> => {
      if (!orgId) return false;
      setActionId(id);
      try {
        const res = await whatsappOrdersService.confirm(orgId, id, { shipment });
        const tracking = res?.courier?.trackingNumber;
        alert.success(tracking ? `Order confirmed · shipment ${tracking}` : 'Order confirmed');
        await load();
        return true;
      } catch (err) {
        // Courier creation failed → order stays DRAFT.
        alert.error(err instanceof Error ? err.message : 'Failed to confirm order');
        return false;
      } finally {
        setActionId(null);
      }
    },
    [orgId, load],
  );

  const cancelOrder = useCallback(
    async (id: string, reason?: string) => {
      if (!orgId) return;
      setActionId(id);
      try {
        await whatsappOrdersService.cancel(orgId, id, reason);
        alert.success('Order cancelled');
        await load();
      } catch (err) {
        alert.error(err instanceof Error ? err.message : 'Failed to cancel order');
      } finally {
        setActionId(null);
      }
    },
    [orgId, load],
  );

  const bulkConfirm = useCallback(
    async (ids: string[], notifyCustomer = true) => {
      if (!orgId || !ids.length) return;
      setLoading(true);
      try {
        const res = await whatsappOrdersService.bulkConfirm(orgId, ids, notifyCustomer);
        const confirmed = res.confirmed?.length ?? 0;
        const skipped = res.skipped?.length ?? 0;
        alert.success(`Confirmed ${confirmed} order(s)${skipped ? `, skipped ${skipped}` : ''}`);
        await load();
      } catch (err) {
        alert.error(err instanceof Error ? err.message : 'Failed to confirm orders');
      } finally {
        setLoading(false);
      }
    },
    [orgId, load],
  );

  const createOrder = useCallback(
    async (payload: OrderInput): Promise<boolean> => {
      if (!orgId) return false;
      try {
        await whatsappOrdersService.create(orgId, payload);
        alert.success('Order created');
        await load();
        return true;
      } catch (err) {
        alert.error(err instanceof Error ? err.message : 'Failed to create order');
        return false;
      }
    },
    [orgId, load],
  );

  const updateOrder = useCallback(
    async (id: string, payload: Partial<OrderInput>): Promise<boolean> => {
      if (!orgId) return false;
      try {
        await whatsappOrdersService.update(orgId, id, payload);
        alert.success('Order updated');
        await load();
        return true;
      } catch (err) {
        alert.error(err instanceof Error ? err.message : 'Failed to update order');
        return false;
      }
    },
    [orgId, load],
  );

  return {
    orders,
    total,
    loading,
    statusFilter,
    setStatusFilter,
    actionId,
    reload: load,
    confirmOrder,
    cancelOrder,
    bulkConfirm,
    createOrder,
    updateOrder,
  };
}
