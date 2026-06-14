import { useState, useEffect } from 'react';
import { useAuctionGame, canBidOnPlayer } from './hooks/useAuctionGame';
import { PlayerCard } from './components/PlayerCard';
import { LineupPitch } from './components/LineupPitch';
import { formatMoney } from './utils/format';
import { User, Users, Coins, Gavel, Settings, Cloud, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransferMarket } from './components/TransferMarket';
import { SettingsModal, ThemeType } from './components/SettingsModal';

import { playSfx } from './utils/audio';
import { ToastContainer } from './components/ToastContainer';
import { AnalyticsPanel } from './components/AnalyticsPanel';

import { Sparkline } from './components/Sparkline';
import { SimulationPanel } from './components/SimulationPanel';
import { ManagerDashboardCard } from './components/ManagerDashboardCard';
import { getDefaultFormationForManager, getDefaultTacticForManager } from './utils/tactics';

import { auth } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const Particles = () => {
  return (
    <div className="particles-container">
      {Array.from({ length: 30 }).map((_, i) => (
        <div 
          key={i} 
          className="particle" 
          style={{
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            animationDuration: `${Math.random() * 10 + 10}s`,
            animationDelay: `${Math.random() * 10}s`,
            opacity: Math.random() * 0.5 + 0.1
          }}
        />
      ))}
    </div>
  )
}

const AnimatedBackground = ({ vfxEnabled }: { vfxEnabled: boolean }) => (
  <div className="absolute inset-0 z-0 pointer-events-none stadium-bg overflow-hidden">
    <div className="spotlight spotlight-left"></div>
    <div className="spotlight spotlight-right"></div>
    {vfxEnabled && <div className="flash-lights"></div>}
    {vfxEnabled && <Particles />}
    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbb4d9941bd?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-20 filter contrast-125"></div>
    <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-brandbg to-transparent opacity-80"></div>
    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-brandbg to-transparent opacity-100"></div>
  </div>
)

export default function App() {
  const { gameState, bidders, auctionQueue, auctionPhase, startGame, placeBid, resetGame, isPaused, togglePause, handleTransfer, transactions, toasts, removeToast, updateManagerName, saveGameToCloud, loadGameFromCloud } = useAuctionGame();
  
  const [selectedBudget, setSelectedBudget] = useState(500_000_000);
  const [showTransferMarket, setShowTransferMarket] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSimulationPanel, setShowSimulationPanel] = useState(false);
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('app-theme') as ThemeType) || 'ultimate';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('app-notifications') !== 'false';
  });
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => {
    return localStorage.getItem('app-sfx') !== 'false';
  });
  const [vfxEnabled, setVfxEnabled] = useState<boolean>(() => {
    return localStorage.getItem('app-vfx') !== 'false';
  });
  const [managerName, setManagerName] = useState<string>(() => {
    return localStorage.getItem('app-manager-name') || 'My Club';
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    return auth.onAuthStateChanged(user => setCurrentUser(user));
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };
  const [transferMarketPreSelectId, setTransferMarketPreSelectId] = useState<string | null>(null);
  const [managerFormations, setManagerFormations] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('squad-formations');
      if (stored) {
        return JSON.parse(stored);
      }
      return {};
    } catch {
      return {};
    }
  });

  const [managerTactics, setManagerTactics] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('squad-tactics');
      if (stored) {
        return JSON.parse(stored);
      }
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('squad-formations', JSON.stringify(managerFormations));
  }, [managerFormations]);

  useEffect(() => {
    localStorage.setItem('squad-tactics', JSON.stringify(managerTactics));
  }, [managerTactics]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app-notifications', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('app-sfx', String(sfxEnabled));
  }, [sfxEnabled]);

  useEffect(() => {
    localStorage.setItem('app-vfx', String(vfxEnabled));
  }, [vfxEnabled]);

  useEffect(() => {
    localStorage.setItem('app-manager-name', managerName);
    updateManagerName(managerName);
  }, [managerName, updateManagerName]);

  const userBidder = bidders.find(b => b.id === 'user');
  const userTeam = userBidder?.team || [];
  const userTeamFull = userTeam.length >= 23;
  const currentPlayer = auctionQueue && auctionQueue.length > 0 && auctionPhase.currentPlayerIndex < auctionQueue.length 
    ? auctionQueue[auctionPhase.currentPlayerIndex] 
    : null;
  const userCanBid = currentPlayer ? canBidOnPlayer(userTeam, currentPlayer) : { allowed: false, reason: 'N/A' };
  
  const handlePlaceBid = (bidderId: string, amount: number) => {
    if (sfxEnabled) {
      playSfx('bid', sfxEnabled);
    }
    placeBid(bidderId, amount);
  };


  if (gameState === 'LOBBY') {
    return (
      <div className="min-h-screen bg-brandbg text-white flex items-center justify-center p-6 relative overflow-hidden select-none">
        <AnimatedBackground vfxEnabled={vfxEnabled} />

        <div className="absolute top-6 right-6 z-50 flex gap-4">
          <div className="flex gap-2">
            {!currentUser ? (
               <button 
                onClick={handleLogin} 
                className="flex items-center gap-2 p-3 px-4 bg-brand1/20 border border-brand1/50 rounded-full text-brand1 hover:text-white hover:bg-brand1 transition-all"
               >
                 <LogIn size={20} />
                 <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Sign In</span>
               </button>
            ) : (
               <>
                 <button 
                  onClick={() => loadGameFromCloud(currentUser.uid)} 
                  className="flex items-center gap-2 p-3 bg-brandbg border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  title="Load Game from Cloud"
                 >
                   <Cloud size={20} />
                 </button>
               </>
            )}
            <button 
              onClick={() => setShowSettings(true)} 
              className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-gray-400 hover:text-brand1 transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(var(--color-brand1),0.3)]"
            >
              <Settings size={24} />
            </button>
          </div>
        </div>

        <div className="max-w-4xl w-full flex flex-col items-center gap-12 relative z-10">
          <div className="text-center space-y-4">
             <motion.h1 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-6xl md:text-8xl font-sans font-black tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
             >
               Ultimate Auction
             </motion.h1>
             <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl text-brand1 font-bold tracking-widest drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] uppercase"
              >
                Draft your 23-man dream team including prime icons in a live bidding war.
              </motion.p>
          </div>
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-4"
          >
            <div className="glass-panel p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl backdrop-blur-md neon-border group relative">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <Coins className="w-12 h-12 text-brand1 relative z-10 drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]" />
               <h3 className="text-2xl font-black tracking-widest uppercase text-white relative z-10">Select Budget</h3>
               <div className="flex gap-3 w-full relative z-10">
                  {[500_000_000, 1_000_000_000, 2_000_000_000].map(val => (
                    <button 
                      key={val}
                      onClick={() => setSelectedBudget(val)}
                      className={`flex-1 py-4 rounded-xl text-sm font-black transition-all border uppercase tracking-wider overflow-hidden relative ${selectedBudget === val ? 'bg-brand1/10 border-brand1 text-brand1 shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-black/50 border-white/5 text-gray-400 hover:bg-white/5'}`}
                    >
                      ${(val / 1_000_000).toFixed(1)}M
                    </button>
                  ))}
               </div>
            </div>
            <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-2xl backdrop-blur-md text-center neon-border group relative">
               <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <Gavel className="w-12 h-12 text-brand2 relative z-10 drop-shadow-[0_0_15px_rgba(112,0,255,0.5)]" />
               <h3 className="text-2xl font-black tracking-widest uppercase text-white relative z-10">Live Bidding</h3>
               <p className="text-gray-400 text-sm md:text-base px-2 font-medium relative z-10">Dynamic value based on peak season OVR stats.</p>
            </div>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => startGame(selectedBudget)}
            className="mt-6 px-16 py-6 bg-gradient-to-r from-brand1 via-brand2 to-brand3 text-white font-black text-2xl md:text-3xl rounded-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(112,0,255,0.6)] neon-border"
          >
            Enter Market
          </motion.button>
        </div>

        {showSettings && <SettingsModal 
          theme={theme} 
          setTheme={setTheme} 
          notifications={notificationsEnabled} 
          setNotifications={setNotificationsEnabled} 
          sfx={sfxEnabled}
          setSfx={setSfxEnabled}
          vfx={vfxEnabled}
          setVfx={setVfxEnabled}
          managerName={managerName}
          setManagerName={setManagerName}
          onClose={() => setShowSettings(false)} 
        />}
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    // Determine winner based on Total OVR
    const bidderScores = bidders.map(b => ({
      ...b,
      totalOvr: b.team.reduce((acc, p) => acc + p.overall, 0),
      avgOvr: b.team.length > 0 ? (b.team.reduce((acc, p) => acc + p.overall, 0) / b.team.length).toFixed(1) : '0'
    }));
    
    // sort by total OVR
    const sortedBidders = [...bidderScores].sort((a, b) => b.totalOvr - a.totalOvr);
    const winnerId = sortedBidders[0]?.id;

    return (
       <div className="min-h-screen bg-brandbg text-white p-6 relative overflow-hidden select-none flex flex-col">
        <AnimatedBackground vfxEnabled={vfxEnabled} />

         <div className="max-w-7xl mx-auto w-full space-y-10 relative z-10 flex flex-col flex-1 pb-10">
            <div className="text-center mt-6">
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 uppercase tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">Market Closed</h2>
              <p className="text-brand1 font-black uppercase tracking-[0.2em] mt-2 drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">{sortedBidders[0]?.name} WINS BEST SQUAD</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
              {sortedBidders.map((bidder, index) => {
                const isWinner = bidder.id === winnerId;
                return (
                <div key={bidder.id} className={`glass-panel border rounded-3xl p-6 shadow-2xl flex flex-col transition-all relative overflow-hidden group ${isWinner ? 'scale-[1.02] z-10 shadow-[0_0_30px_rgba(112,0,255,0.4)] neon-border' : ''}`}>
                   {isWinner && <div className="absolute inset-0 bg-gradient-to-br from-brand2/20 to-brand1/10 opacity-50 blur-xl"></div>}
                   <h3 className="text-2xl font-black mb-2 flex items-center justify-between tracking-widest uppercase relative z-10">
                     <span className="flex items-center gap-2">
                       {index === 0 && <span className="text-yellow-400 text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">🏆</span>}
                       {bidder.name}
                     </span>
                     {bidder.isUser && <User className={`w-5 h-5 ${isWinner ? 'text-yellow-400' : 'text-brand1'}`} />}
                   </h3>
                   <div className="text-gray-400 font-mono mb-4 text-sm flex justify-between relative z-10 font-bold uppercase tracking-widest">
                     <span>Funds: <span className="text-emerald-400 font-black">{formatMoney(bidder.budget)}</span></span>
                     <span>OVR: <span className={`${isWinner ? 'text-yellow-400' : 'text-brand1'} font-black`}>{bidder.totalOvr}</span></span>
                   </div>
                   
                   <div className="flex-1 w-full flex flex-col justify-center mt-2 relative z-10">
                     <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-center ${isWinner ? 'text-brand3' : 'text-brand1'}`}>
                        Avg OVR: <span className="text-xl ml-1">{bidder.avgOvr}</span>
                     </div>
                     <LineupPitch teamId={bidder.id} team={bidder.team} isWinner={isWinner} formation={managerFormations[bidder.id] || getDefaultFormationForManager(bidder.name)} />
                     {bidder.team.length === 0 && <div className="text-gray-500 font-bold text-sm tracking-widest uppercase text-center mt-4">Failed to sign players.</div>}
                   </div>
                </div>
              )})}
            </div>

            <div className="flex justify-center flex-wrap gap-4 mt-10 z-10">
               <button onClick={() => setShowSimulationPanel(true)} className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-[0.2em] text-lg rounded-2xl shadow-2xl active:scale-95 transition-all border border-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]">
                 Run Match Simulation
               </button>
               <button onClick={resetGame} className="px-10 py-5 bg-gradient-to-r from-gray-800 to-black text-white font-black uppercase tracking-[0.2em] text-lg rounded-2xl shadow-2xl active:scale-95 transition-all border border-white/10 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                 Back to Lobby
               </button>
            </div>
         </div>
         {showSimulationPanel && (
           <SimulationPanel 
             bidders={bidders} 
             managerFormations={managerFormations}
             managerTactics={managerTactics}
             onClose={() => setShowSimulationPanel(false)} 
           />
         )}
       </div>
    )
  }

  // AUCTION Phase
  if (!currentPlayer) return null;
  
  return (
    <div className="min-h-screen bg-brandbg text-white flex flex-col text-sm relative overflow-y-auto overflow-x-hidden select-none">
      <AnimatedBackground vfxEnabled={vfxEnabled} />

      <div className="flex flex-col md:flex-row w-full flex-1">
        {/* LEFT COLUMN: ACTIVE AUCTION */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-white/10 p-6 relative z-10 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
        <header className="relative z-10 flex justify-between items-center mb-8 glass-panel rounded-2xl p-5 neon-border group">
           <div className="flex flex-col relative z-20">
             <h2 className="text-2xl font-black tracking-tight leading-none uppercase text-transparent bg-clip-text bg-gradient-to-r from-brand1 to-brand2">Auction Room</h2>
             <p className="text-xs text-gray-300 font-black tracking-[0.2em] uppercase mt-1">Player {auctionPhase.currentPlayerIndex + 1} of {auctionQueue.length}</p>
           </div>
           <div className="flex gap-4 items-center relative z-20">
             <button
                onClick={() => {
                   if (!isPaused) togglePause();
                   setTransferMarketPreSelectId(null);
                   setShowTransferMarket(true);
                }}
                className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all pointer-events-auto bg-gradient-to-r from-brand2/50 to-brand3/50 text-white shadow-[0_0_15px_rgba(112,0,255,0.4)] hover:shadow-[0_0_25px_rgba(255,0,85,0.6)] border border-white/20`}
             >
                Transfer Market
             </button>
             <button
                onClick={resetGame}
                className="px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all pointer-events-auto bg-black/40 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300"
             >
                Restart Draft
             </button>
             <button
                onClick={togglePause}
                className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all pointer-events-auto ${isPaused ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-black/50 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white'}`}
             >
                {isPaused ? 'Resume Game' : 'Pause Game'}
             </button>
             <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-3 bg-black/50 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 hover:text-brand1 transition-all"
             >
                <Settings size={18} />
             </button>
             {currentUser ? (
               <button
                  onClick={() => saveGameToCloud(currentUser.uid)}
                  className="px-4 py-3 bg-black/50 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 hover:text-brand1 transition-all"
                  title="Save Game to Cloud"
               >
                  <Cloud size={18} />
               </button>
             ) : (
               <button
                  onClick={handleLogin}
                  className="px-4 py-3 bg-brand1/20 text-brand1 border border-brand1/30 rounded-xl hover:bg-brand1 hover:text-white transition-all"
                  title="Sign In to Save"
               >
                  <LogIn size={18} />
               </button>
             )}
             <div className="text-right ml-2 px-4 py-2 bg-black/60 rounded-xl border border-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
               <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Remaining Budget</p>
               <p className="text-2xl font-mono text-emerald-400 font-black drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{formatMoney(userBidder?.budget || 0)}</p>
             </div>
           </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center relative">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentPlayer.id}
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: -50 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative z-20 group"
            >
               <div className="absolute -inset-10 bg-gradient-to-t from-brand3/20 via-brand2/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[100px]"></div>
               <PlayerCard player={currentPlayer} />
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 glass-panel rounded-3xl p-8 w-full max-w-lg relative z-20 neon-border">
             <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                   <div className="text-[10px] font-black text-brand1 uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">Current Highest Bid</div>
                   <motion.div 
                     key={auctionPhase.currentBid}
                     initial={{ scale: 1.1, color: '#00f0ff' }}
                     animate={{ scale: 1, color: '#ffffff' }}
                     className="text-5xl font-black tracking-tighter font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                   >
                     {formatMoney(auctionPhase.currentBid)}
                   </motion.div>
                </div>
                <div className="text-right">
                   <div className={`border-2 px-5 py-2 rounded-full font-black flex items-center gap-2 mb-4 tracking-widest uppercase text-sm ${auctionPhase.timeLeft <= 3 ? 'bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' : 'bg-black/50 text-white border-white/20'}`}>
                     {auctionPhase.timeLeft <= 3 && <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,1)]"></span>}
                     {auctionPhase.timeLeft}s LEFT
                   </div>
                </div>
             </div>

             {/* Sparkline Visualizing Bid Velocity */}
             <div className="relative z-10 w-full px-2">
                <Sparkline history={auctionPhase.history} />
             </div>

             {/* Action Buttons */}
             <div className="relative z-10">
             {auctionPhase.highestBidderId === null ? (
               <button
                 disabled={isPaused || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid || !userCanBid.allowed}
                 onClick={() => handlePlaceBid('user', auctionPhase.currentBid)}
                 className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 py-4 rounded-2xl text-lg font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed mb-4"
               >
                 Bid Base Value
               </button>
             ) : (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <button
                     disabled={isPaused || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.05 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                     onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.05), userBidder!.budget))}
                     className="bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold transition-all text-sm uppercase"
                  >
                     +5%
                  </button>
                  <button
                     disabled={isPaused || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.10 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                     onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.10), userBidder!.budget))}
                     className="bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold transition-all text-sm uppercase"
                  >
                     +10%
                  </button>
                  <button
                     disabled={isPaused || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.15 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                     onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.15), userBidder!.budget))}
                     className="bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold transition-all text-sm uppercase"
                  >
                     +15%
                  </button>
                  <button
                     disabled={isPaused || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.20 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                     onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.20), userBidder!.budget))}
                     className="bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold transition-all text-sm uppercase"
                  >
                     +20%
                  </button>
                </div>
             )}
             
             {auctionPhase.highestBidderId !== null && (
               <button
                   disabled={isPaused || auctionPhase.state !== 'BIDDING' || userBidder!.budget <= auctionPhase.currentBid * 1.25 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                   onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.25), userBidder!.budget))}
                   className="w-full bg-gradient-to-r from-[#43A1D5] to-[#E42518] py-4 rounded-2xl text-lg font-black uppercase tracking-widest shadow-lg shadow-[#E42518]/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                   Raise by +25%
                </button>
             )}
              {userCanBid.allowed === false && (
                <div className="absolute bottom-[-1.5rem] left-0 right-0 text-center text-xs font-bold text-red-400">
                  {userCanBid.reason}
                </div>
              )}

             {/* Status overlay */}
             {auctionPhase.state !== 'BIDDING' && (
                <div className="absolute inset-0 bg-brandbg/80 backdrop-blur-md rounded-3xl flex items-center justify-center z-30 border border-white/10">
                   <div className="text-center">
                     <div className="text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-brand1 to-brand2 mb-2 drop-shadow-[0_0_15px_rgba(112,0,255,0.5)]">
                       {auctionPhase.state}
                     </div>
                     <div className="text-xl font-bold text-gray-200">
                       {auctionPhase.state === 'SOLD' ? `To ${bidders.find(b => b.id === auctionPhase.highestBidderId)?.name}` : 'No bids placed'}
                     </div>
                   </div>
                </div>
             )}

             {isPaused && auctionPhase.state === 'BIDDING' && (
                <div className="absolute inset-0 bg-brandbg/80 backdrop-blur-md rounded-3xl flex items-center justify-center z-30 border border-white/10">
                   <div className="text-center">
                     <div className="text-6xl font-black uppercase tracking-widest text-brand3 mb-2 animate-pulse drop-shadow-[0_0_20px_rgba(255,0,85,0.6)]">
                       PAUSED
                     </div>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>

      {/* RIGHT COLUMN: MANAGERS & HISTORY */}
      <div className="w-full md:w-96 glass-panel backdrop-blur-2xl border-l border-white/10 flex flex-col relative z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
         {/* Live Activity */}
         <div className="flex-1 overflow-auto flex flex-col border-b border-white/10">
            <div className="px-6 py-5 border-b border-white/10 bg-black/40 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand1">Live Market Feed</h4>
              <div className="w-2 h-2 rounded-full bg-brand3 animate-pulse shadow-[0_0_8px_rgba(255,0,85,0.8)]"></div>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-auto flex flex-col-reverse relative z-0">
               <AnimatePresence>
                 {auctionPhase.history.slice(0, 3).map((bid, i) => {
                   const isUser = bid.bidderId === 'user';
                   return (
                   <motion.div
                     key={bid.timestamp + '-' + bid.bidderId}
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     className={`flex items-center justify-between p-4 rounded-xl shadow-lg border backdrop-blur-md ${isUser ? 'bg-gradient-to-r from-brand2/30 to-brand1/10 border-l-4 border-l-brand1 border-white/10' : 'bg-black/50 border-white/5 opacity-90'}`}
                   >
                     <div className="flex gap-3 items-center">
                       <span className={`text-sm font-bold uppercase tracking-widest ${isUser ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-gray-400'}`}>
                         {bidders.find(b => b.id === bid.bidderId)?.name} <span className="text-gray-500 font-normal lowercase tracking-normal">bid</span>
                       </span>
                     </div>
                     <span className={`font-mono font-black text-lg ${isUser ? 'text-brand1 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]' : 'text-emerald-500'}`}>{formatMoney(bid.amount)}</span>
                   </motion.div>
                 )})}
               </AnimatePresence>
            </div>
         </div>
        </div>
      </div>

      {/* NEW: ALL MANAGERS LINEUPS DASHBOARD - Horizontally scrolling */}
      <div className="w-full relative z-10 p-6 border-t md:border-t-0 border-white/10 bg-black/30 shrink-0">
        <h3 className="text-xl font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3 text-brand2">
          <span>All Managers Dashboards</span>
        </h3>

        <div className="flex overflow-x-auto gap-6 snap-x hide-scrollbar pb-6 shrink-0 w-full">
          {bidders.map(manager => (
            <ManagerDashboardCard 
              key={manager.id}
              manager={manager}
              managerFormations={managerFormations}
              setManagerFormations={setManagerFormations}
              managerTactics={managerTactics}
              setManagerTactics={setManagerTactics}
              onProposeTrade={(id) => {
                 setTransferMarketPreSelectId(id);
                 setShowTransferMarket(true);
                 if (!isPaused) togglePause();
              }}
            />
          ))}
        </div>
      </div>

      {showTransferMarket && (
         <TransferMarket 
            bidders={bidders} 
            transactions={transactions}
            initialSelectedBotId={transferMarketPreSelectId}
            onClose={() => setShowTransferMarket(false)} 
            onTransfer={handleTransfer} 
         />
      )}

      {showSettings && <SettingsModal 
        theme={theme} 
        setTheme={setTheme} 
        notifications={notificationsEnabled} 
        setNotifications={setNotificationsEnabled} 
        sfx={sfxEnabled}
        setSfx={setSfxEnabled}
        vfx={vfxEnabled}
        setVfx={setVfxEnabled}
        managerName={managerName}
        setManagerName={setManagerName}
        onClose={() => setShowSettings(false)} 
        inGame={true}
        onRestart={resetGame}
        onExit={resetGame}
      />}

      {notificationsEnabled && <ToastContainer toasts={toasts} removeToast={removeToast} />}
    </div>
  );
}
