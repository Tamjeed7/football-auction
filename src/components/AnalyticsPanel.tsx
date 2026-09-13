import React from 'react';
import { Player } from '../types';
import { motion } from 'motion/react';

interface AnalyticsPanelProps {
  team: Player[];
}

export function AnalyticsPanel({ team }: AnalyticsPanelProps) {
  if (team.length === 0) {
    return (
      <div className="text-center font-semibold text-ink-faint italic mt-4 h-64 flex items-center justify-center">
        No stats available yet.
      </div>
    );
  }

  const avg = (key: keyof Pick<Player, 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy' | 'overall'>) => {
    return Math.round(team.reduce((acc, p) => acc + (p[key] as number), 0) / team.length);
  };

  const stats = [
    { label: 'PAC', full: 'Pace', value: avg('pac') },
    { label: 'SHO', full: 'Shooting', value: avg('sho') },
    { label: 'PAS', full: 'Passing', value: avg('pas') },
    { label: 'DRI', full: 'Dribbling', value: avg('dri') },
    { label: 'DEF', full: 'Defending', value: avg('def') },
    { label: 'PHY', full: 'Physical', value: avg('phy') },
  ];

  return (
    <div className="flex flex-col gap-4 mt-4 h-[400px] overflow-hidden">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="stat-tile flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="font-mono font-bold tracking-[0.15em] text-sm leading-none text-ink">{stat.label}</span>
                <span className="text-[10px] text-ink-faint uppercase tracking-wide leading-tight mt-1">{stat.full}</span>
              </div>
              <span className="text-2xl font-bold font-mono tabular-nums text-ink">{stat.value}</span>
            </div>

            <div className="w-full bg-paper border border-rule h-1.5 rounded-full overflow-hidden relative mt-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stat.value}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-gold absolute left-0 top-0"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="ledger-card p-4 flex flex-col justify-center items-center h-full">
        <div className="ledger-tag mb-2">Squad size</div>
        <div className="text-2xl font-bold text-ink mb-3 font-mono tabular-nums">
          {team.length} <span className="text-ink-faint">/ 23</span>
        </div>
        <div className="w-full bg-paper border border-rule h-2 rounded-full overflow-hidden relative max-w-[200px]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(team.length / 23) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full bg-red absolute left-0 top-0"
          />
        </div>
      </div>
    </div>
  );
}
