import React from 'react';
import { Settings, LogOut, LogIn, Cloud, DoorOpen, PlayCircle, UserCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface HomePageProps {
  selectedBudget: number;
  setSelectedBudget: (n: number) => void;
  startGame: (budget: number) => void;
  onOpenSimulation: () => void;
  onOpenSettings: () => void;
  currentUser: any;
  onSignOut: () => void;
  onLoadCloud: () => void;
  onExit: () => void;
  onOpenAuth: () => void;
}

/** Original, abstracted action-mark — deliberately not a photo or likeness of
 * any real player. See design note: a specific athlete's photo as hero
 * branding is a personality-rights issue, not just an image-license one. */
function AthleteMark() {
  return (
    <svg viewBox="0 0 420 460" className="home-figure" style={{ width: '100%', height: '100%' }} aria-hidden="true">
      <defs>
        <linearGradient id="markFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2420" />
          <stop offset="100%" stopColor="#0B1210" />
        </linearGradient>
      </defs>
      {/* standing leg */}
      <rect x="150" y="255" width="46" height="175" rx="23" fill="url(#markFill)" stroke="#E3B856" strokeOpacity="0.35" transform="rotate(6 173 340)" />
      {/* kicking thigh */}
      <rect x="205" y="248" width="44" height="105" rx="22" fill="url(#markFill)" stroke="#E3B856" strokeOpacity="0.35" transform="rotate(58 227 300)" />
      {/* kicking shin */}
      <rect x="255" y="205" width="38" height="100" rx="19" fill="url(#markFill)" stroke="#E3B856" strokeOpacity="0.35" transform="rotate(-18 274 255)" />
      {/* back arm */}
      <rect x="118" y="150" width="30" height="95" rx="15" fill="url(#markFill)" stroke="#E3B856" strokeOpacity="0.35" transform="rotate(20 133 197)" />
      {/* front arm */}
      <rect x="205" y="140" width="30" height="90" rx="15" fill="url(#markFill)" stroke="#E3B856" strokeOpacity="0.35" transform="rotate(-40 220 185)" />
      {/* torso */}
      <rect x="152" y="120" width="92" height="150" rx="34" fill="url(#markFill)" stroke="#E3B856" strokeOpacity="0.45" transform="rotate(-6 198 195)" />
      {/* head */}
      <circle cx="205" cy="90" r="38" fill="url(#markFill)" stroke="#E3B856" strokeOpacity="0.5" />
      {/* ball */}
      <g transform="translate(318 168)">
        <circle r="26" fill="#E3B856" />
        <path d="M0 -26 L15 -8 L9 12 L-9 12 L-15 -8 Z" fill="#0B1210" opacity="0.85" />
        <circle r="26" fill="none" stroke="#0B1210" strokeOpacity="0.25" strokeWidth="2" />
      </g>
    </svg>
  );
}

export function HomePage({
  selectedBudget, setSelectedBudget, startGame, onOpenSimulation, onOpenSettings,
  currentUser, onSignOut, onLoadCloud, onExit, onOpenAuth
}: HomePageProps) {
  return (
    <div className="home-hero">
      <div className="home-hero-glow" />
      <div className="home-hero-beam" />
      <div className="home-hero-beam b2" />
      <div className="home-hero-grain" />
      <div className="home-hero-vignette" />

      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <div className="font-display font-bold text-lg" style={{ color: 'var(--hero-ink)' }}>UA</div>
        <nav className="flex items-center gap-2" aria-label="Account and settings">
          {currentUser?.email ? (
            <>
              <span className="home-nav-btn" style={{ cursor: 'default', background: 'transparent', borderColor: 'transparent' }} title={`Signed in as ${currentUser.email}`}>
                <UserCircle2 size={14} /> {currentUser.email}
              </span>
              <button onClick={onLoadCloud} className="home-nav-btn" title="Load game from cloud">
                <Cloud size={14} /> Load
              </button>
              <button onClick={onSignOut} className="home-nav-btn">
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <span className="home-nav-btn" style={{ cursor: 'default', background: 'transparent', borderColor: 'transparent' }} title="Playing as guest — no cloud save">
                Playing as guest
              </span>
              <button onClick={onOpenAuth} className="home-nav-btn">
                <LogIn size={14} /> Sign in
              </button>
            </>
          )}
          <button onClick={onOpenSettings} className="home-nav-btn">
            <Settings size={14} /> Settings
          </button>
          <button onClick={onExit} className="home-nav-btn">
            <DoorOpen size={14} /> Exit
          </button>
        </nav>
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 px-6 md:px-12 pb-10" style={{ minHeight: 'calc(100vh - 88px)' }}>
        <div className="max-w-xl text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-bold uppercase tracking-[0.25em] mb-4"
            style={{ color: 'var(--hero-gold)' }}
          >
            Season 04 · Deadline Day
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="home-wordmark"
          >
            Ultimate<br />Auction
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-5 text-base md:text-lg"
            style={{ color: 'var(--hero-ink-dim)' }}
          >
            Draft your XXIII in a live bidding war against seven managers. Peak-season icons, real stakes, one market.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 flex flex-col items-center lg:items-start gap-4"
          >
            <div className="flex gap-2 p-1 rounded-md" style={{ background: 'rgba(237,239,232,0.06)', border: '1px solid rgba(237,239,232,0.14)' }}>
              {[500_000_000, 1_000_000_000, 2_000_000_000].map(val => (
                <button
                  key={val}
                  onClick={() => setSelectedBudget(val)}
                  className="px-4 py-2 rounded text-sm font-bold transition-colors"
                  style={{
                    background: selectedBudget === val ? 'var(--hero-gold)' : 'transparent',
                    color: selectedBudget === val ? '#14181A' : 'var(--hero-ink-dim)'
                  }}
                >
                  £{(val / 1_000_000).toFixed(0)}M
                </button>
              ))}
            </div>

            <button
              onClick={() => startGame(selectedBudget)}
              className="btn btn-primary"
              style={{ padding: '18px 48px', fontSize: 17, background: 'var(--hero-red)' }}
            >
              <PlayCircle size={20} /> Play Game
            </button>

            <button onClick={onOpenSimulation} className="text-sm font-semibold underline" style={{ color: 'var(--hero-ink-dim)' }}>
              Simulate draft instead
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="w-[260px] md:w-[360px] lg:w-[420px] shrink-0"
        >
          <AthleteMark />
        </motion.div>
      </div>
    </div>
  );
}
