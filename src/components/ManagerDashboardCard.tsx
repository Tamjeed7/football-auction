import React, { useState } from 'react';
import { Bidder } from '../types';
import { LineupPitch } from './LineupPitch';
import { AnalyticsPanel } from './AnalyticsPanel';
import { getDefaultFormationForManager, getDefaultTacticForManager } from '../utils/tactics';
import { X } from 'lucide-react';
import { formatMoney } from '../utils/format';

interface ManagerDashboardCardProps {
  manager: Bidder;
  managerFormations: Record<string, string>;
  setManagerFormations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  managerTactics: Record<string, string>;
  setManagerTactics: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onProposeTrade: (id: string) => void;
}

export const ManagerDashboardCard: React.FC<ManagerDashboardCardProps> = ({
  manager,
  managerFormations,
  setManagerFormations,
  managerTactics,
  setManagerTactics,
  onProposeTrade
}) => {
  const [selectedManagerView, setSelectedManagerView] = useState<'LINEUP' | 'ANALYTICS'>('LINEUP');
  const [showRosterPopup, setShowRosterPopup] = useState(false);
  
  const totalOvr = manager.team.reduce((acc, p) => acc + p.overall, 0);
  const avgOvr = manager.team.length > 0 ? (totalOvr / manager.team.length).toFixed(1) : '0';

  return (
    <div className="snap-start min-w-[340px] md:min-w-[400px] lg:min-w-[450px] glass-panel border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col relative bg-black/40 hover:bg-black/50 transition-colors">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="overflow-hidden">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight truncate pr-2" title={manager.name}>{manager.name}</h2>
            <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Avg OVR: <span className="text-cyan-400 font-bold">{avgOvr}</span></div>
            <div className={`text-[10px] uppercase tracking-[0.2em] mt-1 font-bold ${manager.team.length >= 23 ? 'text-emerald-400' : 'text-gray-500'}`}>
              {manager.team.length}/23 Signed
            </div>
            <div className="font-mono text-xs font-black text-emerald-400 mt-1">Budget: ${(manager.budget / 1000000).toFixed(1)}M</div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
             <button
                onClick={() => setShowRosterPopup(true)}
                className="bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-md transition-colors whitespace-nowrap shadow-lg border border-emerald-500/50"
             >
                Purchases
             </button>
            {!manager.isUser && (
              <button
                onClick={() => onProposeTrade(manager.id)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-md transition-colors whitespace-nowrap shadow-lg"
              >
                Trade
              </button>
            )}
          </div>
        </div>
        
        {selectedManagerView === 'LINEUP' && (
          <div className="flex gap-2 flex-wrap">
            <select 
              className="bg-black/50 border border-white/20 text-[10px] md:text-xs text-white rounded-lg px-2 py-1.5 outline-none font-bold placeholder-gray-500 uppercase cursor-pointer"
              value={managerTactics[manager.id] || getDefaultTacticForManager(manager.name)}
              onChange={(e) => {
                 setManagerTactics(prev => ({ ...prev, [manager.id]: e.target.value }));
              }}
            >
              <option value="Balanced">Balanced</option>
              <option value="Gegenpressing">Gegenpress</option>
              <option value="Tiki-Taka">Tiki-Taka</option>
              <option value="Park the Bus">Park Bus</option>
              <option value="Counter Attack">Counter Attack</option>
              <option value="Direct Passing">Direct Pass</option>
              <option value="High Press">High Press</option>
              <option value="Possession">Possession</option>
              <option value="Adaptive">Adaptive (Auto)</option>
            </select>
            <select 
              className="bg-black/50 border border-white/20 text-[10px] md:text-xs text-white rounded-lg px-2 py-1.5 outline-none font-bold placeholder-gray-500 uppercase cursor-pointer"
              value={managerFormations[manager.id] || getDefaultFormationForManager(manager.name)}
              onChange={(e) => {
                 setManagerFormations(prev => ({ ...prev, [manager.id]: e.target.value }));
              }}
            >
              <option value="4-3-3">4-3-3</option>
              <option value="4-3-3 Attack">4-3-3 Attack</option>
              <option value="4-3-3 Defend">4-3-3 Defend</option>
              <option value="4-3-3 False 9">4-3-3 False 9</option>
              <option value="4-3-3 Holding">4-3-3 Holding</option>
              <option value="4-4-2">4-4-2</option>
              <option value="4-4-2 Holding">4-4-2 Holding</option>
              <option value="3-5-2">3-5-2</option>
              <option value="5-3-2">5-3-2</option>
              <option value="4-2-3-1">4-2-3-1</option>
              <option value="4-1-2-1-2">4-1-2-1-2</option>
              <option value="4-3-2-1">4-3-2-1</option>
              <option value="4-1-4-1">4-1-4-1</option>
              <option value="4-2-4">4-2-4</option>
              <option value="3-4-3">3-4-3</option>
              <option value="3-4-2-1">3-4-2-1</option>
              <option value="5-4-1">5-4-1</option>
              <option value="5-2-3">5-2-3</option>
              <option value="4-3-1-2">4-3-1-2</option>
              <option value="3-1-4-2">3-1-4-2</option>
            </select>
          </div>
        )}
      </div>
      
      <div className="flex bg-white/5 p-1 rounded-lg mb-4 shrink-0">
         <button
            onClick={() => setSelectedManagerView('LINEUP')}
            className={`flex-1 text-[10px] md:text-xs font-bold uppercase tracking-widest py-2 rounded-md transition-all ${selectedManagerView === 'LINEUP' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
         >
            Lineup
         </button>
         <button
            onClick={() => setSelectedManagerView('ANALYTICS')}
            className={`flex-1 text-[10px] md:text-xs font-bold uppercase tracking-widest py-2 rounded-md transition-all ${selectedManagerView === 'ANALYTICS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
         >
            Analytics
         </button>
      </div>

      <div className="flex-1 min-h-[300px] md:min-h-[400px] overflow-hidden flex flex-col relative w-full">
        {selectedManagerView === 'LINEUP' ? (
          <>
            <LineupPitch teamId={manager.id} team={manager.team} isWinner={false} formation={managerFormations[manager.id] || getDefaultFormationForManager(manager.name)} />
            {manager.team.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center font-bold text-gray-500 italic px-4 bg-black/60 rounded-xl py-2 backdrop-blur-sm">
                  No players signed yet.
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="overflow-y-auto pr-2 pb-4 h-full w-full absolute inset-0">
             <AnalyticsPanel team={manager.team} />
          </div>
        )}
      </div>
      
      {showRosterPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-brandbg border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
            <button 
               onClick={() => setShowRosterPopup(false)}
               className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black uppercase tracking-widest text-brand1 mb-4">{manager.name} Purchases</h3>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-brandbg/95 backdrop-blur-md z-10 border-b border-white/10">
                  <tr>
                    <th className="py-3 px-2 font-black uppercase tracking-widest text-gray-400">Player</th>
                    <th className="py-3 px-2 font-black uppercase tracking-widest text-gray-400 text-center">Pos</th>
                    <th className="py-3 px-2 font-black uppercase tracking-widest text-gray-400 text-center">OVR</th>
                    <th className="py-3 px-2 font-black uppercase tracking-widest text-gray-400 text-right">Price Bought</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {manager.team.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 font-bold uppercase tracking-widest">
                        No players purchased yet.
                      </td>
                    </tr>
                  ) : (
                    manager.team.map((player) => (
                      <tr key={player.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-bold text-white">{player.name}</div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest">{player.club}</div>
                        </td>
                        <td className="py-3 px-2 text-center text-gray-300 font-mono font-bold">
                          {player.position}
                        </td>
                        <td className="py-3 px-2 text-center text-brand1 font-black">
                          {player.overall}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-mono font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                            {manager.purchasePrices?.[player.id] ? formatMoney(manager.purchasePrices[player.id]) : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
