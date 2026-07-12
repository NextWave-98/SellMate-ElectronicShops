import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CreditCard } from 'lucide-react';
import type { PaymentMethodData } from '../../../../hooks/useSales';
import { formatChartCurrency } from '../../../../utils/currency';

interface PaymentMethodChartProps {
  data?: PaymentMethodData[];
}

const COLORS: Record<string, string> = {
  CASH: '#10B981',
  CARD: '#3B82F6',
  BANK_TRANSFER: '#8B5CF6',
  MOBILE_PAYMENT: '#F59E0B',
  CHECK: '#6B7280',
  OTHER: '#EC4899',
};

export default function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-600" />
          Payment Methods
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.method ? item.method.replace('_', ' ') : 'Unknown',
    value: item.amount,
    count: item.count,
    percentage: item.percentage,
  }));

  const formatCurrency = (value: number) => formatChartCurrency(value);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-purple-600" />
        Payment Methods
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name.toUpperCase().replace(' ', '_')] || '#6B7280'} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
