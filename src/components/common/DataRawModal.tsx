/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  MapPin, 
  DollarSign, 
  Clock, 
  Hash, 
  Tag, 
  Box,
  AlertTriangle
} from 'lucide-react';

// You can import this from your types file if you have one exported
interface DataRawModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any | null; // Replace 'any' with your InventoryItem interface
  title?: string;
}

export default function InventoryViewModal({ isOpen, onClose, data, title }: DataRawModalProps) {
  if (!data) return null;

  const item = data;
  const product = item.product || {};
  const location = item.location || {};

  // Status Color Logic
  const isOutOfStock = item.quantity === 0;
  const isLowStock = item.quantity > 0 && item.quantity <= (item.minStockLevel || product.minStockLevel || 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value || 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasValue = (v: any) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true; // numbers and booleans
  };

  const hasNumber = (n: any) => typeof n === 'number' && !isNaN(n);

  return (
    <Dialog  open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] !max-w-5xl  !overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {title || product.name || 'Unknown Product'}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                {hasValue(product.isActive) && (
                  <Badge variant={product.isActive ? "default" : "destructive"}>
                    {product.isActive ? 'Active Product' : 'Inactive Product'}
                  </Badge>
                )}
                {isOutOfStock ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Out of Stock
                  </Badge>
                ) : isLowStock ? (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Low Stock
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    In Stock
                  </Badge>
                )}
                {hasValue(product.category?.name) && (
                  <Badge variant="outline">{product.category.name}</Badge>
                )}
              </div>
            </div>
            {product.primaryImage && (
              <img 
                src={product.primaryImage} 
                alt={product.name} 
                className="w-24 h-24 object-cover rounded-md border"
              />
            )}
          </div>
        </DialogHeader>

        <Separator className="my-2" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-500" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {hasValue(product.productCode) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Code:</span>
                  <span className="font-medium">{product.productCode}</span>
                </div>
              )}

              {hasValue(product.sku) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-medium">{product.sku}</span>
                </div>
              )}

              {hasValue(product.brand) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand:</span>
                  <span className="font-medium">{product.brand}</span>
                </div>
              )}

              {hasValue(product.model) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{product.model}</span>
                </div>
              )}

              {hasNumber(product.warrantyMonths) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warranty:</span>
                  <span className="font-medium">{product.warrantyMonths} Months</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-green-500" />
                Stock Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {hasNumber(item.quantity) && (
                <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                  <span className="font-semibold text-gray-700">Total Quantity:</span>
                  <span className="text-xl font-bold text-gray-900">{item.quantity}</span>
                </div>
              )}

              {hasNumber(item.availableQuantity) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Quantity:</span>
                  <span className="font-medium text-green-600">{item.availableQuantity}</span>
                </div>
              )}

              {hasNumber(item.reservedQuantity) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reserved Quantity:</span>
                  <span className="font-medium text-orange-500">{item.reservedQuantity}</span>
                </div>
              )}

              {(hasNumber(item.minStockLevel) || hasNumber(product.minStockLevel)) && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Stock Level:</span>
                    <span className="font-medium">{hasNumber(item.minStockLevel) ? item.minStockLevel : product.minStockLevel}</span>
                  </div>
                </>
              )}

              {hasNumber(item.maxStockLevel) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Stock Level:</span>
                  <span className="font-medium">{item.maxStockLevel}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {hasValue(location.name) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch/Location:</span>
                  <span className="font-medium">{location.name}</span>
                </div>
              )}

              {hasValue(location.locationCode) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location Code:</span>
                  <span className="font-medium">{location.locationCode}</span>
                </div>
              )}

              {hasValue(location.locationType) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{location.locationType.toLowerCase()}</span>
                </div>
              )}

              {hasValue(item.zone) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zone:</span>
                  <span className="font-medium">{item.zone}</span>
                </div>
              )}

              {hasValue(item.warehouseLocation) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Warehouse Loc:</span>
                  <span className="font-medium">{item.warehouseLocation}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Financials Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-500" />
                Pricing & Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {hasNumber(product.unitPrice) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="font-medium">{formatCurrency(product.unitPrice)}</span>
                </div>
              )}

              {hasNumber(product.costPrice) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Price:</span>
                  <span className="font-medium">{formatCurrency(product.costPrice)}</span>
                </div>
              )}

              {hasNumber(item.averageCost) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Cost:</span>
                  <span className="font-medium">{formatCurrency(item.averageCost)}</span>
                </div>
              )}

              {hasNumber(item.totalValue) && (
                <>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded-md">
                    <span className="font-semibold text-gray-700">Total Value:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(item.totalValue)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timestamps Card (Full Width) */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {hasValue(item.lastRestocked) && (
                <div>
                  <p className="text-muted-foreground mb-1">Last Restocked</p>
                  <p className="font-medium">{formatDate(item.lastRestocked)}</p>
                </div>
              )}

              {hasValue(item.lastStockCheck) && (
                <div>
                  <p className="text-muted-foreground mb-1">Last Stock Check</p>
                  <p className="font-medium">{formatDate(item.lastStockCheck)}</p>
                </div>
              )}

              {hasValue(item.createdAt) && (
                <div>
                  <p className="text-muted-foreground mb-1">Created At</p>
                  <p className="font-medium">{formatDate(item.createdAt)}</p>
                </div>
              )}

              {hasValue(item.updatedAt) && (
                <div>
                  <p className="text-muted-foreground mb-1">Last Updated</p>
                  <p className="font-medium">{formatDate(item.updatedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}