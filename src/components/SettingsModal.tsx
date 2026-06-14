import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, BellOff, Trophy, Zap, MonitorPlay, Gamepad2, Rocket, Volume2, VolumeX, Sparkles, AlertTriangle, LogOut, RotateCcw } from 'lucide-react';

export type ThemeType = 'ultimate' | 'cyber' | 'gold' | 'classic' | 'fc26' | 'retro' | 'galactic';

export const THEMES: { id: ThemeType; name: string; description: string; icon: React.ReactNode; preview: string }[] = [
  { id: 'ultimate', name: 'Ultimate Stadium', description: 'Neon lights, glass panels, transfer market energy.', icon: <Zap size={16} />, preview: 'bg-gradient-to-r from-brand1 to-brand2' },
  { id: 'fc26', name: 'FC 26 Pro', description: 'Next-gen design with volt green, geometric textures, and deep contrast.', icon: <MonitorPlay size={16} />, preview: 'bg-gradient-to-r from-[#ccff00] to-[#00e5ff]' },
  { id: 'cyber', name: 'Cyber Football', description: 'Futuristic holograms, neon greens and cyber blues.', icon: <MonitorPlay size={16} />, preview: 'bg-gradient-to-r from-[#00ffcc] to-[#0088ff]' },
  { id: 'gold', name: 'World Cup Premium', description: 'Luxury gold lighting, trophy aesthetics, warm ambient.', icon: <Trophy size={16} />, preview: 'bg-gradient-to-r from-[#ffd700] to-[#ffaa00]' },
  { id: 'classic', name: 'Classic FC', description: 'Clean stadium floodlights, green pitch, familiar UI.', icon: <span className="font-serif text-sm">FC</span>, preview: 'bg-gradient-to-r from-[#10b981] to-[#3b82f6]' },
  { id: 'retro', name: 'Retro 8-Bit', description: 'Arcade style, vibrant magenta and cyan, scanline aesthetics.', icon: <Gamepad2 size={16} />, preview: 'bg-gradient-to-r from-[#ff00ff] to-[#00ffff]' },
  { id: 'galactic', name: 'Galactic Strike', description: 'Deep space purple, starlight glow, cosmic vibes.', icon: <Rocket size={16} />, preview: 'bg-gradient-to-r from-[#9d4edd] to-[#ff9e00]' },
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
}

export function SettingsModal({ 
  theme: initialTheme, setTheme, 
  notifications: initialNotifications, setNotifications, 
  sfx: initialSfx, setSfx,
  vfx: initialVfx, setVfx,
  managerName: initialManagerName, setManagerName,
  inGame, onRestart, onExit,
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
    <div className="fixed inset-0 bg-brandbg/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel border border-white/20 rounded-3xl w-full max-w-2xl overflow-hidden neon-border shadow-[0_0_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] flex flex-col"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand1 rounded-full blur-[100px] opacity-10 -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40 relative z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-brand1 to-brand2">Settings</h2>
            <p className="text-brand1/70 text-xs font-bold uppercase tracking-widest mt-1">Customize your experience</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand3/20 rounded-full transition-colors text-gray-400 hover:text-brand3">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto relative z-10 flex-1">
          {/* Profile Settings */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Manager Profile</h3>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-300">Manager Name</label>
              <input 
                type="text" 
                value={localManagerName}
                onChange={(e) => setLocalManagerName(e.target.value)}
                maxLength={20}
                className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand1 focus:ring-1 focus:ring-brand1 transition-all w-full max-w-sm"
                placeholder="Enter your name"
              />
            </div>
          </div>

          {/* Preferences Toggle */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Notifications */}
              <div 
                onClick={() => setLocalNotifications(!localNotifications)}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40 cursor-pointer hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${localNotifications ? 'bg-brand1/20 text-brand1' : 'bg-gray-800 text-gray-400'}`}>
                    {localNotifications ? <Bell size={20} /> : <BellOff size={20} />}
                  </div>
                  <div>
                    <div className="font-bold">Alerts</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Toast notifications</div>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${localNotifications ? 'bg-brand1' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${localNotifications ? 'left-[22px]' : 'left-0.5'}`}></div>
                </div>
              </div>

              {/* SFX */}
              <div 
                onClick={() => setLocalSfx(!localSfx)}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40 cursor-pointer hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${localSfx ? 'bg-brand2/20 text-brand2' : 'bg-gray-800 text-gray-400'}`}>
                    {localSfx ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </div>
                  <div>
                    <div className="font-bold">Sound Effects</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Bids, timers, alerts</div>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${localSfx ? 'bg-brand2' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${localSfx ? 'left-[22px]' : 'left-0.5'}`}></div>
                </div>
              </div>

              {/* VFX */}
              <div 
                onClick={() => setLocalVfx(!localVfx)}
                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40 cursor-pointer hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${localVfx ? 'bg-brand3/20 text-brand3' : 'bg-gray-800 text-gray-400'}`}>
                    <Sparkles size={20} className={localVfx ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <div className="font-bold">Visual Effects</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Particles, glows, motion</div>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${localVfx ? 'bg-brand3' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${localVfx ? 'left-[22px]' : 'left-0.5'}`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Visual Theme</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {THEMES.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setLocalTheme(t.id)}
                  className={`relative p-4 rounded-xl border cursor-pointer transition-all ${localTheme === t.id ? 'border-brand1 bg-brand1/10 shadow-[0_0_15px_rgba(var(--color-brand1),0.15)]' : 'border-white/10 bg-black/40 hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`text-${localTheme === t.id ? 'brand1' : 'gray-400'}`}>
                      {t.icon}
                    </div>
                    <div className="font-bold text-sm">{t.name}</div>
                  </div>
                  <div className="text-[10px] text-gray-500 mb-3 leading-tight min-h-[2.5rem]">{t.description}</div>
                  <div className={`w-full h-2 rounded-full ${t.preview}`}></div>
                  
                  {localTheme === t.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand1 shadow-[0_0_8px_currentColor]"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Game Controls */}
          {inGame && (
             <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-xs font-black text-brand3 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Danger Zone</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <button 
                     onClick={() => { if(onRestart) onRestart(); onClose(); }}
                     className="flex items-center justify-center gap-3 w-full p-4 rounded-xl border border-brand3/30 bg-brand3/5 text-brand3 hover:bg-brand3/20 transition-all font-bold uppercase tracking-widest text-xs"
                   >
                     <RotateCcw size={18} /> Restart Draft
                   </button>
                   <button 
                     onClick={() => { if(onExit) onExit(); onClose(); }}
                     className="flex items-center justify-center gap-3 w-full p-4 rounded-xl border border-gray-600/50 bg-black/50 text-gray-400 hover:bg-white/10 hover:text-white transition-all font-bold uppercase tracking-widest text-xs"
                   >
                     <LogOut size={18} /> Exit to Lobby
                   </button>
                </div>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/60 relative z-10 shrink-0 flex justify-end gap-3 rounded-b-3xl">
          <button 
            onClick={onClose} 
            className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            className="px-8 py-3 bg-gradient-to-r from-brand1 to-brand2 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:opacity-90 transition-all hover:scale-105"
          >
            Confirm Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
