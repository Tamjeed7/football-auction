import React, { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { Player } from '../types';
import { formatMoney } from '../utils/format';
import { usePortraitUrl } from '../hooks/usePortraitUrl';
import { PortraitUploadModal } from './PortraitUploadModal';

interface PlayerProfileModalProps {
  player: Player;
  isOwnedByUser: boolean;
  ownerName?: string;
  purchasePrice?: number;
  onClose: () => void;
  onPortraitChange: (playerId: string, assetId: string | null) => void;
}

const posChipClass = (position: string) => {
  if (position === 'GK') return 'chip-gk';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return 'chip-def';
  if (['CF', 'ST', 'LW', 'RW', 'SS'].includes(position)) return 'chip-fwd';
  return 'chip-mid';
};

const countryToEmoji: Record<string, string> = {
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Spain': '🇪🇸', 'Germany': '🇩🇪',
  'Italy': '🇮🇹', 'France': '🇫🇷', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Portugal': '🇵🇹',
  'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Uruguay': '🇺🇾', 'Colombia': '🇨🇴',
  'USA': '🇺🇸', 'Sweden': '🇸🇪', 'Denmark': '🇩🇰', 'Norway': '🇳🇴', 'Poland': '🇵🇱',
  'Croatia': '🇭🇷', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Ghana': '🇬🇭',
  'Mali': '🇲🇱', 'Morocco': '🇲🇦', 'Algeria': '🇩🇿', 'Cameroon': '🇨🇲',
  'Ukraine': '🇺🇦', 'Ireland': '🇮🇪', 'Republic of Ireland': '🇮🇪', 'Austria': '🇦🇹',
  'Burkina Faso': '🇧🇫', 'Switzerland': '🇨🇭'
};

export function PlayerProfileModal({ player, isOwnedByUser, ownerName, purchasePrice, onClose, onPortraitChange }: PlayerProfileModalProps) {
  const [showUpload, setShowUpload] = useState(false);
  const customUrl = usePortraitUrl(player.customPortraitAssetId);
  const isGk = player.position === 'GK';
  const flag = countryToEmoji[player.country] || '🏳️';

  const portraitUrl = customUrl || player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=14181A&color=A8791F&size=500`;

  const statPairs: Array<[string, number]> = [
    [isGk ? 'DIV' : 'PAC', player.pac],
    [isGk ? 'HAN' : 'SHO', player.sho],
    [isGk ? 'KIC' : 'PAS', player.pas],
    [isGk ? 'REF' : 'DRI', player.dri],
    [isGk ? 'SPD' : 'DEF', player.def],
    [isGk ? 'POS' : 'PHY', player.phy],
  ];

  return (
    <>
      <div className="fixed inset-0 bg-[rgba(11,18,16,0.5)] backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="ledger-card w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between p-2 pr-3">
            <div />
            <button onClick={onClose} className="p-2 hover:bg-[rgba(0,0,0,0.06)] rounded-md text-ink-faint hover:text-ink">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-md overflow-hidden border border-rule bg-paper">
                <img src={portraitUrl} alt={player.name} className="w-full h-full object-cover" />
              </div>
              {isOwnedByUser && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center border-2 border-surface"
                  title="Edit portrait"
                >
                  <Camera size={14} />
                </button>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-ink truncate">{player.name}</h2>
              <div className="text-sm text-ink-muted mt-0.5">{player.club} <span className="mx-1">·</span> {flag} {player.country}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`chip ${posChipClass(player.position)}`}>{player.position}</span>
                <span className="font-mono font-bold text-lg text-ink">{player.overall} OVR</span>
              </div>
            </div>
          </div>

          <div className="border-t border-rule p-6 grid grid-cols-2 gap-x-8 gap-y-3">
            {statPairs.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</span>
                <span className="font-mono font-bold text-base tabular-nums text-ink">{value}</span>
              </div>
            ))}
          </div>

          {(ownerName || purchasePrice != null) && (
            <div className="border-t border-rule px-6 py-4 flex justify-between text-sm">
              {ownerName && <span className="text-ink-muted">Owned by <span className="font-semibold text-ink">{ownerName}</span></span>}
              {purchasePrice != null && <span className="font-mono font-bold text-green-strong">{formatMoney(purchasePrice)}</span>}
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <PortraitUploadModal
          player={player}
          onClose={() => setShowUpload(false)}
          onSaved={assetId => onPortraitChange(player.id, assetId)}
          onReset={() => onPortraitChange(player.id, null)}
        />
      )}
    </>
  );
}
