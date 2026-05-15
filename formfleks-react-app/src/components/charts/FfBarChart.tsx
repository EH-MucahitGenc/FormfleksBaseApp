import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface FfBarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  className?: string;
}

/**
 * Enterprise V4 Bar Chart Wrapper
 * Pre-styled Recharts BarChart with brand tokens and premium tooltip.
 */
export const FfBarChart: React.FC<FfBarChartProps> = ({
  data,
  height = 280,
  barColor = '#f6894c',
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
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-surface-muted, #E5E7EB)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--app-brand-gray, #6B7280)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--app-brand-gray, #6B7280)' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--app-surface-muted, #F3F4F6)' }}
            contentStyle={{
              borderRadius: '10px',
              border: 'none',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
            }}
          />
          <Bar dataKey="value" fill={barColor} radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
