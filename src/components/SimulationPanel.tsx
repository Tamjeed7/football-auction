import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, Bidder } from '../types';
import { getDefaultFormationForManager, getDefaultTacticForManager, adaptTacticAndFormation } from '../utils/tactics';
import { calculateInternalRivalries, calculateDerbyBonus } from '../utils/rivalry';

interface SimulationPanelProps {
  bidders: Bidder[];
  managerFormations: Record<string, string>;
  managerTactics: Record<string, string>;
  onClose: () => void;
}

export function SimulationPanel({ bidders, managerFormations, managerTactics, onClose }: SimulationPanelProps) {
  const [managerA, setManagerA] = useState<string>(bidders[0]?.id);
  const [managerB, setManagerB] = useState<string>(bidders[1]?.id);

  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<{
    scoreA: number;
    scoreB: number;
    events: string[];
    probA: number;
    probB: number;
  } | null>(null);

  const getStarting11 = (managerId: string) => {
    const manager = bidders.find(b => b.id === managerId);
    if (!manager) return [];
    
    // We try to pull from localStorage placements, if exists
    let placed11: Player[] = [];
    try {
      const saved = localStorage.getItem(`lineup-placements-${managerId}`);
      if (saved) {
        const placements = JSON.parse(saved);
        const startingIds = Object.keys(placements)
          .filter(k => !k.startsWith('sub-'))
          .map(k => placements[k]);
        placed11 = manager.team.filter(p => startingIds.includes(p.id));
      }
    } catch {}

    if (placed11.length === 11) {
      return placed11;
    }
    
    // Fallback: highest 11 overall
    return [...manager.team].sort((a, b) => b.overall - a.overall).slice(0, 11);
  };

  const calculateChemistry = (team11: Player[]) => {
    let chem = 0;
    const countries = new Map<string, number>();
    const clubs = new Map<string, number>();
    
    team11.forEach(p => {
      countries.set(p.country, (countries.get(p.country) || 0) + 1);
      clubs.set(p.club, (clubs.get(p.club) || 0) + 1);
    });

    countries.forEach(count => { if (count > 1) chem += count * 2; });
    clubs.forEach(count => { if (count > 1) chem += count * 3; });
    
    return Math.min(100, 50 + chem); // Base chemistry 50
  };

  const applyTacticalBonus = (tactic: string, formation: string, basePower: number, baseChem: number) => {
    // Modify team power based on tactic
    let powerBonus = 0;
    let chemBonus = 0;
    if (tactic === 'Gegenpressing') { powerBonus = 2; chemBonus = 5; }
    else if (tactic === 'Tiki-Taka') { chemBonus = 10; powerBonus = 1; }
    else if (tactic === 'Park the Bus') { powerBonus = 3; }
    else if (tactic === 'Counter Attack') { powerBonus = 2; }
    else if (tactic === 'Direct Passing') { powerBonus = 1; chemBonus = 2; }
    else if (tactic === 'High Press') { powerBonus = 3; chemBonus = -2; }
    else if (tactic === 'Possession') { chemBonus = 8; }
    
    // Modify based on formation style variants
    if (formation.includes('Attack')) { powerBonus += 4; chemBonus -= 3; }
    else if (formation.includes('Defend')) { powerBonus += 3; chemBonus += 2; }
    else if (formation.includes('False 9')) { chemBonus += 6; powerBonus += 1; }
    else if (formation.includes('Holding')) { chemBonus += 4; powerBonus += 2; }
    
    return { powerBonus, chemBonus };
  };

  const getTeamStats = (managerId: string, opponentId?: string) => {
    const manager = bidders.find(b => b.id === managerId);
    const opponent = opponentId ? bidders.find(b => b.id === opponentId) : null;
    const mName = manager?.name || 'Manager';
    const oName = opponent?.name || 'Opponent';
    
    const start11 = getStarting11(managerId);
    const opponentStart11 = opponentId ? getStarting11(opponentId) : [];
    
    let tactic = managerTactics[managerId] || getDefaultTacticForManager(mName);
    let formation = managerFormations[managerId] || getDefaultFormationForManager(mName);
    
    // Adaptive logic: managers will adjust their setup depending on the opponent's strength
    if (tactic === 'Adaptive' || (manager && !manager.isUser)) {
       const myOvr = start11.length > 0 ? start11.reduce((acc, p) => acc + p.overall, 0) / start11.length : 0;
       const oppOvr = opponentStart11.length > 0 ? opponentStart11.reduce((acc, p) => acc + p.overall, 0) / opponentStart11.length : 0;
       const { adaptedTactic, adaptedFormation } = adaptTacticAndFormation(mName, myOvr, oName, oppOvr, tactic, formation);
       tactic = adaptedTactic;
       formation = adaptedFormation;
    }

    const rawOvr = start11.length > 0 ? start11.reduce((acc, p) => acc + p.overall, 0) / start11.length : 0;
    let rawChem = calculateChemistry(start11);
    
    // Squad internal rivalry penalty
    const { penalty: rivalryPenalty, conflicts } = calculateInternalRivalries(start11);
    rawChem -= rivalryPenalty;
    
    // Derby bonus if playing against rival team
    const { bonusA: derbyBonus, derbies } = calculateDerbyBonus(start11, opponentStart11);
    
    const { powerBonus, chemBonus } = applyTacticalBonus(tactic, formation, rawOvr, rawChem);
    
    const avgOvr = rawOvr + powerBonus;
    const chemistry = Math.max(0, Math.min(100, rawChem + chemBonus));
    
    let power = avgOvr * 0.7 + chemistry * 0.3; // weighted rating
    power += derbyBonus; // Apply derby frenzy bonus directly to power
    
    return { avgOvr, chemistry, power, start11, tactic, formation, internalRivalries: conflicts, derbies };
  };

  const runSimulation = () => {
    setIsSimulating(true);
    setResult(null);

    const statsA = getTeamStats(managerA, managerB);
    const statsB = getTeamStats(managerB, managerA);

    // Further tactic matchup checks
    let powerA = statsA.power;
    let powerB = statsB.power;
    
    // Rock-paper-scissors logic for tactics
    const tacticA = statsA.tactic;
    const tacticB = statsB.tactic;
    
    if (tacticA === 'Gegenpressing' && tacticB === 'Possession') powerA += 5;
    if (tacticA === 'Possession' && tacticB === 'Park the Bus') powerA += 5;
    if (tacticA === 'Counter Attack' && tacticB === 'High Press') powerA += 5;
    
    if (tacticB === 'Gegenpressing' && tacticA === 'Possession') powerB += 5;
    if (tacticB === 'Possession' && tacticA === 'Park the Bus') powerB += 5;
    if (tacticB === 'Counter Attack' && tacticA === 'High Press') powerB += 5;

    const totalPower = powerA + powerB;
    const probA = totalPower > 0 ? (powerA / totalPower) : 0.5;
    const probB = 1 - probA;

    // Simulate match
    setTimeout(() => {
      let scoreA = 0;
      let scoreB = 0;
      const events: string[] = [];

      // Park the Bus reduces goals overall
      const chances = (tacticA === 'Park the Bus' || tacticB === 'Park the Bus') ? 4 : (Math.random() > 0.5 ? 5 : 6);

      for (let i = 0; i < chances; i++) { // scoring chances
        const rand = Math.random();
        if (rand < probA * 0.7) {
          scoreA++;
          const scorer = statsA.start11[Math.floor(Math.random() * statsA.start11.length)]?.name || 'Player';
          events.push(`${scorer} scores for ${bidders.find(b => b.id === managerA)?.name} (${tacticA} buildup)!`);
        } else if (rand > 1 - (probB * 0.7)) {
          scoreB++;
          const scorer = statsB.start11[Math.floor(Math.random() * statsB.start11.length)]?.name || 'Player';
          events.push(`${scorer} scores for ${bidders.find(b => b.id === managerB)?.name} (${tacticB} play)!`);
        }
      }

      setResult({ scoreA, scoreB, events, probA: Math.round(probA * 100), probB: Math.round(probB * 100) });
      setIsSimulating(false);
    }, 2000);
  };

  const nameA = bidders.find(b => b.id === managerA)?.name;
  const nameB = bidders.find(b => b.id === managerB)?.name;
  const statsA = getTeamStats(managerA, managerB);
  const statsB = getTeamStats(managerB, managerA);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-panel border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative neon-border max-h-[90vh] overflow-y-auto"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        <h2 className="text-3xl font-black uppercase tracking-tight text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-brand1 to-brand3">Match Simulation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
          {/* Manager A */}
          <div className="flex flex-col gap-2">
            <select 
              value={managerA}
              onChange={(e) => setManagerA(e.target.value)}
              className="bg-black/50 border border-white/20 text-sm p-3 rounded-xl uppercase font-bold text-white shadow-lg outline-none cursor-pointer"
            >
              {bidders.filter(b => b.id !== managerB).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
             <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center flex flex-col items-center">
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Tactic</div>
               <div className="text-sm font-black text-white mb-3 uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full border border-white/10">{statsA.tactic} <span className="text-gray-500 mx-1">|</span> <span className="text-brand1">{statsA.formation}</span></div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Starting 11 OVR</div>
               <div className="text-3xl font-black text-brand1">{statsA.avgOvr.toFixed(1)}</div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 mb-1">Chemistry</div>
               <div className="text-xl font-black text-emerald-400 flex items-center justify-center gap-2">
                  {statsA.chemistry}
                  {statsA.internalRivalries.length > 0 && (
                     <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30" title={`Conflicts: ${statsA.internalRivalries.join(', ')}`}>
                        -RIVALRY
                     </span>
                  )}
                  {statsA.derbies.length > 0 && (
                     <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30" title={`Derbies: ${statsA.derbies.join(', ')}`}>
                        +DERBY
                     </span>
                  )}
               </div>
               {result && <div className="text-lg font-black text-cyan-400 mt-2">Win Prob: {result.probA}%</div>}
            </div>
          </div>

          <div className="text-center font-black text-4xl text-gray-600 uppercase tracking-widest">
            VS
          </div>

          {/* Manager B */}
          <div className="flex flex-col gap-2">
            <select 
              value={managerB}
              onChange={(e) => setManagerB(e.target.value)}
              className="bg-black/50 border border-white/20 text-sm p-3 rounded-xl uppercase font-bold text-white shadow-lg outline-none cursor-pointer"
            >
              {bidders.filter(b => b.id !== managerA).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
             <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center flex flex-col items-center">
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Tactic</div>
               <div className="text-sm font-black text-white mb-3 uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full border border-white/10">{statsB.tactic} <span className="text-gray-500 mx-1">|</span> <span className="text-brand3">{statsB.formation}</span></div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Starting 11 OVR</div>
               <div className="text-3xl font-black text-brand3">{statsB.avgOvr.toFixed(1)}</div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 mb-1">Chemistry</div>
               <div className="text-xl font-black text-emerald-400 flex items-center justify-center gap-2">
                  {statsB.chemistry}
                  {statsB.internalRivalries.length > 0 && (
                     <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30" title={`Conflicts: ${statsB.internalRivalries.join(', ')}`}>
                        -RIVALRY
                     </span>
                  )}
                  {statsB.derbies.length > 0 && (
                     <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30" title={`Derbies: ${statsB.derbies.join(', ')}`}>
                        +DERBY
                     </span>
                  )}
               </div>
               {result && <div className="text-lg font-black text-cyan-400 mt-2">Win Prob: {result.probB}%</div>}
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            {isSimulating ? 'Simulating...' : 'Run Match Simulation'}
          </button>
        </div>

        {/* Result Area */}
        <AnimatePresence>
          {result && !isSimulating && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/60 rounded-2xl border border-white/10 p-6 flex flex-col items-center"
            >
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mb-4">Full Time Result</div>
              <div className="flex items-center gap-8 mb-6">
                <div className="text-2xl font-black uppercase w-32 text-right truncate text-brand1">{nameA}</div>
                <div className="text-6xl font-black tracking-tighter shadow-black drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                   <span className={result.scoreA > result.scoreB ? 'text-white' : 'text-gray-500'}>{result.scoreA}</span>
                   <span className="text-gray-600 mx-2">-</span>
                   <span className={result.scoreB > result.scoreA ? 'text-white' : 'text-gray-500'}>{result.scoreB}</span>
                </div>
                <div className="text-2xl font-black uppercase w-32 text-left truncate text-brand3">{nameB}</div>
              </div>

              <div className="w-full bg-white/5 rounded-xl p-4">
                <div className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Match Events</div>
                {result.events.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No goals scored. A tight defensive battle!</div>
                ) : (
                  <ul className="space-y-2">
                    {result.events.map((ev, i) => (
                      <li key={i} className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="text-emerald-400">⚽</span>
                        {ev}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
