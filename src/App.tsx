import { useState, useEffect } from 'react';
import { useAuctionGame, canBidOnPlayer } from './hooks/useAuctionGame';
import { PlayerCard } from './components/PlayerCard';
import { LineupPitch } from './components/LineupPitch';
import { formatMoney } from './utils/format';
import { User, Home, ArrowRightLeft, Settings, Cloud, LogIn, LogOut, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TransferMarket } from './components/TransferMarket';
import { SettingsModal, ThemeType } from './components/SettingsModal';

import { playSfx } from './utils/audio';
import { ToastContainer } from './components/ToastContainer';

import { Sparkline } from './components/Sparkline';
import { SimulationPanel } from './components/SimulationPanel';
import { TournamentPanel } from './components/TournamentPanel';
import { ManagerDashboardCard } from './components/ManagerDashboardCard';
import { getDefaultFormationForManager, getDefaultTacticForManager } from './utils/tactics';
import { FastForwardControl } from './components/FastForwardControl';
import { SimulationMode } from './components/SimulationMode';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { HomePage } from './components/HomePage';
import { Player, Bidder } from './types';
import { isMagicLinkUrl, getStoredEmailForSignIn, completeMagicLinkSignIn } from './lib/emailLinkAuth';

import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';

function AppRail({
  active,
  onHome,
  onMarket,
  onSettings,
  showMarket,
}: {
  active: 'home' | 'market' | 'settings' | null;
  onHome?: () => void;
  onMarket?: () => void;
  onSettings: () => void;
  showMarket: boolean;
}) {
  return (
    <div className="app-rail">
      <div className="crest">UA</div>
      {onHome && (
        <button className={`rail-btn ${active === 'home' ? 'active' : ''}`} onClick={onHome} title="Home">
          <Home size={19} />
        </button>
      )}
      {showMarket && onMarket && (
        <button className={`rail-btn ${active === 'market' ? 'active' : ''}`} onClick={onMarket} title="Transfer Market">
          <ArrowRightLeft size={19} />
        </button>
      )}
      <button className={`rail-btn ${active === 'settings' ? 'active' : ''}`} onClick={onSettings} title="Settings">
        <Settings size={19} />
      </button>
    </div>
  );
}

export default function App() {
  const { gameState, bidders, auctionQueue, auctionPhase, startGame, placeBid, resetGame, isPaused, togglePause, handleTransfer, transactions, toasts, removeToast, updateManagerName, saveGameToCloud, loadGameFromCloud, fastForward, ffActivityLog, startFastForward, stopFastForward, setPlayerPortrait, addToast } = useAuctionGame();

  const [selectedBudget, setSelectedBudget] = useState(500_000_000);
  const [showTransferMarket, setShowTransferMarket] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSimulationPanel, setShowSimulationPanel] = useState(false);
  const [showTournamentPanel, setShowTournamentPanel] = useState(false);
  const [showSimulationMode, setShowSimulationMode] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<{ player: Player; owner: Bidder } | null>(null);

  const openPlayerProfile = (player: Player, owner: Bidder) => setViewingPlayer({ player, owner });
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('app-theme') as ThemeType) || 'system';
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
  // Firebase resolves the persisted session asynchronously; without this we'd
  // flash the login gate at a returning, already-authenticated player for a
  // moment before their session loads.
  const [authResolved, setAuthResolved] = useState(false);
  // Escape hatch for when no sign-in provider is configured yet (or a player
  // just doesn't want an account) — see AuthGate's "Continue as guest".
  // Persisted so a guest doesn't have to re-choose it on every reload; a real
  // sign-in always takes priority over this once it happens.
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('app-guest-mode') === 'true');

  useEffect(() => {
    return auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setAuthResolved(true);
      // A real sign-in always supersedes guest mode, no matter which of the
      // sign-in surfaces (gate or in-game modal) it came through.
      if (user) {
        setIsGuest(false);
        localStorage.removeItem('app-guest-mode');
      }
    });
  }, []);

  const handleContinueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('app-guest-mode', 'true');
  };

  // Completes an email-link sign-in when the player opens the link they were
  // emailed. If it's opened on the same browser, the address is already
  // stored locally and this finishes silently; on a different device/browser
  // we don't have it, so ask for it once via a lightweight confirm screen.
  const [needsLinkEmailConfirm, setNeedsLinkEmailConfirm] = useState(false);
  useEffect(() => {
    if (!isMagicLinkUrl()) return;
    const storedEmail = getStoredEmailForSignIn();
    if (storedEmail) {
      completeMagicLinkSignIn(storedEmail)
        .then(() => addToast('Signed in successfully!', 'success'))
        .catch((err: any) => {
          console.error('[auth/link-complete]', err?.code, err?.message);
          addToast('That sign-in link is invalid or has expired — request a new one.', 'error');
        });
    } else {
      setNeedsLinkEmailConfirm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmLinkEmail = async (email: string) => {
    try {
      await completeMagicLinkSignIn(email);
      setNeedsLinkEmailConfirm(false);
      addToast('Signed in successfully!', 'success');
    } catch (err: any) {
      console.error('[auth/link-complete]', err?.code, err?.message);
      addToast('That email doesn\'t match this sign-in link. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsGuest(false);
      localStorage.removeItem('app-guest-mode');
      // Ends the play session cleanly too — no auction timers keep ticking
      // in the background behind the login gate after logout.
      resetGame();
      addToast('You have been signed out.', 'info');
    } catch (e) {
      console.error(e);
      addToast('Could not sign out. Please try again.', 'error');
    }
  };

  // Browsers block scripts from closing a tab they didn't open themselves —
  // attempt it, and tell the player honestly when it can't be done for them.
  const handleExit = () => {
    window.close();
    setTimeout(() => addToast('You can close this browser tab to exit.', 'info'), 150);
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
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
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

  const settingsModal = showSettings && (
    <SettingsModal
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
      inGame={gameState !== 'LOBBY'}
      onRestart={resetGame}
      onExit={resetGame}
      currentUserEmail={currentUser?.email || currentUser?.displayName}
      onOpenAuth={() => { setShowSettings(false); setShowAuthModal(true); }}
      onSignOut={handleSignOut}
    />
  );

  const authModal = showAuthModal && (
    <AuthModal
      onClose={() => setShowAuthModal(false)}
      onSignedIn={(message) => addToast(message, 'success')}
    />
  );

  const playerProfileModal = viewingPlayer && (
    <PlayerProfileModal
      player={bidders.find(b => b.id === viewingPlayer.owner.id)?.team.find(p => p.id === viewingPlayer.player.id) || viewingPlayer.player}
      isOwnedByUser={viewingPlayer.owner.id === 'user'}
      ownerName={viewingPlayer.owner.name}
      purchasePrice={viewingPlayer.owner.purchasePrices?.[viewingPlayer.player.id]}
      onClose={() => setViewingPlayer(null)}
      onPortraitChange={(playerId, assetId) => setPlayerPortrait(playerId, assetId)}
    />
  );

  // Mandatory auth gate: nothing about the game itself renders below this
  // until a session is confirmed. Order matters — resolve first (avoids a
  // flash of the login screen for an already-signed-in returning player),
  // then require a user.
  if (!authResolved) {
    return (
      <div className="home-hero flex items-center justify-center">
        <div className="home-wordmark" style={{ fontSize: 32, opacity: 0.6 }}>Ultimate Auction</div>
      </div>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <AuthGate
        onSignedIn={(message) => addToast(message, 'success')}
        onContinueAsGuest={handleContinueAsGuest}
        pendingLinkConfirm={needsLinkEmailConfirm}
        onConfirmLinkEmail={handleConfirmLinkEmail}
      />
    );
  }

  if (gameState === 'LOBBY') {
    return (
      <div className="min-h-screen select-none">
        <HomePage
          selectedBudget={selectedBudget}
          setSelectedBudget={setSelectedBudget}
          startGame={startGame}
          onOpenSimulation={() => setShowSimulationMode(true)}
          onOpenSettings={() => setShowSettings(true)}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onLoadCloud={() => currentUser && loadGameFromCloud(currentUser.uid)}
          onExit={handleExit}
          onOpenAuth={() => setShowAuthModal(true)}
        />

        {settingsModal}
        {authModal}
        {showSimulationMode && <SimulationMode onClose={() => setShowSimulationMode(false)} />}
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    const bidderScores = bidders.map(b => ({
      ...b,
      totalOvr: b.team.reduce((acc, p) => acc + p.overall, 0),
      avgOvr: b.team.length > 0 ? (b.team.reduce((acc, p) => acc + p.overall, 0) / b.team.length).toFixed(1) : '0'
    }));

    const sortedBidders = [...bidderScores].sort((a, b) => b.totalOvr - a.totalOvr);
    const winnerId = sortedBidders[0]?.id;

    return (
      <div className="min-h-screen flex text-ink select-none">
        <AppRail active="home" onSettings={() => setShowSettings(true)} showMarket={false} />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="app-ticker">
            <span className="chip" style={{ background: 'transparent', border: '1px solid var(--color-gold)', color: 'var(--color-gold-strong)' }}>Market closed</span>
            <div className="tick-item">Winner <b>{sortedBidders[0]?.name}</b></div>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto w-full space-y-8 pb-8">
              <div className="text-center mt-4">
                <h2 className="text-4xl font-bold text-ink">Market Closed</h2>
                <p className="ledger-tag mt-2" style={{ color: 'var(--color-gold-strong)' }}>{sortedBidders[0]?.name} wins best squad</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {sortedBidders.map((bidder, index) => {
                  const isWinner = bidder.id === winnerId;
                  return (
                    <div key={bidder.id} className={`ledger-card p-5 flex flex-col relative ${isWinner ? 'border-gold' : ''}`} style={isWinner ? { borderWidth: 2, borderColor: 'var(--color-gold)' } : undefined}>
                      <h3 className="text-lg font-semibold mb-1 flex items-center justify-between text-ink">
                        <span className="flex items-center gap-2">
                          {index === 0 && <Trophy size={16} style={{ color: 'var(--color-gold-strong)' }} />}
                          {bidder.name}
                        </span>
                        {bidder.isUser && <User className="w-4 h-4 text-ink-muted" />}
                      </h3>
                      <div className="font-mono text-xs flex justify-between text-ink-muted mb-3">
                        <span>Funds <span className="text-green-strong font-bold">{formatMoney(bidder.budget)}</span></span>
                        <span>OVR <span className="text-ink font-bold">{bidder.totalOvr}</span></span>
                      </div>

                      <div className="flex-1 w-full flex flex-col justify-center mt-1">
                        <div className="ledger-tag mb-3 text-center">Avg OVR <span className="text-ink text-base ml-1 font-mono">{bidder.avgOvr}</span></div>
                        <LineupPitch teamId={bidder.id} team={bidder.team} isWinner={isWinner} formation={managerFormations[bidder.id] || getDefaultFormationForManager(bidder.name)} onViewPlayer={(p) => openPlayerProfile(p, bidder)} />
                        {bidder.team.length === 0 && <div className="text-ink-faint font-semibold text-sm text-center mt-4">Failed to sign players.</div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-center flex-wrap gap-3 mt-8">
                <button onClick={() => setShowSimulationPanel(true)} className="btn btn-secondary" style={{ padding: '15px 28px', fontSize: 14 }}>
                  Run match simulation
                </button>
                <button onClick={() => setShowTournamentPanel(true)} className="btn btn-secondary" style={{ padding: '15px 28px', fontSize: 14 }}>
                  Run tournament
                </button>
                <button onClick={resetGame} className="btn btn-primary" style={{ padding: '15px 28px', fontSize: 14 }}>
                  Back to lobby
                </button>
              </div>
            </div>
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

        {showTournamentPanel && (
          <TournamentPanel
            bidders={bidders}
            managerFormations={managerFormations}
            managerTactics={managerTactics}
            onClose={() => setShowTournamentPanel(false)}
          />
        )}
        {settingsModal}
        {authModal}
        {playerProfileModal}
      </div>
    )
  }

  // AUCTION Phase
  if (!currentPlayer) return null;

  return (
    <div className="min-h-screen flex text-ink select-none">
      <AppRail active="market" onSettings={() => setShowSettings(true)} showMarket={true} onMarket={() => { if (!isPaused) togglePause(); setTransferMarketPreSelectId(null); setShowTransferMarket(true); }} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="app-ticker">
          <span className="chip chip-live"><span className="dot" /> Live</span>
          <div className="tick-item">Lot <b>{auctionPhase.currentPlayerIndex + 1} / {auctionQueue.length}</b></div>
          <div className="tick-sep" />
          <div className="tick-item">Funds <b style={{ color: 'var(--color-green-strong)' }}>{formatMoney(userBidder?.budget || 0)}</b></div>
          <div className="tick-sep" />
          <div className="tick-item" style={{ color: auctionPhase.timeLeft <= 3 ? 'var(--color-red)' : undefined }}>Time <b style={{ color: auctionPhase.timeLeft <= 3 ? 'var(--color-red)' : undefined }}>{auctionPhase.timeLeft}s</b></div>
          <div style={{ marginLeft: 'auto' }} className="flex gap-2 items-center">
            <FastForwardControl
              active={fastForward.active}
              config={fastForward.config}
              activityLog={ffActivityLog}
              onStart={startFastForward}
              onStop={stopFastForward}
            />
            <button onClick={togglePause} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: 12.5 }}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={resetGame} className="btn btn-danger-outline" style={{ padding: '8px 12px', fontSize: 12.5 }}>
              Restart
            </button>
            {currentUser ? (
              <>
                <button onClick={() => saveGameToCloud(currentUser.uid)} className="btn btn-ghost" style={{ padding: '8px 10px' }} title="Save game to cloud">
                  <Cloud size={15} />
                </button>
                <button onClick={handleSignOut} className="btn btn-ghost" style={{ padding: '8px 10px' }} title={`Signed in as ${currentUser.email || currentUser.displayName || 'you'} — sign out`}>
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="btn btn-ghost" style={{ padding: '8px 10px' }} title="Sign in to save">
                <LogIn size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-auto">
          {/* CENTER: ACTIVE AUCTION */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 relative">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentPlayer.id}
                initial={{ opacity: 0, y: vfxEnabled ? 16 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: vfxEnabled ? -16 : 0 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {vfxEnabled && <div className="reveal-sweep" />}
                <PlayerCard player={currentPlayer} />
              </motion.div>
            </AnimatePresence>

            <div className="ledger-card w-full max-w-lg relative">
              <div className="p-6">
                {fastForward.active && (
                  <div className="chip" style={{ background: 'transparent', border: '1px solid var(--color-gold)', color: 'var(--color-gold-strong)', marginBottom: 14 }}>
                    Fast-Forward is bidding for you
                  </div>
                )}
                <div className="flex justify-between items-end mb-5">
                  <div>
                    <div className="ledger-tag mb-1.5">Current highest bid</div>
                    <motion.div
                      key={auctionPhase.currentBid}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      className="text-4xl font-bold font-mono tabular-nums text-ink"
                    >
                      {formatMoney(auctionPhase.currentBid)}
                    </motion.div>
                  </div>
                  <div className={`chip ${auctionPhase.timeLeft <= 3 ? 'chip-live' : ''}`} style={auctionPhase.timeLeft > 3 ? { background: 'transparent', border: '1px solid var(--color-rule-strong)', color: 'var(--color-ink-muted)' } : undefined}>
                    {auctionPhase.timeLeft <= 3 && <span className="dot" />}
                    {auctionPhase.timeLeft}s left
                  </div>
                </div>

                <Sparkline history={auctionPhase.history} />

                <div className="relative mt-2">
                  {auctionPhase.highestBidderId === null ? (
                    <button
                      disabled={isPaused || fastForward.active || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid || !userCanBid.allowed}
                      onClick={() => handlePlaceBid('user', auctionPhase.currentBid)}
                      className="btn btn-primary w-full mb-3"
                      style={{ padding: '15px', fontSize: 15 }}
                    >
                      Bid base value
                    </button>
                  ) : (
                    <div className="segmented mb-3">
                      <button
                        disabled={isPaused || fastForward.active || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.05 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                        onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.05), userBidder!.budget))}
                      >
                        +5%
                      </button>
                      <button
                        disabled={isPaused || fastForward.active || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.10 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                        onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.10), userBidder!.budget))}
                      >
                        +10%
                      </button>
                      <button
                        disabled={isPaused || fastForward.active || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.15 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                        onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.15), userBidder!.budget))}
                      >
                        +15%
                      </button>
                      <button
                        disabled={isPaused || fastForward.active || auctionPhase.state !== 'BIDDING' || userBidder!.budget < auctionPhase.currentBid * 1.20 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                        onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.20), userBidder!.budget))}
                      >
                        +20%
                      </button>
                    </div>
                  )}

                  {auctionPhase.highestBidderId !== null && (
                    <button
                      disabled={isPaused || fastForward.active || auctionPhase.state !== 'BIDDING' || userBidder!.budget <= auctionPhase.currentBid * 1.25 || auctionPhase.highestBidderId === 'user' || !userCanBid.allowed}
                      onClick={() => handlePlaceBid('user', Math.min(Math.floor(auctionPhase.currentBid * 1.25), userBidder!.budget))}
                      className="btn btn-primary w-full"
                      style={{ padding: '15px', fontSize: 15 }}
                    >
                      Raise by +25%
                    </button>
                  )}
                  {userCanBid.allowed === false && (
                    <div className="absolute -bottom-6 left-0 right-0 text-center text-xs font-semibold text-red">
                      {userCanBid.reason}
                    </div>
                  )}

                  {auctionPhase.state !== 'BIDDING' && (
                    <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-paper)_88%,transparent)] backdrop-blur-sm rounded-md flex items-center justify-center z-30 border border-rule">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-ink mb-1">
                          {auctionPhase.state === 'SOLD' ? 'Sold' : 'Unsold'}
                        </div>
                        <div className="text-base font-medium text-ink-muted">
                          {auctionPhase.state === 'SOLD' ? `To ${bidders.find(b => b.id === auctionPhase.highestBidderId)?.name}` : 'No bids placed'}
                        </div>
                      </div>
                    </div>
                  )}

                  {isPaused && auctionPhase.state === 'BIDDING' && (
                    <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-paper)_88%,transparent)] backdrop-blur-sm rounded-md flex items-center justify-center z-30 border border-rule">
                      <div className="text-2xl font-bold uppercase tracking-widest text-red">Paused</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: MARKET FEED */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-rule flex flex-col shrink-0">
            <div className="ledger-card-head sticky top-0 z-10" style={{ background: 'var(--color-surface)' }}>
              <span className="ledger-tag">Live market feed</span>
              <div className="chip chip-live" style={{ padding: 0, border: 'none' }}><span className="dot" /></div>
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-auto flex flex-col-reverse">
              <AnimatePresence>
                {auctionPhase.history.slice(0, 3).map((bid) => {
                  const isUser = bid.bidderId === 'user';
                  return (
                    <motion.div
                      key={bid.timestamp + '-' + bid.bidderId}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center justify-between p-3 rounded-md ledger-card ${isUser ? 'border-gold' : ''}`}
                      style={isUser ? { borderLeftWidth: 3, borderLeftColor: 'var(--color-gold)' } : undefined}
                    >
                      <span className="text-sm font-medium text-ink-muted">
                        {bidders.find(b => b.id === bid.bidderId)?.name} <span className="text-ink-faint font-normal">bid</span>
                      </span>
                      <span className="font-mono font-bold text-sm text-ink tabular-nums">{formatMoney(bid.amount)}</span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* MANAGER DASHBOARDS */}
        <div className="w-full border-t border-rule p-6 shrink-0">
          <h3 className="text-base font-semibold mb-4 text-ink">All manager dashboards</h3>
          <div className="flex overflow-x-auto gap-5 snap-x hide-scrollbar pb-4 shrink-0 w-full">
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
                onViewPlayer={openPlayerProfile}
              />
            ))}
          </div>
        </div>
      </div>

      {showTransferMarket && (
        <TransferMarket
          bidders={bidders}
          transactions={transactions}
          initialSelectedBotId={transferMarketPreSelectId}
          onClose={() => setShowTransferMarket(false)}
          onTransfer={handleTransfer}
          onViewPlayer={openPlayerProfile}
        />
      )}

      {settingsModal}
      {authModal}
      {playerProfileModal}

      {notificationsEnabled && <ToastContainer toasts={toasts} removeToast={removeToast} />}
    </div>
  );
}
