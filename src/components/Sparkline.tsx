import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { Bid } from '../types';

interface SparklineProps {
  history: Bid[];
}

export function Sparkline({ history }: SparklineProps) {
  // `history` is recent first, so we reverse it to chronological order.
  const data = [...history].reverse().map((bid, index) => ({
    index,
    amount: bid.amount
  }));

  if (data.length < 2) {
    return (
      <div className="h-12 w-full flex items-center justify-center mb-4">
        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest animate-pulse">Awaiting Bids...</div>
      </div>
    );
  }

  return (
    <div className="h-16 w-full mt-2 mb-4 -ml-2 opacity-70 transition-opacity hover:opacity-100">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area 
            type="monotone" 
            dataKey="amount" 
            stroke="#00f0ff" 
            fillOpacity={1} 
            fill="url(#colorAmount)" 
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
