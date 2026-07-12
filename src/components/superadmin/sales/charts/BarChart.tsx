import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: Record<string, string | number>[];
  dataKeys: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  xAxisKey: string;
  height?: number;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  layout?: 'horizontal' | 'vertical';
}

export default function BarChart({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  formatYAxis,
  formatTooltip,
  layout = 'horizontal',
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        {dataKeys.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            fill={item.color}
            name={item.name}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
