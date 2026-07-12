// 📊 Reusable Chart Components - Usage Examples

import { LineChart, BarChart, PieChart, DonutChart, AreaChart } from './charts';

// ============================================================================
// 1️⃣ LINE CHART EXAMPLE
// ============================================================================

const LineChartExample = () => {
  const data = [
    { month: 'Jan', revenue: 45000, profit: 12000 },
    { month: 'Feb', revenue: 52000, profit: 15000 },
    { month: 'Mar', revenue: 48000, profit: 13000 },
  ];

  const formatCurrency = (value: number) => {
    return `Rs ${(value / 1000).toFixed(0)}K`;
  };

  return (
    <LineChart
      data={data}
      xAxisKey="month"
      dataKeys={[
        { key: 'revenue', name: 'Revenue', color: '#3B82F6' },
        { key: 'profit', name: 'Profit', color: '#10B981' }
      ]}
      height={350}
      formatYAxis={formatCurrency}
      formatTooltip={formatCurrency}
    />
  );
};

// ============================================================================
// 2️⃣ BAR CHART EXAMPLE
// ============================================================================

const BarChartExample = () => {
  const data = [
    { branch: 'Main', sales: 120, revenue: 450000 },
    { branch: 'Branch A', sales: 98, revenue: 380000 },
    { branch: 'Branch B', sales: 86, revenue: 320000 },
  ];

  return (
    <BarChart
      data={data}
      xAxisKey="branch"
      dataKeys={[
        { key: 'sales', name: 'Sales Count', color: '#3B82F6' },
        { key: 'revenue', name: 'Revenue', color: '#10B981' }
      ]}
      height={350}
      layout="horizontal"
    />
  );
};

// ============================================================================
// 3️⃣ PIE CHART EXAMPLE
// ============================================================================

const PieChartExample = () => {
  const data = [
    { name: 'Cash', value: 450000 },
    { name: 'Card', value: 380000 },
    { name: 'Bank Transfer', value: 250000 },
    { name: 'Mobile Payment', value: 120000 },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <PieChart
      data={data}
      colors={['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B']}
      height={350}
      formatTooltip={formatCurrency}
      showLabel={true}
      outerRadius={100}
    />
  );
};

// ============================================================================
// 4️⃣ DONUT CHART EXAMPLE
// ============================================================================

const DonutChartExample = () => {
  const data = [
    { name: 'Completed', value: 150 },
    { name: 'Pending', value: 45 },
    { name: 'Cancelled', value: 12 },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <DonutChart
      data={data}
      colors={['#10B981', '#F59E0B', '#EF4444']}
      height={350}
      showLabel={false}
      innerRadius={70}
      outerRadius={100}
      centerLabel="Total Sales"
      centerValue={total.toString()}
    />
  );
};

// ============================================================================
// 5️⃣ AREA CHART EXAMPLE
// ============================================================================

const AreaChartExample = () => {
  const data = [
    { date: 'Jan 1', orders: 25, revenue: 125000 },
    { date: 'Jan 2', orders: 30, revenue: 150000 },
    { date: 'Jan 3', orders: 28, revenue: 140000 },
  ];

  const formatCurrency = (value: number) => {
    return `Rs ${(value / 1000).toFixed(0)}K`;
  };

  return (
    <AreaChart
      data={data}
      xAxisKey="date"
      dataKeys={[
        { key: 'revenue', name: 'Revenue', color: '#3B82F6' },
        { key: 'orders', name: 'Orders', color: '#10B981' }
      ]}
      height={350}
      formatYAxis={formatCurrency}
      formatTooltip={formatCurrency}
      stacked={false}
    />
  );
};

// ============================================================================
// 6️⃣ STACKED AREA CHART EXAMPLE
// ============================================================================

const StackedAreaChartExample = () => {
  const data = [
    { month: 'Jan', online: 45000, retail: 32000, wholesale: 15000 },
    { month: 'Feb', online: 52000, retail: 38000, wholesale: 18000 },
    { month: 'Mar', online: 48000, retail: 35000, wholesale: 16000 },
  ];

  return (
    <AreaChart
      data={data}
      xAxisKey="month"
      dataKeys={[
        { key: 'online', name: 'Online', color: '#3B82F6' },
        { key: 'retail', name: 'Retail', color: '#10B981' },
        { key: 'wholesale', name: 'Wholesale', color: '#F59E0B' }
      ]}
      height={350}
      stacked={true}
    />
  );
};

// ============================================================================
// 7️⃣ COMPLETE DASHBOARD EXAMPLE
// ============================================================================

export const CompleteDashboardExample = () => {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Sales Dashboard</h1>
      
      {/* Revenue Trend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
        <LineChartExample />
      </div>

      {/* Branch Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Branch Performance</h3>
        <BarChartExample />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
          <PieChartExample />
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Order Status</h3>
          <DonutChartExample />
        </div>
      </div>

      {/* Sales Over Time */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Over Time</h3>
        <AreaChartExample />
      </div>

      {/* Channel Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Channel Performance</h3>
        <StackedAreaChartExample />
      </div>
    </div>
  );
};

// ============================================================================
// 📝 USAGE NOTES
// ============================================================================

/*
All reusable chart components support:
✅ Responsive design (ResponsiveContainer)
✅ Custom colors
✅ Custom formatters for Y-axis and tooltips
✅ Custom height
✅ Legend and tooltips
✅ TypeScript type safety

Common formatters:
- Currency: formatCurrency (shown above)
- Percentage: (value) => `${value}%`
- Compact numbers: (value) => `${(value / 1000).toFixed(0)}K`
- Date: (value) => new Date(value).toLocaleDateString()

Import statement:
import { LineChart, BarChart, PieChart, DonutChart, AreaChart } from './charts';

Or individually:
import LineChart from './charts/LineChart';
*/
