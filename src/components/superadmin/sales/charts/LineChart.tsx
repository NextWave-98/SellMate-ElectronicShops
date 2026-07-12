import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartProps {
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
}

export default function LineChart({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  formatYAxis,
  formatTooltip,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        {dataKeys.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            dot={{ fill: item.color, r: 4 }}
            name={item.name}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
