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
        <div className="ledger-tag">Awaiting bids…</div>
      </div>
    );
  }

  return (
    <div className="h-16 w-full mt-2 mb-4 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-gold-strong)" stopOpacity={0.35}/>
              <stop offset="95%" stopColor="var(--color-gold-strong)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="var(--color-gold-strong)"
            fillOpacity={1}
            fill="url(#colorAmount)"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={220}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
