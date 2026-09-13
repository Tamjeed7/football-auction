import React, { useState } from 'react';
import { Bidder, Player } from '../types';
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
  onViewPlayer?: (player: Player, owner: Bidder) => void;
}

export const ManagerDashboardCard: React.FC<ManagerDashboardCardProps> = ({
  manager,
  managerFormations,
  setManagerFormations,
  managerTactics,
  setManagerTactics,
  onProposeTrade,
  onViewPlayer
}) => {
  const [selectedManagerView, setSelectedManagerView] = useState<'LINEUP' | 'ANALYTICS'>('LINEUP');
  const [showRosterPopup, setShowRosterPopup] = useState(false);

  const totalOvr = manager.team.reduce((acc, p) => acc + p.overall, 0);
  const avgOvr = manager.team.length > 0 ? (totalOvr / manager.team.length).toFixed(1) : '0';

  return (
    <div className="snap-start min-w-[340px] md:min-w-[400px] lg:min-w-[450px] ledger-card p-5 flex flex-col relative">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="overflow-hidden">
            <h2 className="text-lg md:text-xl font-semibold text-ink truncate pr-2" title={manager.name}>{manager.name}</h2>
            <div className="text-xs text-ink-muted mt-1">Avg OVR <span className="font-mono font-bold text-ink">{avgOvr}</span></div>
            <div className={`text-[10.5px] uppercase tracking-wide mt-1 font-bold ${manager.team.length >= 23 ? 'text-green-strong' : 'text-ink-faint'}`}>
              {manager.team.length}/23 signed
            </div>
            <div className="font-mono text-xs font-bold text-green-strong mt-1">{formatMoney(manager.budget)}</div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={() => setShowRosterPopup(true)}
              className="btn btn-secondary"
              style={{ padding: '7px 12px', fontSize: 11 }}
            >
              Purchases
            </button>
            {!manager.isUser && (
              <button
                onClick={() => onProposeTrade(manager.id)}
                className="btn btn-primary"
                style={{ padding: '7px 12px', fontSize: 11 }}
              >
                Trade
              </button>
            )}
          </div>
        </div>

        {selectedManagerView === 'LINEUP' && (
          <div className="flex gap-2 flex-wrap">
            <select
              className="field-select text-xs"
              style={{ padding: '6px 10px' }}
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
              className="field-select text-xs"
              style={{ padding: '6px 10px' }}
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

      <div className="segmented mb-4 shrink-0">
        <button
          onClick={() => setSelectedManagerView('LINEUP')}
          className={selectedManagerView === 'LINEUP' ? 'active' : ''}
        >
          Lineup
        </button>
        <button
          onClick={() => setSelectedManagerView('ANALYTICS')}
          className={selectedManagerView === 'ANALYTICS' ? 'active' : ''}
        >
          Analytics
        </button>
      </div>

      <div className="flex-1 min-h-[300px] md:min-h-[400px] overflow-hidden flex flex-col relative w-full">
        {selectedManagerView === 'LINEUP' ? (
          <>
            <LineupPitch teamId={manager.id} team={manager.team} isWinner={false} formation={managerFormations[manager.id] || getDefaultFormationForManager(manager.name)} onViewPlayer={onViewPlayer ? (p) => onViewPlayer(p, manager) : undefined} />
            {manager.team.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center font-semibold text-ink-faint italic px-4 rounded-md py-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm">
          <div className="ledger-card p-6 w-full max-w-2xl max-h-[80vh] flex flex-col relative">
            <button
              onClick={() => setShowRosterPopup(false)}
              className="absolute top-4 right-4 text-ink-faint hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-semibold text-ink mb-4">{manager.name} — Purchases</h3>

            <div className="flex-1 overflow-y-auto pr-2">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-surface z-10 border-b border-rule">
                  <tr>
                    <th className="py-3 px-2 ledger-tag">Player</th>
                    <th className="py-3 px-2 ledger-tag text-center">Pos</th>
                    <th className="py-3 px-2 ledger-tag text-center">OVR</th>
                    <th className="py-3 px-2 ledger-tag text-right">Price bought</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {manager.team.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-ink-faint font-semibold uppercase tracking-wide">
                        No players purchased yet.
                      </td>
                    </tr>
                  ) : (
                    manager.team.map((player) => (
                      <tr
                        key={player.id}
                        className="hover:bg-[rgba(0,0,0,0.02)] transition-colors cursor-pointer"
                        onClick={() => onViewPlayer?.(player, manager)}
                      >
                        <td className="py-3 px-2">
                          <div className="font-semibold text-ink">{player.name}</div>
                          <div className="text-[10px] text-ink-faint uppercase tracking-wide">{player.club}</div>
                        </td>
                        <td className="py-3 px-2 text-center text-ink-muted font-mono font-bold">
                          {player.position}
                        </td>
                        <td className="py-3 px-2 text-center text-gold-strong font-bold font-mono">
                          {player.overall}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-mono font-bold text-green-strong">
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
