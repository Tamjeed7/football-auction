import React, { useState } from 'react';
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

    return Math.min(100, 50 + chem);
  };

  const applyTacticalBonus = (tactic: string, formation: string, basePower: number, baseChem: number) => {
    let powerBonus = 0;
    let chemBonus = 0;
    if (tactic === 'Gegenpressing') { powerBonus = 2; chemBonus = 5; }
    else if (tactic === 'Tiki-Taka') { chemBonus = 10; powerBonus = 1; }
    else if (tactic === 'Park the Bus') { powerBonus = 3; }
    else if (tactic === 'Counter Attack') { powerBonus = 2; }
    else if (tactic === 'Direct Passing') { powerBonus = 1; chemBonus = 2; }
    else if (tactic === 'High Press') { powerBonus = 3; chemBonus = -2; }
    else if (tactic === 'Possession') { chemBonus = 8; }

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

    if (tactic === 'Adaptive' || (manager && !manager.isUser)) {
      const myOvr = start11.length > 0 ? start11.reduce((acc, p) => acc + p.overall, 0) / start11.length : 0;
      const oppOvr = opponentStart11.length > 0 ? opponentStart11.reduce((acc, p) => acc + p.overall, 0) / opponentStart11.length : 0;
      const { adaptedTactic, adaptedFormation } = adaptTacticAndFormation(mName, myOvr, oName, oppOvr, tactic, formation);
      tactic = adaptedTactic;
      formation = adaptedFormation;
    }

    const rawOvr = start11.length > 0 ? start11.reduce((acc, p) => acc + p.overall, 0) / start11.length : 0;
    let rawChem = calculateChemistry(start11);

    const { penalty: rivalryPenalty, conflicts } = calculateInternalRivalries(start11);
    rawChem -= rivalryPenalty;

    const { bonusA: derbyBonus, derbies } = calculateDerbyBonus(start11, opponentStart11);

    const { powerBonus, chemBonus } = applyTacticalBonus(tactic, formation, rawOvr, rawChem);

    const avgOvr = rawOvr + powerBonus;
    const chemistry = Math.max(0, Math.min(100, rawChem + chemBonus));

    let power = avgOvr * 0.7 + chemistry * 0.3;
    power += derbyBonus;

    return { avgOvr, chemistry, power, start11, tactic, formation, internalRivalries: conflicts, derbies };
  };

  const runSimulation = () => {
    setIsSimulating(true);
    setResult(null);

    const statsA = getTeamStats(managerA, managerB);
    const statsB = getTeamStats(managerB, managerA);

    let powerA = statsA.power;
    let powerB = statsB.power;

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

    setTimeout(() => {
      let scoreA = 0;
      let scoreB = 0;
      const events: string[] = [];

      const chances = (tacticA === 'Park the Bus' || tacticB === 'Park the Bus') ? 4 : (Math.random() > 0.5 ? 5 : 6);

      for (let i = 0; i < chances; i++) {
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
    }, 1500);
  };

  const nameA = bidders.find(b => b.id === managerA)?.name;
  const nameB = bidders.find(b => b.id === managerB)?.name;
  const statsA = getTeamStats(managerA, managerB);
  const statsB = getTeamStats(managerB, managerA);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="ledger-card p-6 md:p-8 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-md text-ink-faint hover:text-ink hover:bg-[rgba(0,0,0,0.05)] transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold text-ink text-center mb-6">Match Simulation</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
          {/* Manager A */}
          <div className="flex flex-col gap-2">
            <select
              value={managerA}
              onChange={(e) => setManagerA(e.target.value)}
              className="field-select text-sm"
            >
              {bidders.filter(b => b.id !== managerB).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="ledger-card p-4 text-center flex flex-col items-center">
              <div className="ledger-tag mb-1">Tactic</div>
              <div className="text-sm font-semibold text-ink mb-3">{statsA.tactic} <span className="text-ink-faint mx-1">·</span> <span className="text-gold-strong">{statsA.formation}</span></div>
              <div className="ledger-tag mb-1">Starting XI OVR</div>
              <div className="text-3xl font-bold font-mono text-ink">{statsA.avgOvr.toFixed(1)}</div>
              <div className="ledger-tag mt-2 mb-1">Chemistry</div>
              <div className="text-xl font-bold font-mono text-green-strong flex items-center justify-center gap-2">
                {statsA.chemistry}
                {statsA.internalRivalries.length > 0 && (
                  <span className="chip" style={{ background: 'transparent', border: '1px solid var(--color-red)', color: 'var(--color-red)' }} title={`Conflicts: ${statsA.internalRivalries.join(', ')}`}>
                    Rivalry
                  </span>
                )}
                {statsA.derbies.length > 0 && (
                  <span className="chip" style={{ background: 'transparent', border: '1px solid var(--color-gold)', color: 'var(--color-gold-strong)' }} title={`Derbies: ${statsA.derbies.join(', ')}`}>
                    Derby
                  </span>
                )}
              </div>
              {result && <div className="text-base font-bold text-ink mt-2">Win prob {result.probA}%</div>}
            </div>
          </div>

          <div className="text-center font-display font-bold text-3xl text-ink-faint">VS</div>

          {/* Manager B */}
          <div className="flex flex-col gap-2">
            <select
              value={managerB}
              onChange={(e) => setManagerB(e.target.value)}
              className="field-select text-sm"
            >
              {bidders.filter(b => b.id !== managerA).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="ledger-card p-4 text-center flex flex-col items-center">
              <div className="ledger-tag mb-1">Tactic</div>
              <div className="text-sm font-semibold text-ink mb-3">{statsB.tactic} <span className="text-ink-faint mx-1">·</span> <span className="text-gold-strong">{statsB.formation}</span></div>
              <div className="ledger-tag mb-1">Starting XI OVR</div>
              <div className="text-3xl font-bold font-mono text-ink">{statsB.avgOvr.toFixed(1)}</div>
              <div className="ledger-tag mt-2 mb-1">Chemistry</div>
              <div className="text-xl font-bold font-mono text-green-strong flex items-center justify-center gap-2">
                {statsB.chemistry}
                {statsB.internalRivalries.length > 0 && (
                  <span className="chip" style={{ background: 'transparent', border: '1px solid var(--color-red)', color: 'var(--color-red)' }} title={`Conflicts: ${statsB.internalRivalries.join(', ')}`}>
                    Rivalry
                  </span>
                )}
                {statsB.derbies.length > 0 && (
                  <span className="chip" style={{ background: 'transparent', border: '1px solid var(--color-gold)', color: 'var(--color-gold-strong)' }} title={`Derbies: ${statsB.derbies.join(', ')}`}>
                    Derby
                  </span>
                )}
              </div>
              {result && <div className="text-base font-bold text-ink mt-2">Win prob {result.probB}%</div>}
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="btn btn-primary"
            style={{ padding: '14px 32px', fontSize: 14 }}
          >
            {isSimulating ? 'Simulating…' : 'Run match simulation'}
          </button>
        </div>

        <AnimatePresence>
          {result && !isSimulating && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="ledger-card p-6 flex flex-col items-center"
            >
              <div className="ledger-tag mb-4">Full time result</div>
              <div className="flex items-center gap-6 mb-6">
                <div className="text-lg font-semibold uppercase w-32 text-right truncate text-ink-muted">{nameA}</div>
                <div className="text-5xl font-bold font-mono tabular-nums text-ink">
                  <span className={result.scoreA > result.scoreB ? '' : 'text-ink-faint'}>{result.scoreA}</span>
                  <span className="text-ink-faint mx-2">–</span>
                  <span className={result.scoreB > result.scoreA ? '' : 'text-ink-faint'}>{result.scoreB}</span>
                </div>
                <div className="text-lg font-semibold uppercase w-32 text-left truncate text-ink-muted">{nameB}</div>
              </div>

              <div className="w-full rounded-md p-4" style={{ background: 'rgba(0,0,0,0.03)' }}>
                <div className="text-xs text-ink-muted font-semibold uppercase tracking-wide mb-3 border-b border-rule pb-2">Match events</div>
                {result.events.length === 0 ? (
                  <div className="text-sm text-ink-faint italic">No goals scored. A tight defensive battle.</div>
                ) : (
                  <ul className="space-y-2">
                    {result.events.map((ev, i) => (
                      <li key={i} className="text-sm font-medium text-ink flex items-center gap-2">
                        <span className="text-green-strong">⚽</span>
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
