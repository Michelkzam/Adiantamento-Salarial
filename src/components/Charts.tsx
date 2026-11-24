import React from 'react';
import { formatBRL } from '../utils/currency';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      {title && (
        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">{title}</h4>
      )}
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center space-x-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 w-24 truncate text-right">
              {item.label}
            </span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-5 overflow-hidden">
              <div
                className={`h-5 rounded-full transition-all duration-500 ${item.color || 'bg-blue-500'}`}
                style={{ width: `${(item.value / maxValue) * 100}%`, minWidth: item.value > 0 ? '2px' : '0' }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-20 text-right">
              {formatBRL(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PieChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ segments, size = 120 }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let cumulativePercent = 0;
  const gradientParts: string[] = [];

  segments.forEach((seg) => {
    const percent = (seg.value / total) * 100;
    gradientParts.push(`${seg.color} ${cumulativePercent}% ${cumulativePercent + percent}%`);
    cumulativePercent += percent;
  });

  return (
    <div className="flex items-center space-x-4">
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradientParts.join(', ')})`,
        }}
      />
      <div className="space-y-1">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center space-x-2 text-xs">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 dark:text-gray-400">{seg.label}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
