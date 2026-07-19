import React, { useEffect, useState, useMemo } from 'react';

interface InteractiveChartProps {
  isDarkMode: boolean;
  timeframe: string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ isDarkMode, timeframe }) => {
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  const [livePrice, setLivePrice] = useState<number>(1.08520);

  // Generate initial dataset based on timeframe
  useEffect(() => {
    let basePrice = 1.08500;
    const pointsCount = 40;
    const newPoints: number[] = [];
    const variance = timeframe === '1' ? 0.0004 : timeframe === '5' ? 0.0012 : timeframe === '60' ? 0.0035 : 0.0060;

    for (let i = 0; i < pointsCount; i++) {
      basePrice += (Math.random() - 0.5) * variance;
      newPoints.push(basePrice);
    }
    setDataPoints(newPoints);
    setLivePrice(newPoints[newPoints.length - 1]);
  }, [timeframe]);

  // Real-time tick generator
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => {
        const tick = (Math.random() - 0.5) * 0.00008;
        const nextPrice = prev + tick;
        
        setDataPoints((prevPoints) => {
          const updated = [...prevPoints.slice(1), nextPrice];
          return updated;
        });
        
        return nextPrice;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // SVG dimensions & coordinate calculators
  const width = 500;
  const height = 240;
  const padding = 20;

  const { min, max, svgPath, gradientPath } = useMemo(() => {
    if (dataPoints.length === 0) return { min: 0, max: 0, svgPath: '', gradientPath: '' };
    
    const minVal = Math.min(...dataPoints);
    const maxVal = Math.max(...dataPoints);
    const range = maxVal - minVal || 1;

    const coords = dataPoints.map((val, idx) => {
      const x = padding + (idx / (dataPoints.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return { x, y };
    });

    const path = coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const grad = `${path} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    return { min: minVal, max: maxVal, svgPath: path, gradientPath: grad };
  }, [dataPoints]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-between px-4 mb-2 text-xs font-semibold">
        <span className="text-slate-400 font-display">RAV / LEVERAGE: Up to 100x</span>
        <span className="text-blue-500 text-lg font-mono font-bold tracking-wider">
          {livePrice.toFixed(5)}
        </span>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 p-2 h-[260px] shadow-lg shadow-black/30">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-6 opacity-40">
          <div className="border-b border-slate-800/50 w-full" />
          <div className="border-b border-slate-800/50 w-full" />
          <div className="border-b border-slate-800/50 w-full" />
          <div className="border-b border-slate-800/50 w-full" />
        </div>

        {/* Max / Min indicators */}
        <div className="absolute right-4 top-4 text-[10px] font-mono text-slate-500">
          MAX: {max.toFixed(5)}
        </div>
        <div className="absolute right-4 bottom-4 text-[10px] font-mono text-slate-500">
          MIN: {min.toFixed(5)}
        </div>

        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>

          {/* Area under the line */}
          {gradientPath && (
            <path d={gradientPath} fill="url(#chartGradient)" />
          )}

          {/* Main trend line */}
          {svgPath && (
            <path
              d={svgPath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Live pulsing coordinate indicator */}
          {dataPoints.length > 0 && (
            <g>
              <circle
                cx={width - padding}
                cy={height - padding - ((livePrice - min) / (max - min || 1)) * (height - padding * 2)}
                r="7"
                fill="#3b82f6"
                className="animate-ping"
                style={{ transformOrigin: 'center' }}
              />
              <circle
                cx={width - padding}
                cy={height - padding - ((livePrice - min) / (max - min || 1)) * (height - padding * 2)}
                r="4.5"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
