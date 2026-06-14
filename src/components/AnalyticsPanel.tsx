import React from 'react';
import { Player } from '../types';
import { motion } from 'motion/react';

interface AnalyticsPanelProps {
  team: Player[];
}

export function AnalyticsPanel({ team }: AnalyticsPanelProps) {
  if (team.length === 0) {
    return (
      <div className="text-center font-bold text-gray-500 italic mt-4 h-64 flex items-center justify-center">
        No stats available yet.
      </div>
    );
  }

  // Calculate averages
  const avg = (key: keyof Pick<Player, 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy' | 'overall'>) => {
    return Math.round(team.reduce((acc, p) => acc + (p[key] as number), 0) / team.length);
  };

    const stats = [
      { label: 'PAC', full: 'Pace', value: avg('pac'), color: 'bg-brand1 shadow-[0_0_10px_rgba(0,240,255,0.8)]', bg: 'bg-brand1/10 border-brand1/20', text: 'text-brand1' },
      { label: 'SHO', full: 'Shooting', value: avg('sho'), color: 'bg-brand3 shadow-[0_0_10px_rgba(255,0,85,0.8)]', bg: 'bg-brand3/10 border-brand3/20', text: 'text-brand3' },
      { label: 'PAS', full: 'Passing', value: avg('pas'), color: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]', bg: 'bg-emerald-400/10 border-emerald-400/20', text: 'text-emerald-400' },
      { label: 'DRI', full: 'Dribbling', value: avg('dri'), color: 'bg-[#b066ff] shadow-[0_0_10px_rgba(176,102,255,0.8)]', bg: 'bg-brand2/20 border-brand2/30', text: 'text-[#b066ff]' },
      { label: 'DEF', full: 'Defending', value: avg('def'), color: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-500' },
      { label: 'PHY', full: 'Physical', value: avg('phy'), color: 'bg-[gold] shadow-[0_0_10px_rgba(255,215,0,0.8)]', bg: 'bg-[gold]/10 border-[gold]/20', text: 'text-[gold]' },
    ];

    return (
      <div className="flex flex-col gap-4 mt-4 h-[400px] overflow-hidden">
        <div className="grid grid-cols-2 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className={`p-4 rounded-xl border flex flex-col gap-2 ${stat.bg} shadow-inner`}>
               <div className="flex justify-between items-center">
                 <div className="flex flex-col">
                   <span className={`font-black tracking-[0.2em] text-lg leading-none ${stat.text} drop-shadow-[0_0_5px_currentColor]`}>{stat.label}</span>
                   <span className="text-[10px] text-white/50 uppercase tracking-widest leading-tight mt-1">{stat.full}</span>
                 </div>
                 <span className="text-3xl font-black text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]">{stat.value}</span>
               </div>
               
               <div className="w-full bg-brandbg border border-white/5 h-2 rounded-full overflow-hidden relative mt-1 shadow-[inset_0_0_5px_rgba(0,0,0,0.8)]">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${stat.value}%` }}
                   transition={{ duration: 1.5, ease: 'easeOut' }}
                   className={`h-full rounded-full ${stat.color} absolute left-0 top-0`}
                 />
               </div>
            </div>
          ))}
        </div>
        <div className="bg-brandbg border border-white/10 rounded-xl p-4 flex flex-col justify-center items-center h-full shadow-inner relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
           <div className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-2 font-bold relative z-10">Squad Size</div>
           <div className="text-2xl font-black text-white mb-3 relative z-10"><span className="text-brand1 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">{team.length}</span> <span className="text-gray-600">/ 23</span></div>
           <div className="w-full bg-black border border-white/10 h-3 rounded-full overflow-hidden relative max-w-[200px] z-10 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
              <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(team.length / 23) * 100}%` }}
                 transition={{ duration: 1 }}
                 className="h-full rounded-full bg-gradient-to-r from-brand1 to-brand2 absolute left-0 top-0 shadow-[0_0_15px_rgba(112,0,255,0.8)]"
              />
           </div>
        </div>
      </div>
    );
}
