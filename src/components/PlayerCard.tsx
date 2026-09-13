import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
}

const posChipClass = (position: string) => {
  if (position === 'GK') return 'chip-gk';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return 'chip-def';
  if (['CF', 'ST', 'LW', 'RW', 'SS'].includes(position)) return 'chip-fwd';
  return 'chip-mid';
};

export function PlayerCard({ player }: PlayerCardProps) {
  const isGk = player.position === 'GK';

  const countryToEmoji: Record<string, string> = {
    'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Spain': '🇪🇸', 'Germany': '🇩🇪',
    'Italy': '🇮🇹', 'France': '🇫🇷', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Portugal': '🇵🇹',
    'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Uruguay': '🇺🇾', 'Colombia': '🇨🇴',
    'Chile': '🇨🇱', 'Mexico': '🇲🇽', 'USA': '🇺🇸', 'Sweden': '🇸🇪', 'Denmark': '🇩🇰',
    'Norway': '🇳🇴', 'Finland': '🇫🇮', 'Poland': '🇵🇱', 'Croatia': '🇭🇷',
    'Serbia': '🇷🇸', 'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Japan': '🇯🇵',
    'South Korea': '🇰🇷', 'Russia': '🇷🇺', 'Slovenia': '🇸🇮', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'Egypt': '🇪🇬', 'Senegal': '🇸🇳', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Canada': '🇨🇦',
    'Morocco': '🇲🇦'
  };
  const flag = countryToEmoji[player.country] || '🏳️';

  const imageUrl = player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=14181A&color=A8791F&size=500`;

  const statPairs: Array<[string, number]> = [
    [isGk ? 'DIV' : 'PAC', player.pac],
    [isGk ? 'HAN' : 'SHO', player.sho],
    [isGk ? 'KIC' : 'PAS', player.pas],
    [isGk ? 'REF' : 'DRI', player.dri],
    [isGk ? 'SPD' : 'DEF', player.def],
    [isGk ? 'POS' : 'PHY', player.phy],
  ];

  return (
    <div className="ledger-card w-[250px] md:w-[260px] flex flex-col overflow-hidden relative">
      <div className="absolute top-3 left-3 z-10">
        <span className="font-display text-[34px] font-bold leading-none text-ink">{player.overall}</span>
      </div>
      <div className="absolute top-3 right-3 z-10 text-[20px] leading-none">{flag}</div>

      <div className="w-full h-[150px] bg-paper border-b border-rule flex items-end justify-center overflow-hidden">
        <img
          src={imageUrl}
          alt={player.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=EDEFE8&color=14181A&size=500`;
            if (target.src !== fallback) {
              target.src = fallback;
            }
          }}
          className="h-full w-[78%] object-cover object-top"
          style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
        />
      </div>

      <div className="p-4 flex flex-col items-center gap-3">
        <h2 className="text-[17px] font-semibold text-ink truncate w-full text-center">{player.name}</h2>
        <span className={`chip ${posChipClass(player.position)}`}>{player.position}</span>

        <div className="w-full h-px bg-rule" />

        <div className="flex w-full justify-between px-1">
          <div className="flex flex-col gap-1.5">
            {statPairs.slice(0, 3).map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[15px] font-bold font-mono tabular-nums w-[24px] text-right text-ink">{value}</span>
                <span className="text-[10.5px] font-semibold uppercase text-ink-faint tracking-wide">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {statPairs.slice(3).map(([label, value]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[15px] font-bold font-mono tabular-nums w-[24px] text-right text-ink">{value}</span>
                <span className="text-[10.5px] font-semibold uppercase text-ink-faint tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
