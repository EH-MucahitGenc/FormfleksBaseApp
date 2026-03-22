import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const DEFAULT_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

export interface FfPieChartProps {
  data: { label: string; value: number }[];
  height?: number;
  colors?: string[];
  donut?: boolean;
  className?: string;
}

/**
 * Enterprise V4 Pie/Donut Chart Wrapper
 * Pre-styled Recharts PieChart with brand-aware palette and premium tooltip.
 */
export const FfPieChart: React.FC<FfPieChartProps> = ({
  data,
  height = 280,
  colors = DEFAULT_COLORS,
  donut = true,
  className,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-sm text-brand-gray/60 italic">
        Henüz yeterli veri oluşmadı.
      </div>
    );
  }

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={donut ? 60 : 0}
            outerRadius={85}
            paddingAngle={donut ? 5 : 0}
            dataKey="value"
            nameKey="label"
            stroke="none"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '10px',
              border: 'none',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs text-brand-dark font-medium">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
