import React, { useState, useEffect } from 'react';
import { Player } from '../types';

interface LineupPitchProps {
  teamId: string;
  team: Player[];
  isWinner?: boolean;
  formation?: string;
  onViewPlayer?: (player: Player) => void;
}

export function LineupPitch({ teamId, team, isWinner, formation = '4-3-3', onViewPlayer }: LineupPitchProps) {
  const [placements, setPlacements] = useState<Record<string, string>>(() => {
    try {
      if (teamId) {
        const saved = localStorage.getItem(`lineup-placements-${teamId}`);
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    if (teamId) {
      localStorage.setItem(`lineup-placements-${teamId}`, JSON.stringify(placements));
    }
  }, [placements, teamId]);

  const genericPos = (pos: string) => {
    if (pos === 'GK') return 'gk';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'def';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'mid';
    if (['CF', 'ST', 'LW', 'RW', 'SS'].includes(pos)) return 'att';
    return 'mid';
  };

  const getFormationRows = (form: string) => {
    switch (form.toUpperCase()) {
      case '4-3-3 ATTACK': return [4, 2, 1, 3]; // 4 def, 2 cm, 1 cam, 3 att
      case '4-3-3 DEFEND': return [4, 2, 1, 3]; // 4 def, 2 cdm, 1 cm, 3 att
      case '4-3-3 FALSE 9': return [4, 1, 2, 3]; // 4 def, 1 cdm, 2 cm, 3 att (False 9 drops deep)
      case '4-3-3 HOLDING': return [4, 1, 2, 3]; // 4 def, 1 cdm, 2 cm, 3 att
      case '4-4-2 HOLDING': return [4, 2, 2, 2];
      default:
        const rowCounts = form.split('-').map(n => parseInt(n) || 0).filter(n => n > 0);
        return rowCounts.length > 0 ? rowCounts : [4, 3, 3];
    }
  };

  const getRowClassName = (count: number, rowIndex: number, form: string) => {
    let classes = "flex relative z-10 w-full ";
    const f = form.toUpperCase();

    // 4-3-3 Attack
    if (f === '4-3-3 ATTACK') {
      if (rowIndex === 1) return classes + "justify-center gap-12 md:gap-24"; // 2 CMs
      if (rowIndex === 2) return classes + "justify-center -mt-2 -mb-2 z-20"; // 1 CAM (pulled up slightly)
      if (rowIndex === 3) return classes + "justify-between px-[10%] md:px-[15%]"; // 3 Att
    }
    
    // 4-3-3 False 9
    if (f === '4-3-3 FALSE 9') {
      if (rowIndex === 2) return classes + "justify-center gap-16 md:gap-32"; // 2 CMs
      if (rowIndex === 3) return classes + "justify-between px-[10%] md:px-[15%] z-20"; // 3 Att
    }

    // 4-3-3 Defend
    if (f === '4-3-3 DEFEND') {
      if (rowIndex === 1) return classes + "justify-center gap-12 md:gap-24 mt-2 mb-2"; // 2 CDMs
    }

    // 4-3-3 Holding
    if (f === '4-3-3 HOLDING') {
      if (rowIndex === 2) return classes + "justify-center gap-16 md:gap-32"; // 2 CMs
    }

    if (count === 1) return classes + "justify-center";
    
    if (count === 2) {
      if (f === '4-4-2 HOLDING' && rowIndex === 3) {
         return classes + "justify-center gap-[25%] md:gap-[30%]"; // Strikers
      }
      return classes + "justify-evenly";
    }

    if (count === 3) return classes + "justify-between px-[10%] md:px-[15%]";
    if (count === 4) return classes + "justify-between px-[5%] md:px-[10%]";
    if (count === 5) return classes + "justify-between w-full";

    return classes + "justify-evenly";
  };

  useEffect(() => {
    let rowCounts = getFormationRows(formation);
    
    const validSlots = new Set<string>();
    validSlots.add('gk');
    
    rowCounts.forEach((count, rowIndex) => {
       const isDef = rowIndex === 0;
       const isAtt = rowIndex === rowCounts.length - 1;
       const posType = isDef ? 'def' : (isAtt ? 'att' : 'mid');
       
       for (let i = 0; i < count; i++) {
         validSlots.add(`${posType}-r${rowIndex}-${i}`);
       }
    });

    for (let i=0; i<30; i++) validSlots.add(`sub-${i}`);

    setPlacements(prev => {
      const newPlacements = { ...prev };
      const placedPlayerIds = new Set<string>();
      
      const teamIds = new Set(team.map(p => p.id));
      for (const [slot, untypedPId] of Object.entries(newPlacements)) {
        const pId = untypedPId as string;
        if (!teamIds.has(pId) || !validSlots.has(slot)) {
          delete newPlacements[slot];
        } else {
          placedPlayerIds.add(pId);
        }
      }

      const unplaced = team.filter(p => !placedPlayerIds.has(p.id));
      if (unplaced.length === 0) {
        const prevKeys = Object.keys(prev);
        const newKeys = Object.keys(newPlacements);
        if (prevKeys.length === newKeys.length && prevKeys.every(k => prev[k] === newPlacements[k])) {
            return prev;
        }
        return newPlacements;
      }
      
      unplaced.sort((a, b) => b.overall - a.overall);

      const findEmptySlot = (prefix: string) => [...validSlots].find(s => s.startsWith(prefix) && !newPlacements[s]);

      unplaced.forEach(p => {
         const genPos = genericPos(p.position);
         let targetSlot = findEmptySlot(genPos);
         if (!targetSlot) {
            targetSlot = findEmptySlot('sub');
         }
         if (targetSlot) {
           newPlacements[targetSlot] = p.id;
         }
      });

      return newPlacements;
    });
  }, [team, formation]);

  const handleDrop = (e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();
    const draggedPlayerId = e.dataTransfer.getData('playerId');
    if (!draggedPlayerId) return;

    setPlacements(prev => {
      const newPlacements = { ...prev };
      const sourceSlotId = Object.keys(newPlacements).find(k => newPlacements[k] === draggedPlayerId);
      
      const targetPlayerId = newPlacements[targetSlotId];

      if (sourceSlotId) {
        newPlacements[targetSlotId] = draggedPlayerId;
        if (targetPlayerId) {
          newPlacements[sourceSlotId] = targetPlayerId;
        } else {
          delete newPlacements[sourceSlotId];
        }
      }
      return newPlacements;
    });
  };

  const renderEmptySlot = () => (
    <div className="absolute inset-0 flex items-center justify-center opacity-40 z-0">
      <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/30"></div>
    </div>
  );

  const chipClass = (p: Player) => {
    if (p.club === 'Icons') return 'chip-gk';
    if (p.position === 'GK') return 'chip-gk';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.position)) return 'chip-def';
    if (['CF', 'ST', 'LW', 'RW', 'SS'].includes(p.position)) return 'chip-fwd';
    return 'chip-mid';
  };

  const renderPlayer = (p: Player) => {
    const nameParts = p.name.split(' ');
    const displayName = nameParts.length > 1 && nameParts[1].length > 2 ? nameParts.slice(1).join(' ') : p.name;

    return (
      <div
        className="flex flex-col items-center z-10 w-full cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
        draggable
        onDragStart={(e) => e.dataTransfer.setData('playerId', p.id)}
        onClick={() => onViewPlayer?.(p)}
      >
        <div className={`chip ${chipClass(p)} !rounded-full w-9 h-9 md:w-11 md:h-11 flex-col !px-0 shadow-[0_2px_6px_rgba(0,0,0,0.4)]`}>
          <span className="text-[0.85rem] md:text-[1rem] leading-none">{p.overall}</span>
        </div>
        <div className="text-[8px] md:text-[9px] mt-1 font-bold whitespace-nowrap overflow-hidden text-ellipsis w-full text-center capitalize bg-rail text-rail-ink rounded px-1 py-0.5">
          {displayName}
        </div>
      </div>
    );
  };

  const renderSlot = (slotId: string, className?: string) => {
    const pId = placements[slotId];
    const p = team.find(player => player.id === pId);

    return (
      <div 
        key={slotId}
        className={`relative flex flex-col items-center justify-center w-12 h-16 md:w-16 md:h-20 ${className || ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, slotId)}
      >
        {p ? renderPlayer(p) : renderEmptySlot()}
      </div>
    );
  };

  const renderSubSlot = (slotId: string) => {
    const pId = placements[slotId];
    const p = team.find(player => player.id === pId);

    return (
      <div
        key={slotId}
        className="w-full min-w-0 flex items-center min-h-[36px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, slotId)}
      >
        {p ? (
          <div
            className="flex items-center gap-2 bg-paper border border-rule rounded px-2 py-1 w-full min-w-0 justify-between cursor-grab hover:border-rule-strong transition-colors"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('playerId', p.id)}
            onClick={() => onViewPlayer?.(p)}
          >
            <div className="flex items-center gap-2 min-w-0">
               <div className={`chip ${chipClass(p)} !rounded-full w-6 h-6 !px-0 flex-col shrink-0`}>
                  <span className="text-[0.55rem] leading-none">{p.overall}</span>
               </div>
               <div className="text-[9px] md:text-[10px] font-bold text-ink truncate min-w-0">{p.name}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-[32px] bg-paper border border-dashed border-rule rounded">
            <span className="text-ink-faint text-[9px] font-bold uppercase">Empty</span>
          </div>
        )}
      </div>
    );
  }

  let rowCounts = getFormationRows(formation);

  const maxSubIndex = Math.max(-1, ...Object.keys(placements).filter(k => k.startsWith('sub-') && placements[k]).map(k => parseInt(k.replace('sub-', ''))));
  const subSlotsToRender = Array.from({ length: Math.min(20, Math.max(0, maxSubIndex + 2)) }).map((_, i) => `sub-${i}`);

  return (
    <div className="w-full flex flex-col @container">
      <div className="ledger-tag mb-2 text-center" style={{ color: 'var(--color-ink-muted)' }}>
        {formation} · {team.length}/23 signed
        <div className="text-[9.5px] normal-case tracking-normal mt-1" style={{ color: 'var(--color-gold-strong)' }}>Drag players to swap positions</div>
      </div>
      {/* Below ~440px of available width there isn't room for the pitch and
          the bench side by side (the pitch alone wants up to 320px) — stack
          the bench under the pitch instead of letting it get squeezed to
          nothing, which is what was clipping player names in narrow cards
          like the Summary grid. */}
      <div className="flex flex-col @[440px]:flex-row items-stretch gap-2 w-full justify-center">

        {/* PITCH */}
        <div className="relative w-full max-w-[320px] mx-auto @[440px]:mx-0 rounded-lg overflow-hidden aspect-[3/4.5] sm:aspect-[3/4] p-3 flex flex-col justify-between @[440px]:flex-shrink-0 border-2" style={{ backgroundColor: 'var(--pitch-mid)', borderColor: 'var(--pitch-start)' }}>
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--pitch-start), var(--pitch-mid), var(--pitch-end))' }}></div>
          <div className="absolute inset-0 flex flex-col z-0 opacity-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}></div>
            ))}
          </div>

          <div className="absolute inset-0 z-0 pointer-events-none border-2 m-3 rounded-md" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[40%] aspect-[2/1] border-b-2 border-l-2 border-r-2 z-0" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[15%] aspect-[2/1] border-b-2 border-l-2 border-r-2" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--pitch-line)' }} />

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[40%] aspect-[2/1] border-t-2 border-l-2 border-r-2 z-0" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[15%] aspect-[2/1] border-t-2 border-l-2 border-r-2" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--pitch-line)' }} />
          
          <div className="absolute top-3 left-3 w-4 h-4 border-b-2 border-r-2 rounded-br-full" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute top-3 right-3 w-4 h-4 border-b-2 border-l-2 rounded-bl-full" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-t-2 border-r-2 rounded-tr-full" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-t-2 border-l-2 rounded-tl-full" style={{ borderColor: 'var(--pitch-line)' }} />

          <div className="absolute top-1/2 left-3 right-3 h-[2px] z-0 shadow-sm" style={{ backgroundColor: 'var(--pitch-line)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full border-2 z-0" style={{ borderColor: 'var(--pitch-line)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full z-0" style={{ backgroundColor: 'var(--pitch-line)' }} />

          <div className="flex-1 flex flex-col justify-between py-2 md:py-4 h-full relative z-10 w-full pointer-events-none">
            {rowCounts.map((_, rIdx) => {
              const rowIndex = rowCounts.length - 1 - rIdx;
              const count = rowCounts[rowIndex];
              const isDef = rowIndex === 0;
              const isAtt = rowIndex === rowCounts.length - 1;
              const posType = isDef ? 'def' : (isAtt ? 'att' : 'mid');
              
              return (
                <div key={`row-${rowIndex}`} className={getRowClassName(count, rowIndex, formation)}>
                  {Array.from({ length: count }).map((_, i) => {
                    let wrapperClass = "pointer-events-auto";
                    if (formation.toUpperCase() === '4-3-3 FALSE 9' && rowIndex === 3 && i === 1) {
                      wrapperClass += " mt-8 md:mt-12 z-0"; // CF drops deep
                    }
                    if (formation.toUpperCase() === '4-3-3 ATTACK' && rowIndex === 3 && i === 1) {
                      wrapperClass += " -mt-4 md:-mt-6 z-20"; // ST pushes high
                    }
                    return (
                      <div key={`${posType}-r${rowIndex}-${i}`} className={wrapperClass}>
                        {renderSlot(`${posType}-r${rowIndex}-${i}`)}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="flex justify-center relative z-10 w-full pointer-events-auto">
              {renderSlot('gk')}
            </div>
          </div>
        </div>

        {/* SUBS — a wide 2-column grid when stacked below the pitch (narrow
            cards), a single narrow scrolling column when there's room to sit
            beside the pitch instead. */}
        <div className="w-full @[440px]:flex-1 @[440px]:max-w-[120px] @[440px]:md:max-w-[140px] grid grid-cols-2 gap-1 @[440px]:flex @[440px]:flex-col @[440px]:overflow-y-auto @[440px]:max-h-[400px] @[440px]:md:max-h-[500px] custom-scrollbar @[440px]:pr-1">
          <div className="ledger-tag col-span-2 @[440px]:col-span-1 mb-1 text-center @[440px]:sticky @[440px]:top-0 z-10 py-1 rounded" style={{ background: 'var(--color-surface)' }}>Bench</div>
          {team.length === 0 ? (
             <div className="col-span-2 text-center text-[10px] text-ink-faint font-bold italic mt-4">Empty bench</div>
          ) : (
            subSlotsToRender.map(slotId => renderSubSlot(slotId))
          )}
        </div>
      </div>
    </div>
  );
}

