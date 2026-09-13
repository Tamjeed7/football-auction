import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bidder } from '../types';
import { simulateRoundRobin, TournamentResult, MatchReport, defaultTournamentConfig } from '../lib/tournamentEngine';

interface TournamentPanelProps {
  bidders: Bidder[];
  managerFormations: Record<string, string>;
  managerTactics: Record<string, string>;
  onClose: () => void;
}

function eventIcon(type: MatchReport['events'][number]['type']): string {
  switch (type) {
    case 'GOAL': return '⚽';
    case 'SUB': return '🔁';
    case 'CARD': return '🟨';
    case 'INJURY': return '🩹';
    case 'HALFTIME': return '⏸';
    case 'FULLTIME': return '🏁';
  }
}

interface MatchTimelineCardProps {
  match: MatchReport;
}

const MatchTimelineCard: React.FC<MatchTimelineCardProps> = ({ match }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="ledger-card p-0 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[rgba(0,0,0,0.03)] transition-colors"
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="text-sm font-semibold text-ink truncate">{match.managerAName}</span>
          <span className="font-mono font-bold text-lg text-ink tabular-nums shrink-0">{match.scoreA} – {match.scoreB}</span>
          <span className="text-sm font-semibold text-ink truncate">{match.managerBName}</span>
        </div>
        <span className="text-ink-faint text-xs shrink-0">{open ? 'Hide timeline ▲' : 'Show timeline ▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-rule">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted mb-3">
                <span>{match.managerAName}: {match.statsA.tactic} · {match.statsA.formation} · OVR {match.statsA.avgOvr.toFixed(1)} · Chem {match.statsA.chemistry}</span>
                <span>{match.managerBName}: {match.statsB.tactic} · {match.statsB.formation} · OVR {match.statsB.avgOvr.toFixed(1)} · Chem {match.statsB.chemistry}</span>
              </div>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {match.events.map((ev, i) => (
                  <li key={i} className="text-sm text-ink flex items-center gap-2">
                    <span className="font-mono text-ink-faint w-9 shrink-0 text-right">{ev.minute}'</span>
                    <span className="shrink-0">{eventIcon(ev.type)}</span>
                    <span className={ev.type === 'GOAL' ? 'font-semibold' : ev.type === 'HALFTIME' || ev.type === 'FULLTIME' ? 'text-ink-muted italic' : ''}>{ev.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function TournamentPanel({ bidders, managerFormations, managerTactics, onClose }: TournamentPanelProps) {
  const [seedInput, setSeedInput] = useState<string>('42');
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(false);
  const [maxSubs, setMaxSubs] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TournamentResult | null>(null);

  const runTournament = () => {
    setIsRunning(true);
    setTimeout(() => {
      const seedNum = Number(seedInput);
      const config = defaultTournamentConfig({
        doubleRoundRobin,
        maxSubs,
        seed: Number.isFinite(seedNum) && seedInput.trim() !== '' ? seedNum : undefined,
      });
      const res = simulateRoundRobin(bidders, managerFormations, managerTactics, config);
      setResult(res);
      setIsRunning(false);
    }, 300);
  };

  const exportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament-seed-${result.seed}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const champion = result?.table[0];
  const championBidder = champion ? bidders.find(b => b.id === champion.managerId) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="ledger-card p-6 md:p-8 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-md text-ink-faint hover:text-ink hover:bg-[rgba(0,0,0,0.05)] transition-colors"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold text-ink text-center mb-1">Tournament</h2>
        <p className="text-sm text-ink-muted text-center mb-6">Round-robin — every manager faces every other manager once{doubleRoundRobin ? ', home and away' : ''}.</p>

        {!result && (
          <div className="flex flex-col items-center gap-4 mb-2">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Seed (reproducibility)
                <input
                  type="text"
                  value={seedInput}
                  onChange={e => setSeedInput(e.target.value)}
                  className="field-input text-sm w-32"
                  placeholder="random"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Max subs per side
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={maxSubs}
                  onChange={e => setMaxSubs(Math.max(0, Math.min(11, Number(e.target.value) || 0)))}
                  className="field-input text-sm w-32"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Format
                <select
                  value={doubleRoundRobin ? 'double' : 'single'}
                  onChange={e => setDoubleRoundRobin(e.target.value === 'double')}
                  className="field-select text-sm"
                >
                  <option value="single">Single round-robin</option>
                  <option value="double">Double round-robin</option>
                </select>
              </label>
            </div>
            <button onClick={runTournament} disabled={isRunning} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 14 }}>
              {isRunning ? 'Simulating…' : `Run tournament (${bidders.length} managers, ${doubleRoundRobin ? bidders.length * (bidders.length - 1) : (bidders.length * (bidders.length - 1)) / 2} matches)`}
            </button>
            <p className="text-xs text-ink-faint text-center max-w-lg mt-2">
              Model notes: goal timing is a per-minute independent trial calibrated around ~2.6 combined goals for evenly matched sides, scaled by each side's share of computed squad power (starting XI overall × 0.7 + chemistry × 0.3, plus tactic/formation and derby/rivalry adjustments — identical formula to the 1v1 match simulation). Cards and injuries are logged flavor events only and do not affect the score or lineup. This is a transparent approximation, not a claim of real-world predictive accuracy.
            </p>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-ink-faint font-mono">Seed: {result.seed}</span>
              <div className="flex gap-2">
                <button onClick={exportJson} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }}>Export JSON</button>
                <button onClick={() => setResult(null)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }}>New tournament</button>
              </div>
            </div>

            {championBidder && (
              <div className="ledger-card p-5 text-center" style={{ borderColor: 'var(--color-gold)' }}>
                <div className="ledger-tag mb-2">Champion</div>
                <div className="text-2xl font-bold text-ink mb-1">{championBidder.name}</div>
                <div className="text-sm text-ink-muted">
                  {champion!.won}W {champion!.drawn}D {champion!.lost}L · {champion!.goalsFor}-{champion!.goalsAgainst} GD {champion!.goalDiff >= 0 ? '+' : ''}{champion!.goalDiff} · {champion!.points} pts
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-ink-faint border-b border-rule">
                    <th className="text-left py-2 pr-2">#</th>
                    <th className="text-left py-2 pr-2">Manager</th>
                    <th className="text-center py-2 px-1">P</th>
                    <th className="text-center py-2 px-1">W</th>
                    <th className="text-center py-2 px-1">D</th>
                    <th className="text-center py-2 px-1">L</th>
                    <th className="text-center py-2 px-1">GF</th>
                    <th className="text-center py-2 px-1">GA</th>
                    <th className="text-center py-2 px-1">GD</th>
                    <th className="text-center py-2 pl-1 font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {result.table.map((row, i) => (
                    <tr key={row.managerId} className={`border-b border-rule ${i === 0 ? 'bg-[rgba(212,175,55,0.08)]' : ''}`}>
                      <td className="py-2 pr-2 text-ink-faint font-mono">{i + 1}</td>
                      <td className="py-2 pr-2 font-semibold text-ink">{row.managerName}</td>
                      <td className="text-center py-2 px-1 font-mono">{row.played}</td>
                      <td className="text-center py-2 px-1 font-mono">{row.won}</td>
                      <td className="text-center py-2 px-1 font-mono">{row.drawn}</td>
                      <td className="text-center py-2 px-1 font-mono">{row.lost}</td>
                      <td className="text-center py-2 px-1 font-mono">{row.goalsFor}</td>
                      <td className="text-center py-2 px-1 font-mono">{row.goalsAgainst}</td>
                      <td className="text-center py-2 px-1 font-mono">{row.goalDiff >= 0 ? '+' : ''}{row.goalDiff}</td>
                      <td className="text-center py-2 pl-1 font-mono font-bold text-ink">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="ledger-tag mb-3">Match reports</div>
              <div className="flex flex-col gap-2">
                {result.fixtures.map((m, i) => <MatchTimelineCard key={i} match={m} />)}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
