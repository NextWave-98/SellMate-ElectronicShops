import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: string | number;
  }>;
  colors?: string[];
  height?: number;
  formatTooltip?: (value: number) => string;
  showLabel?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function PieChart({
  data,
  colors = DEFAULT_COLORS,
  height = 300,
  formatTooltip,
  showLabel = true,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={showLabel}
          label={showLabel}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
