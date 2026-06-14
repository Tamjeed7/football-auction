import React, { useState } from 'react';
import { Bidder, Player } from '../types';
import { PlayerCard } from './PlayerCard';
import { formatMoney } from '../utils/format';
import { X, ArrowRightLeft, DollarSign } from 'lucide-react';

interface TransferMarketProps {
  bidders: Bidder[];
  transactions?: any[];
  initialSelectedBotId?: string | null;
  onClose: () => void;
  onTransfer: (type: 'BUY' | 'SELL' | 'SWAP', manager1Id: string, manager2Id: string, amount: number, m1PlayerId?: string, m2PlayerId?: string, m1Comment?: string) => void;
}

export function TransferMarket({ bidders, transactions = [], initialSelectedBotId, onClose, onTransfer }: TransferMarketProps) {
  const [manager1Id, setManager1Id] = useState<string>('user');
  const [manager2Id, setManager2Id] = useState<string>(initialSelectedBotId || bidders.filter(b => b.id !== 'user')[0]?.id || '');
  const [selectedM1PlayerId, setSelectedM1PlayerId] = useState<string | null>(null);
  const [selectedM2PlayerId, setSelectedM2PlayerId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [mode, setMode] = useState<'BUY' | 'SELL' | 'SWAP'>('BUY');
  const [view, setView] = useState<'MARKET' | 'LOGS'>('MARKET');

  const manager1 = bidders.find(b => b.id === manager1Id);
  const manager2 = bidders.find(b => b.id === manager2Id);

  if (!manager1 || !manager2) return null;

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

  const getDiffColor = (diff: number) => {
    if (diff > 0) return 'text-emerald-400';
    if (diff < 0) return 'text-rose-400';
    return 'text-gray-400';
  };

  const hasValidAction = 
    (mode === 'BUY' && selectedM2PlayerId) ||
    (mode === 'SELL' && selectedM1PlayerId) ||
    (mode === 'SWAP' && selectedM1PlayerId && selectedM2PlayerId);

  return (
    <div className="fixed inset-0 bg-brandbg/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel border border-white/20 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden neon-border shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 bg-black/40">
          <div>
            <div className="flex items-center gap-6">
              <h2 className="text-2xl font-black uppercase tracking-widest text-white cursor-pointer" onClick={() => setView('MARKET')}>
                <span className={view === 'MARKET' ? 'text-transparent bg-clip-text bg-gradient-to-r from-brand1 to-brand2' : 'text-gray-500 hover:text-white transition-colors'}>Transfer Market</span>
              </h2>
              <h2 className="text-2xl font-black uppercase tracking-widest cursor-pointer mt-1" onClick={() => setView('LOGS')}>
                <span className={view === 'LOGS' ? 'text-transparent bg-clip-text bg-gradient-to-r from-brand1 to-brand2' : 'text-gray-500 hover:text-white transition-colors'}>Logs</span>
              </h2>
            </div>
            <p className="text-brand1/70 text-xs font-bold uppercase tracking-widest mt-1">{view === 'MARKET' ? 'Trade or sell players with other managers' : 'Recent valid transactions'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand3/20 rounded-full transition-colors text-gray-400 hover:text-brand3">
            <X size={24} />
          </button>
        </div>

        {view === 'MARKET' ? (
        <div className="flex overflow-hidden flex-1 backdrop-blur-sm bg-black/40">
          {/* M1 SQUAD */}
          <div className="w-1/3 border-r border-white/10 flex flex-col pt-2 block">
            <div className="px-6 py-4 border-b border-white/10 shrink-0">
               <select 
                 className="w-full bg-brandbg border border-brand1 text-brand1 rounded-lg px-3 py-3 font-bold uppercase cursor-pointer hover:border-brand2 transition-colors focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] text-xs tracking-wider outline-none"
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
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {manager1.team.length === 0 && <p className="text-gray-500 italic text-sm">No players</p>}
              {manager1.team.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setSelectedM1PlayerId(p.id)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all ${selectedM1PlayerId === p.id ? 'border-brand1 bg-brand1/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]' : 'border-white/5 bg-black/50 hover:bg-white/5'} flex justify-between items-center group`}
                >
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider text-white group-hover:text-brand1 transition-colors">{p.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold tracking-widest mt-0.5">{p.position} | OVR <span className={p.overall >= 88 ? 'text-[gold]' : 'text-white'}>{p.overall}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTION CENTER */}
          <div className="w-1/3 border-r border-white/10 flex flex-col p-6 bg-black/60 items-center justify-center gap-8 shadow-inner">
             <div className="flex bg-black/80 rounded-xl p-1.5 w-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <button onClick={() => setMode('BUY')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'BUY' ? 'bg-brand1/20 text-brand1 shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'text-gray-500 hover:text-white'}`}>Buy</button>
                <button onClick={() => setMode('SELL')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'SELL' ? 'bg-brand3/20 text-brand3 shadow-[0_0_10px_rgba(255,0,85,0.3)]' : 'text-gray-500 hover:text-white'}`}>Sell</button>
                <button onClick={() => setMode('SWAP')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'SWAP' ? 'bg-brand2/30 text-[#b066ff] shadow-[0_0_10px_rgba(112,0,255,0.3)]' : 'text-gray-500 hover:text-white'}`}>Swap</button>
             </div>

             <div className="flex items-center gap-6 text-white w-full justify-center">
               {mode === 'SELL' || mode === 'SWAP' ? (
                 selectedM1Player ? <div className="text-center w-24"><p className="text-[9px] text-brand3 font-black uppercase tracking-[0.2em] mb-1">Give</p><p className="font-black text-sm uppercase">{selectedM1Player.name}</p></div> : <div className="text-gray-600 text-[10px] uppercase font-bold tracking-widest w-24 text-center">Select M1 player</div>
               ) : <div className="text-gray-600 text-[10px] uppercase font-bold tracking-widest w-24 text-center">Cash offer</div>}

               {(mode === 'SWAP' || mode === 'BUY') && <ArrowRightLeft className="text-brand2 animate-pulse" size={24} />}

               {mode === 'BUY' || mode === 'SWAP' ? (
                 selectedM2Player ? <div className="text-center w-24"><p className="text-[9px] text-brand1 font-black uppercase tracking-[0.2em] mb-1">Receive</p><p className="font-black text-sm uppercase">{selectedM2Player.name}</p></div> : <div className="text-gray-600 text-[10px] uppercase font-bold tracking-widest w-24 text-center">Select M2 player</div>
               ) : <div className="text-gray-600 text-[10px] uppercase font-bold tracking-widest w-24 text-center">Cash returns</div>}
             </div>

             {(mode === 'BUY' || mode === 'SELL') && (
               <div className="w-full relative">
                 <label className="absolute -top-2.5 left-4 bg-[#0a0a0f] px-2 text-[10px] text-brand1 font-black uppercase tracking-[0.2em]">Amount</label>
                 <div className="relative">
                   <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                   <input
                     type="text"
                     value={amount}
                     onChange={e => setAmount(e.target.value)}
                     className="w-full bg-brandbg border border-white/20 rounded-xl py-4 pl-12 pr-4 text-white font-mono font-bold text-lg outline-none focus:border-brand1 transition-colors focus:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                     placeholder="e.g. 50,000,000"
                   />
                 </div>
               </div>
             )}

             <div className="w-full relative">
                 <label className="absolute -top-2.5 left-4 bg-[#0a0a0f] px-2 text-[10px] text-brand1 font-black uppercase tracking-[0.2em]">Add a comment (Optional)</label>
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
                   className="w-full bg-brandbg border border-white/20 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-brand1 transition-colors"
                   placeholder="Troll your opponent..."
                 />
             </div>

             {hasValidAction && (
               <div className="w-full bg-black/80 border border-white/10 rounded-xl p-4 text-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                 <h4 className="font-black text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-3 text-center">Outcome Comparison</h4>
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg mb-2">
                   <div className="flex flex-col">
                     <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Avg OVR (L)</span>
                     <span className="font-black text-white text-xl">{currentOvr} <span className="text-gray-600 text-sm mx-2">→</span> {predictedOvr}</span>
                   </div>
                   <div className={`font-black text-lg ${getDiffColor(ovrDiff)} drop-shadow-[0_0_5px_currentColor]`}>
                     {ovrDiff > 0 ? '+' : ''}{ovrDiff}
                   </div>
                 </div>
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                   <div className="flex flex-col">
                     <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Budget (L)</span>
                     <span className="font-mono font-bold text-white text-sm">
                       {formatMoney(manager1.budget)} <span className="text-gray-600 text-sm mx-1">→</span>
                       <br />
                       {formatMoney(nextM1Budget)}
                     </span>
                   </div>
                   <div className={`font-mono font-black text-sm text-right ${getDiffColor(budgetDiff)} drop-shadow-[0_0_5px_currentColor]`}>
                     {budgetDiff > 0 ? '+' : ''}{formatMoney(budgetDiff)}
                   </div>
                 </div>
               </div>
             )}

             <button
               onClick={handleAction}
               className="w-full py-4 bg-gradient-to-r from-brand1 to-brand2 text-white font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-[0_0_30px_rgba(112,0,255,0.4)] disabled:opacity-30 disabled:grayscale"
               disabled={
                 (mode === 'BUY' && (!selectedM2PlayerId || !amount)) ||
                 (mode === 'SELL' && (!selectedM1PlayerId || !amount)) ||
                 (mode === 'SWAP' && (!selectedM1PlayerId || !selectedM2PlayerId)) ||
                 manager1Id === manager2Id
               }
             >
               Submit Offer
             </button>
             <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-center px-4">Offers are resolved immediately based on manager valuations.</p>
          </div>

          {/* M2 SQUAD */}
          <div className="w-1/3 flex flex-col pt-2 block">
            <div className="px-6 py-4 border-b border-white/10 shrink-0">
               <select 
                 className="w-full bg-brandbg border border-white/20 rounded-lg px-3 py-3 text-white outline-none font-bold placeholder-gray-500 uppercase cursor-pointer hover:border-brand2 transition-colors focus:shadow-[0_0_10px_rgba(112,0,255,0.2)] text-xs tracking-wider"
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
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {manager2.team.length === 0 && <p className="text-gray-500 italic text-sm">No players</p>}
              {manager2.team.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setSelectedM2PlayerId(p.id)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all ${selectedM2PlayerId === p.id ? 'border-brand2 bg-brand2/20 shadow-[0_0_15px_rgba(112,0,255,0.2)]' : 'border-white/5 bg-black/50 hover:bg-white/5'} flex justify-between items-center group`}
                >
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider text-white group-hover:text-[#b066ff] transition-colors">{p.name}</div>
                    <div className="text-[10px] text-gray-400 font-bold tracking-widest mt-0.5">{p.position} | OVR <span className={p.overall >= 88 ? 'text-[gold]' : 'text-white'}>{p.overall}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-black/60 shadow-inner">
             {transactions.length === 0 ? (
               <div className="text-center text-gray-500 py-12 font-bold uppercase tracking-widest text-sm">No transactions yet</div>
             ) : (
               <div className="space-y-4 max-w-3xl mx-auto">
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
                   <div key={tx.id} className="bg-brandbg border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-4 hover:border-white/20 transition-all hover:bg-white/5">
                      <div className="flex-1 text-white">
                        <div className="text-[10px] text-gray-500 mb-2 font-black uppercase tracking-[0.2em]">{tx.type} • <span className="text-brand1">{new Date(tx.timestamp).toLocaleTimeString()}</span></div>
                        <div className="font-black text-lg tracking-wide">{desc}</div>
                        {(tx.m1Comment || tx.m2Comment) && (
                          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                             {tx.m1Comment && (
                               <div className="text-sm">
                                 <span className="font-black uppercase tracking-widest text-[#b066ff] mr-2">{tx.type === 'BUY' ? tx.toTeam : tx.fromTeam}:</span>
                                 <span className="text-gray-300 italic">"{tx.m1Comment}"</span>
                               </div>
                             )}
                             {tx.m2Comment && (
                               <div className="text-sm">
                                 <span className="font-black uppercase tracking-widest text-brand1 mr-2">{tx.type === 'BUY' ? tx.fromTeam : tx.toTeam}:</span>
                                 <span className="text-gray-300 italic">"{tx.m2Comment}"</span>
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                      {tx.type !== 'SWAP' && (
                        <div className="text-right pl-6 border-l border-white/10">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Fee</div>
                          <div className={`font-mono font-black text-lg drop-shadow-[0_0_5px_currentColor] ${tx.type === 'SELL' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.type === 'SELL' ? '+' : '-'}{formatMoney(tx.amount)}
                          </div>
                        </div>
                      )}
                   </div>
                 )})}
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
}
