import React, { useState } from 'react';
import { Bidder, Player } from '../types';
import { formatMoney } from '../utils/format';
import { X, ArrowRightLeft, DollarSign } from 'lucide-react';

interface TransferMarketProps {
  bidders: Bidder[];
  transactions?: any[];
  initialSelectedBotId?: string | null;
  onClose: () => void;
  onTransfer: (type: 'BUY' | 'SELL' | 'SWAP', manager1Id: string, manager2Id: string, amount: number, m1PlayerId?: string, m2PlayerId?: string, m1Comment?: string) => void;
  onViewPlayer?: (player: Player, owner: Bidder) => void;
}

const POSITION_GROUPS: Record<string, string[]> = {
  GK: ['GK'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  ATT: ['CF', 'ST', 'LW', 'RW', 'SS']
};

export function TransferMarket({ bidders, transactions = [], initialSelectedBotId, onClose, onTransfer, onViewPlayer }: TransferMarketProps) {
  const [manager1Id, setManager1Id] = useState<string>('user');
  const [manager2Id, setManager2Id] = useState<string>(initialSelectedBotId || bidders.filter(b => b.id !== 'user')[0]?.id || '');
  const [selectedM1PlayerId, setSelectedM1PlayerId] = useState<string | null>(null);
  const [selectedM2PlayerId, setSelectedM2PlayerId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [mode, setMode] = useState<'BUY' | 'SELL' | 'SWAP'>('BUY');
  const [view, setView] = useState<'MARKET' | 'LOGS' | 'SCOUT'>('MARKET');
  const [scoutPosition, setScoutPosition] = useState<string>('ALL');
  const [scoutSearch, setScoutSearch] = useState<string>('');
  const [scoutMinRating, setScoutMinRating] = useState<number>(0);

  const manager1 = bidders.find(b => b.id === manager1Id);
  const manager2 = bidders.find(b => b.id === manager2Id);

  if (!manager1 || !manager2) return null;

  const scoutSearchLower = scoutSearch.trim().toLowerCase();
  const scoutResults = bidders.flatMap(b => b.team.map(p => ({ player: p, owner: b })))
    .filter(({ player }) => {
      if (scoutPosition !== 'ALL' && !POSITION_GROUPS[scoutPosition]?.includes(player.position)) return false;
      if (player.overall < scoutMinRating) return false;
      if (scoutSearchLower && !player.name.toLowerCase().includes(scoutSearchLower) && !player.club.toLowerCase().includes(scoutSearchLower) && !player.country.toLowerCase().includes(scoutSearchLower)) return false;
      return true;
    })
    .sort((a, b) => b.player.overall - a.player.overall);

  const selectedM1Player = manager1.team.find(p => p.id === selectedM1PlayerId);
  const selectedM2Player = manager2.team.find(p => p.id === selectedM2PlayerId);

  const handleAction = () => {
    const val = parseInt(amount.replace(/,/g, ''), 10) || 0;
    onTransfer(mode, manager1Id, manager2Id, val, selectedM1PlayerId || undefined, selectedM2PlayerId || undefined, comment);
    setSelectedM1PlayerId(null);
    setSelectedM2PlayerId(null);
    setAmount('');
    setComment('');
    onClose();
  };

  const calculateAvgOvr = (team: Player[]) => {
    if (team.length === 0) return 0;
    return Math.round(team.reduce((sum, p) => sum + p.overall, 0) / team.length);
  };

  const numAmount = parseInt(amount.replace(/,/g, ''), 10) || 0;
  let nextM1Team = [...manager1.team];
  let nextM1Budget = manager1.budget;

  if (mode === 'BUY' && selectedM2Player) {
    nextM1Team.push(selectedM2Player);
    nextM1Budget -= numAmount;
  } else if (mode === 'SELL' && selectedM1Player) {
    nextM1Team = nextM1Team.filter(p => p.id !== selectedM1Player.id);
    nextM1Budget += numAmount;
  } else if (mode === 'SWAP' && selectedM1Player && selectedM2Player) {
    nextM1Team = nextM1Team.filter(p => p.id !== selectedM1Player.id);
    nextM1Team.push(selectedM2Player);
  }

  const currentOvr = calculateAvgOvr(manager1.team);
  const predictedOvr = calculateAvgOvr(nextM1Team);
  const ovrDiff = predictedOvr - currentOvr;
  const budgetDiff = nextM1Budget - manager1.budget;

  const diffClass = (diff: number) => {
    if (diff > 0) return 'text-green-strong';
    if (diff < 0) return 'text-red';
    return 'text-ink-muted';
  };

  const hasValidAction =
    (mode === 'BUY' && selectedM2PlayerId) ||
    (mode === 'SELL' && selectedM1PlayerId) ||
    (mode === 'SWAP' && selectedM1PlayerId && selectedM2PlayerId);

  return (
    <div className="fixed inset-0 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="ledger-card w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="ledger-card-head shrink-0">
          <div>
            <div className="flex items-center gap-5">
              <h2
                className={`text-xl font-semibold cursor-pointer ${view === 'MARKET' ? 'text-ink' : 'text-ink-faint hover:text-ink'} transition-colors`}
                onClick={() => setView('MARKET')}
              >
                Transfer Market
              </h2>
              <h2
                className={`text-xl font-semibold cursor-pointer ${view === 'SCOUT' ? 'text-ink' : 'text-ink-faint hover:text-ink'} transition-colors`}
                onClick={() => setView('SCOUT')}
              >
                Scout
              </h2>
              <h2
                className={`text-xl font-semibold cursor-pointer ${view === 'LOGS' ? 'text-ink' : 'text-ink-faint hover:text-ink'} transition-colors`}
                onClick={() => setView('LOGS')}
              >
                Logs
              </h2>
            </div>
            <p className="ledger-tag mt-1">{view === 'MARKET' ? 'Trade or sell players with other managers' : view === 'SCOUT' ? 'Browse every player, on every team' : 'Recent valid transactions'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[rgba(0,0,0,0.06)] rounded-md transition-colors text-ink-faint hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {view === 'MARKET' ? (
          <div className="flex overflow-hidden flex-1">
            {/* M1 SQUAD */}
            <div className="w-1/3 border-r border-rule flex flex-col">
              <div className="px-5 py-4 border-b border-rule shrink-0">
                <select
                  className="field-select w-full text-xs"
                  value={manager1Id}
                  onChange={e => {
                    setManager1Id(e.target.value);
                    setSelectedM1PlayerId(null);
                    if (e.target.value === manager2Id) {
                      setManager2Id(bidders.find(b => b.id !== e.target.value)?.id || '');
                      setSelectedM2PlayerId(null);
                    }
                  }}
                >
                  {bidders.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({formatMoney(b.budget)})</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {manager1.team.length === 0 && <p className="text-ink-faint italic text-sm px-2">No players</p>}
                {manager1.team.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedM1PlayerId(p.id)}
                    className={`p-3 rounded-md cursor-pointer border transition-all ${selectedM1PlayerId === p.id ? 'border-red bg-[rgba(200,16,46,0.06)]' : 'border-rule hover:bg-[rgba(0,0,0,0.02)]'} flex justify-between items-center`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">{p.name}</div>
                      <div className="text-[10.5px] text-ink-muted mt-0.5 font-mono">{p.position} · OVR <span className={p.overall >= 88 ? 'text-gold-strong font-bold' : ''}>{p.overall}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION CENTER */}
            <div className="w-1/3 border-r border-rule flex flex-col p-6 items-center justify-center gap-6">
              <div className="segmented w-full">
                <button onClick={() => setMode('BUY')} className={mode === 'BUY' ? 'active' : ''}>Buy</button>
                <button onClick={() => setMode('SELL')} className={mode === 'SELL' ? 'active' : ''}>Sell</button>
                <button onClick={() => setMode('SWAP')} className={mode === 'SWAP' ? 'active' : ''}>Swap</button>
              </div>

              <div className="flex items-center gap-5 w-full justify-center">
                {mode === 'SELL' || mode === 'SWAP' ? (
                  selectedM1Player ? (
                    <div className="text-center w-24">
                      <p className="ledger-tag mb-1" style={{ color: 'var(--color-red)' }}>Give</p>
                      <p className="font-semibold text-sm text-ink">{selectedM1Player.name}</p>
                    </div>
                  ) : <div className="text-ink-faint text-[10.5px] uppercase tracking-wide font-semibold w-24 text-center">Select player</div>
                ) : <div className="text-ink-faint text-[10.5px] uppercase tracking-wide font-semibold w-24 text-center">Cash offer</div>}

                {(mode === 'SWAP' || mode === 'BUY') && <ArrowRightLeft className="text-ink-faint" size={20} />}

                {mode === 'BUY' || mode === 'SWAP' ? (
                  selectedM2Player ? (
                    <div className="text-center w-24">
                      <p className="ledger-tag mb-1" style={{ color: 'var(--color-green-strong)' }}>Receive</p>
                      <p className="font-semibold text-sm text-ink">{selectedM2Player.name}</p>
                    </div>
                  ) : <div className="text-ink-faint text-[10.5px] uppercase tracking-wide font-semibold w-24 text-center">Select player</div>
                ) : <div className="text-ink-faint text-[10.5px] uppercase tracking-wide font-semibold w-24 text-center">Cash returns</div>}
              </div>

              {(mode === 'BUY' || mode === 'SELL') && (
                <div className="w-full relative">
                  <label className="text-[10.5px] uppercase tracking-wide font-semibold text-ink-muted mb-1.5 block">Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" size={16} />
                    <input
                      type="text"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="field-input w-full font-mono font-semibold"
                      style={{ paddingLeft: 34 }}
                      placeholder="e.g. 50,000,000"
                    />
                  </div>
                </div>
              )}

              <div className="w-full relative">
                <label className="text-[10.5px] uppercase tracking-wide font-semibold text-ink-muted mb-1.5 block">Comment (optional)</label>
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAction();
                    }
                  }}
                  className="field-input w-full text-sm"
                  placeholder="Add a note for the other manager…"
                />
              </div>

              {hasValidAction && (
                <div className="w-full ledger-card p-4 text-sm">
                  <h4 className="ledger-tag mb-3 text-center">Outcome comparison</h4>
                  <div className="flex justify-between items-center p-3 rounded-md mb-2" style={{ background: 'rgba(0,0,0,0.03)' }}>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold">Avg OVR</span>
                      <span className="font-bold text-ink text-lg font-mono">{currentOvr} <span className="text-ink-faint text-sm mx-1">→</span> {predictedOvr}</span>
                    </div>
                    <div className={`font-bold text-base font-mono ${diffClass(ovrDiff)}`}>
                      {ovrDiff > 0 ? '+' : ''}{ovrDiff}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-md" style={{ background: 'rgba(0,0,0,0.03)' }}>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-ink-faint uppercase tracking-wide font-semibold">Budget</span>
                      <span className="font-mono font-semibold text-ink text-sm">
                        {formatMoney(manager1.budget)} <span className="text-ink-faint text-sm mx-1">→</span>
                        {formatMoney(nextM1Budget)}
                      </span>
                    </div>
                    <div className={`font-mono font-bold text-sm text-right ${diffClass(budgetDiff)}`}>
                      {budgetDiff > 0 ? '+' : ''}{formatMoney(budgetDiff)}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleAction}
                className="btn btn-primary w-full"
                style={{ padding: '14px' }}
                disabled={
                  !!((mode === 'BUY' && (!selectedM2PlayerId || !amount)) ||
                  (mode === 'SELL' && (!selectedM1PlayerId || !amount)) ||
                  (mode === 'SWAP' && (!selectedM1PlayerId || !selectedM2PlayerId)) ||
                  manager1Id === manager2Id)
                }
              >
                Submit offer
              </button>
              <p className="text-[10.5px] text-ink-faint uppercase tracking-wide font-semibold text-center px-4">Offers are resolved immediately based on manager valuations.</p>
            </div>

            {/* M2 SQUAD */}
            <div className="w-1/3 flex flex-col">
              <div className="px-5 py-4 border-b border-rule shrink-0">
                <select
                  className="field-select w-full text-xs"
                  value={manager2Id}
                  onChange={e => {
                    setManager2Id(e.target.value);
                    setSelectedM2PlayerId(null);
                  }}
                >
                  {bidders.filter(b => b.id !== manager1Id).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({formatMoney(b.budget)})</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {manager2.team.length === 0 && <p className="text-ink-faint italic text-sm px-2">No players</p>}
                {manager2.team.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedM2PlayerId(p.id)}
                    className={`p-3 rounded-md cursor-pointer border transition-all ${selectedM2PlayerId === p.id ? 'border-green bg-[rgba(28,107,76,0.08)]' : 'border-rule hover:bg-[rgba(0,0,0,0.02)]'} flex justify-between items-center`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-ink">{p.name}</div>
                      <div className="text-[10.5px] text-ink-muted mt-0.5 font-mono">{p.position} · OVR <span className={p.overall >= 88 ? 'text-gold-strong font-bold' : ''}>{p.overall}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : view === 'SCOUT' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-rule shrink-0 flex flex-wrap gap-3 items-center">
              <div className="segmented" style={{ width: 260 }}>
                {['ALL', 'GK', 'DEF', 'MID', 'ATT'].map(pos => (
                  <button key={pos} className={scoutPosition === pos ? 'active' : ''} onClick={() => setScoutPosition(pos)}>{pos}</button>
                ))}
              </div>
              <input
                type="text"
                value={scoutSearch}
                onChange={e => setScoutSearch(e.target.value)}
                placeholder="Search name, club, or nation…"
                className="field-input flex-1"
                style={{ minWidth: 180 }}
              />
              <div className="segmented" style={{ width: 220 }}>
                {[{ label: 'Any', v: 0 }, { label: '80+', v: 80 }, { label: '85+', v: 85 }, { label: '90+', v: 90 }].map(o => (
                  <button key={o.label} className={scoutMinRating === o.v ? 'active' : ''} onClick={() => setScoutMinRating(o.v)}>{o.label}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {scoutResults.map(({ player, owner }) => (
                  <div
                    key={`${owner.id}-${player.id}`}
                    onClick={() => onViewPlayer?.(player, owner)}
                    className="ledger-card p-3 cursor-pointer hover:border-rule-strong transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-gold-strong">{player.overall}</span>
                      <span className="chip chip-mid" style={{ fontSize: 9 }}>{player.position}</span>
                    </div>
                    <div className="text-sm font-semibold text-ink truncate">{player.name}</div>
                    <div className="text-[10.5px] text-ink-faint truncate">{player.club}</div>
                    <div className="text-[10px] text-ink-muted mt-1 truncate">{owner.name}</div>
                  </div>
                ))}
                {scoutResults.length === 0 && (
                  <div className="col-span-full text-center text-ink-faint py-12 font-semibold uppercase tracking-wide text-sm">No players match these filters</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {transactions.length === 0 ? (
              <div className="text-center text-ink-faint py-12 font-semibold uppercase tracking-wide text-sm">No transactions yet</div>
            ) : (
              <div className="space-y-3 max-w-3xl mx-auto">
                {transactions.map(tx => {
                  let desc = '';
                  if (tx.type === 'BUY') {
                    desc = `Bought ${tx.playerIn?.name} from ${tx.fromTeam}`;
                  } else if (tx.type === 'SELL') {
                    desc = `Sold ${tx.playerOut?.name} to ${tx.toTeam}`;
                  } else if (tx.type === 'SWAP') {
                    desc = `Swapped ${tx.playerOut?.name} for ${tx.playerIn?.name} with ${tx.toTeam}`;
                  }

                  return (
                    <div key={tx.id} className="ledger-card p-5 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="ledger-tag mb-2">{tx.type} · {new Date(tx.timestamp).toLocaleTimeString()}</div>
                        <div className="font-semibold text-ink text-base">{desc}</div>
                        {(tx.m1Comment || tx.m2Comment) && (
                          <div className="mt-3 space-y-1.5 border-t border-rule pt-3">
                            {tx.m1Comment && (
                              <div className="text-sm">
                                <span className="font-semibold text-ink-muted mr-2">{tx.type === 'BUY' ? tx.toTeam : tx.fromTeam}:</span>
                                <span className="text-ink-muted italic">"{tx.m1Comment}"</span>
                              </div>
                            )}
                            {tx.m2Comment && (
                              <div className="text-sm">
                                <span className="font-semibold text-ink-muted mr-2">{tx.type === 'BUY' ? tx.fromTeam : tx.toTeam}:</span>
                                <span className="text-ink-muted italic">"{tx.m2Comment}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {tx.type !== 'SWAP' && (
                        <div className="text-right pl-5 border-l border-rule">
                          <div className="text-[10px] text-ink-faint uppercase tracking-wide mb-1 font-semibold">Fee</div>
                          <div className={`font-mono font-bold text-base ${tx.type === 'SELL' ? 'text-green-strong' : 'text-red'}`}>
                            {tx.type === 'SELL' ? '+' : '-'}{formatMoney(tx.amount)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
