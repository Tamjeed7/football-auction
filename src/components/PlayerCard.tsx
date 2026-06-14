import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
}

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

  const imageUrl = player.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=112154&color=fde07e&size=500`;

  return (
    <div 
      className="relative flex flex-col justify-between w-[250px] md:w-[260px] aspect-[1/1.55] p-[3px] transition-all hover:scale-105 group bg-brandbg drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] neon-border"
      style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 12%, 100% 85%, 50% 100%, 0 85%, 0 12%)' }}
    >
      {/* Inner Container */}
      <div 
        className="w-full h-full bg-gradient-to-b from-[#111116] via-brandbg to-[#010102] flex flex-col relative overflow-hidden z-10 before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] before:opacity-10 before:mix-blend-overlay"
        style={{ clipPath: 'polygon(14% 0.5%, 86% 0.5%, 99.5% 12.3%, 99.5% 84.7%, 50% 99.2%, 0.5% 84.7%, 0.5% 12.3%)' }}
      >
        {/* Subtle background glow */}
        <div className="absolute top-[-20%] left-[50%] -translate-x-[50%] w-[120%] h-[70%] bg-brand1 rounded-full blur-[90px] opacity-10 z-0 group-hover:bg-brand2 group-hover:opacity-20 transition-all duration-500"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-transparent to-transparent z-10 opacity-90" style={{height: '110%', bottom: '-10%'}}></div>

        {/* Top Left Stats */}
        <div className="absolute top-5 left-5 z-20 flex flex-col items-center justify-center">
          <span className="text-[44px] font-black leading-[0.8] tracking-tighter text-brand1 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] transition-all group-hover:text-white group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">{player.overall}</span>
          <span className="text-[14px] font-black mt-1 tracking-[0.2em] uppercase text-white/80">{player.position}</span>
          <div className="w-6 h-[2px] my-1 bg-gradient-to-r from-transparent via-brand1 to-transparent shadow-[0_0_5px_rgba(0,240,255,0.8)]"></div>
          <span className="text-[22px] drop-shadow-lg leading-none mt-1">{flag}</span>
        </div>

        {/* Player Image */}
        <div className="w-full h-[55%] relative flex justify-center mt-6">
          <img 
            src={imageUrl} 
            alt={player.name} 
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
               const target = e.target as HTMLImageElement;
               const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=050508&color=00f0ff&size=500`;
               if (target.src !== fallback) {
                 target.src = fallback;
               }
            }}
            className="h-[105%] w-[85%] object-cover object-top z-10 drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)] pt-2 grayscale-[0.2] contrast-125 group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-500 ease-out" 
            style={{ maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)' }}
          />
        </div>
        
        {/* Info Section */}
        <div className="z-20 text-center flex flex-col items-center mt-auto pb-5 relative">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent -z-10"></div>
          <h2 className="text-xl md:text-[22px] font-black uppercase tracking-widest leading-none text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] truncate px-3 w-[90%]">{player.name}</h2>
          
          <div className="flex items-center justify-center w-[85%] my-3 relative">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute w-1/3 h-[1px] bg-gradient-to-r from-transparent via-brand2 to-transparent shadow-[0_0_10px_rgba(112,0,255,0.8)]"></div>
          </div>
          
          <div className="flex w-[85%] mx-auto justify-between px-2 text-white/90">
            <div className="flex flex-col items-start gap-[2px]">
              <div className="flex items-center gap-1.5"><span className="text-[17px] font-black w-[22px] text-right leading-none group-hover:text-brand1 transition-colors">{player.pac}</span><span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider leading-none">{isGk ? 'DIV' : 'PAC'}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-[17px] font-black w-[22px] text-right leading-none group-hover:text-brand1 transition-colors">{player.sho}</span><span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider leading-none">{isGk ? 'HAN' : 'SHO'}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-[17px] font-black w-[22px] text-right leading-none group-hover:text-brand1 transition-colors">{player.pas}</span><span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider leading-none">{isGk ? 'KIC' : 'PAS'}</span></div>
            </div>
            
            <div className="w-[1px] h-[55px] self-center bg-gradient-to-b from-transparent via-white/10 to-transparent mx-1"></div>
            
            <div className="flex flex-col items-start gap-[2px]">
              <div className="flex items-center gap-1.5"><span className="text-[17px] font-black w-[22px] text-right leading-none group-hover:text-brand1 transition-colors">{player.dri}</span><span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider leading-none">{isGk ? 'REF' : 'DRI'}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-[17px] font-black w-[22px] text-right leading-none group-hover:text-brand1 transition-colors">{player.def}</span><span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider leading-none">{isGk ? 'SPD' : 'DEF'}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-[17px] font-black w-[22px] text-right leading-none group-hover:text-brand1 transition-colors">{player.phy}</span><span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider leading-none">{isGk ? 'POS' : 'PHY'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
