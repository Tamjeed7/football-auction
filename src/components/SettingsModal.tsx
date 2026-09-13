import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Bell, BellOff, Volume2, VolumeX, Sparkles, AlertTriangle, LogOut, LogIn, RotateCcw, Sun, Moon, Laptop, UserCircle2 } from 'lucide-react';

export type ThemeType = 'light' | 'dark' | 'system';

const APPEARANCES: { id: ThemeType; name: string; icon: React.ReactNode }[] = [
  { id: 'light', name: 'Ledger Paper', icon: <Sun size={16} /> },
  { id: 'dark', name: 'Night Match', icon: <Moon size={16} /> },
  { id: 'system', name: 'Match device', icon: <Laptop size={16} /> },
];

interface SettingsModalProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  notifications: boolean;
  setNotifications: (enabled: boolean) => void;
  sfx: boolean;
  setSfx: (enabled: boolean) => void;
  vfx: boolean;
  setVfx: (enabled: boolean) => void;
  managerName: string;
  setManagerName: (name: string) => void;
  onClose: () => void;
  inGame?: boolean;
  onRestart?: () => void;
  onExit?: () => void;
  currentUserEmail?: string | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${on ? 'bg-red' : 'bg-rule-strong'}`}>
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}></div>
    </div>
  );
}

export function SettingsModal({
  theme: initialTheme, setTheme,
  notifications: initialNotifications, setNotifications,
  sfx: initialSfx, setSfx,
  vfx: initialVfx, setVfx,
  managerName: initialManagerName, setManagerName,
  inGame, onRestart, onExit,
  currentUserEmail, onOpenAuth, onSignOut,
  onClose
}: SettingsModalProps) {
  const [localTheme, setLocalTheme] = useState<ThemeType>(initialTheme);
  const [localNotifications, setLocalNotifications] = useState<boolean>(initialNotifications);
  const [localSfx, setLocalSfx] = useState<boolean>(initialSfx);
  const [localVfx, setLocalVfx] = useState<boolean>(initialVfx);
  const [localManagerName, setLocalManagerName] = useState<string>(initialManagerName);

  const handleConfirm = () => {
    setTheme(localTheme);
    setNotifications(localNotifications);
    setSfx(localSfx);
    setVfx(localVfx);
    setManagerName(localManagerName);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        className="ledger-card w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
      >
        <div className="ledger-card-head shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-ink">Settings</h2>
            <p className="ledger-tag mt-1">Manager preferences</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-[rgba(0,0,0,0.06)] transition-colors text-ink-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {/* Profile */}
          <div className="space-y-3">
            <h3 className="ledger-tag">Manager profile</h3>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-ink-muted">Manager name</label>
              <input
                type="text"
                value={localManagerName}
                onChange={(e) => setLocalManagerName(e.target.value)}
                maxLength={20}
                className="field-input w-full max-w-sm"
                placeholder="Enter your name"
              />
            </div>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h3 className="ledger-tag">Account</h3>
            {currentUserEmail ? (
              <div className="flex items-center justify-between p-4 rounded-md border border-rule">
                <div className="flex items-center gap-3 min-w-0">
                  <UserCircle2 size={22} className="text-ink-muted shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10.5px] text-ink-faint uppercase tracking-wide">Signed in as</div>
                    <div className="font-semibold text-sm text-ink truncate">{currentUserEmail}</div>
                  </div>
                </div>
                <button onClick={onSignOut} className="btn btn-secondary shrink-0" style={{ padding: '9px 14px' }}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-md border border-rule">
                <div>
                  <div className="font-semibold text-sm text-ink">Not signed in</div>
                  <div className="text-[10.5px] text-ink-faint uppercase tracking-wide">Sign in to save your progress to the cloud</div>
                </div>
                <button onClick={onOpenAuth} className="btn btn-primary shrink-0" style={{ padding: '9px 14px' }}>
                  <LogIn size={15} /> Sign in
                </button>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="space-y-3">
            <h3 className="ledger-tag">Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => setLocalNotifications(!localNotifications)}
                className="flex items-center justify-between p-4 rounded-md border border-rule cursor-pointer hover:bg-[rgba(0,0,0,0.03)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-ink-muted">{localNotifications ? <Bell size={18} /> : <BellOff size={18} />}</div>
                  <div>
                    <div className="font-semibold text-sm">Alerts</div>
                    <div className="text-[10.5px] text-ink-faint uppercase tracking-wide">Toast notifications</div>
                  </div>
                </div>
                <Toggle on={localNotifications} />
              </div>

              <div
                onClick={() => setLocalSfx(!localSfx)}
                className="flex items-center justify-between p-4 rounded-md border border-rule cursor-pointer hover:bg-[rgba(0,0,0,0.03)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-ink-muted">{localSfx ? <Volume2 size={18} /> : <VolumeX size={18} />}</div>
                  <div>
                    <div className="font-semibold text-sm">Sound</div>
                    <div className="text-[10.5px] text-ink-faint uppercase tracking-wide">Bids, timers</div>
                  </div>
                </div>
                <Toggle on={localSfx} />
              </div>

              <div
                onClick={() => setLocalVfx(!localVfx)}
                className="flex items-center justify-between p-4 rounded-md border border-rule cursor-pointer hover:bg-[rgba(0,0,0,0.03)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="text-ink-muted"><Sparkles size={18} /></div>
                  <div>
                    <div className="font-semibold text-sm">Motion</div>
                    <div className="text-[10.5px] text-ink-faint uppercase tracking-wide">Gavel &amp; reveal effects</div>
                  </div>
                </div>
                <Toggle on={localVfx} />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-3">
            <h3 className="ledger-tag">Appearance</h3>
            <div className="segmented">
              {APPEARANCES.map(a => (
                <button
                  key={a.id}
                  onClick={() => setLocalTheme(a.id)}
                  className={localTheme === a.id ? 'active' : ''}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)', fontSize: 13 }}
                >
                  {a.icon} {a.name}
                </button>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          {inGame && (
            <div className="space-y-3 pt-4 border-t border-rule">
              <h3 className="ledger-tag flex items-center gap-2" style={{ color: 'var(--color-red)' }}><AlertTriangle size={13} /> Danger zone</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => { if (onRestart) onRestart(); onClose(); }}
                  className="btn btn-danger-outline"
                  style={{ padding: '12px 16px' }}
                >
                  <RotateCcw size={16} /> Restart draft
                </button>
                <button
                  onClick={() => { if (onExit) onExit(); onClose(); }}
                  className="btn btn-secondary"
                  style={{ padding: '12px 16px' }}
                >
                  <LogOut size={16} /> Exit to lobby
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-rule shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '11px 18px' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn btn-primary" style={{ padding: '11px 20px' }}>
            Confirm changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
