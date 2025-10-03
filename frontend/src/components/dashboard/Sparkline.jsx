import { memo, useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';

function formatSparklineData(data = []) {
  return data.map((value, index) => ({ index, value: Number(value) || 0 }));
}

function Sparkline({ data = [], color = '#4f46e5', ariaLabel }) {
  const normalized = useMemo(() => formatSparklineData(data), [data]);

  if (!normalized.length) {
    return null;
  }

  return (
    <div className="h-16 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalized} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <Tooltip
            cursor={false}
            formatter={(value) => [value, '']}
            labelFormatter={() => ''}
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.85)',
              borderRadius: '0.5rem',
              border: 'none',
              color: '#fff',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(Sparkline);
