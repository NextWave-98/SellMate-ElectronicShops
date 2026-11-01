/**
 * Suggested permission packs for creating branch-scoped inventory roles.
 * Must match backend inventory-role-templates.ts packs.
 */
export const INVENTORY_ROLE_TEMPLATES = [
  {
    key: 'MONITOR_ONLY',
    name: 'Branch Inventory Monitor',
    description: 'View and export inventory for the assigned branch only',
    permissionNames: ['inventory.read', 'reports.inventory'],
  },
  {
    key: 'BRANCH_STOCK_OPS',
    name: 'Branch Stock Ops',
    description: 'Monitor, adjust, and transfer stock from the assigned branch',
    permissionNames: [
      'inventory.read',
      'inventory.update',
      'inventory.adjust',
      'inventory.transfer',
    ],
  },
  {
    key: 'INVENTORY_MANAGER',
    name: 'Inventory Manager',
    description:
      'Full branch inventory management (create, adjust, transfer, delete) scoped to assigned branch',
    permissionNames: [
      'inventory.create',
      'inventory.read',
      'inventory.update',
      'inventory.delete',
      'inventory.adjust',
      'inventory.transfer',
      'inventory.approve',
      'stock-releases.create',
      'stock-releases.read',
      'stock-releases.approve',
      'stock.read',
      'stock.write',
      'reports.inventory',
    ],
  },
] as const;
