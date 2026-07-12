import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AreaChartProps {
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
  stacked?: boolean;
}

export default function AreaChart({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  formatYAxis,
  formatTooltip,
  stacked = false,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data}>
        <defs>
          {dataKeys.map((item) => (
            <linearGradient key={item.key} id={`color${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={item.color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={item.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        {dataKeys.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            fillOpacity={1}
            fill={`url(#color${item.key})`}
            name={item.name}
            stackId={stacked ? '1' : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
