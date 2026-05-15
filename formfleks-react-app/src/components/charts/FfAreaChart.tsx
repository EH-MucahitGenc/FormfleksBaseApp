import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartDataPoint {
  label: string;
  value: number;
}

interface FfAreaChartProps {
  data: ChartDataPoint[];
  color?: string;
  className?: string;
  height?: number | string;
}

export const FfAreaChart: React.FC<FfAreaChartProps> = ({ 
  data, 
  color = '#10B981', 
  className = '', 
  height = '100%' 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-brand-gray w-full animate-fade-in">
        <p className="text-sm">Henüz yeterli veri oluşmadı.</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-surface-muted, #E5E7EB)" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 11, fill: 'var(--app-brand-gray, #6B7280)' }} 
            axisLine={false} 
            tickLine={false} 
            tickMargin={10}
            minTickGap={20}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: 'var(--app-brand-gray, #6B7280)' }} 
            axisLine={false} 
            tickLine={false} 
          />
          <RechartsTooltip
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid var(--app-surface-muted, #F3F4F6)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
              backgroundColor: 'var(--app-surface-base, #ffffff)',
              color: 'var(--app-brand-dark, #111827)'
            }}
            cursor={{ stroke: 'var(--app-surface-muted, #F3F4F6)', strokeWidth: 1, strokeDasharray: '3 3' }}
            formatter={(value: number) => [value, 'Talep Sayısı']}
            labelStyle={{ color: 'var(--app-brand-gray, #6B7280)', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            activeDot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#FFF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
