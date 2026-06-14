import { Player } from '../types';

export const RIVALRIES: [string, string][] = [
  ['Real Madrid', 'FC Barcelona'],
  ['Real Madrid', 'Atlético Madrid'],
  ['Manchester United', 'Manchester City'],
  ['Manchester United', 'Liverpool'],
  ['Arsenal', 'Tottenham Hotspur'],
  ['Chelsea', 'Arsenal'],
  ['Chelsea', 'Tottenham Hotspur'],
  ['AC Milan', 'Inter Milan'],
  ['Juventus', 'Inter Milan'],
  ['Juventus', 'AC Milan'],
  ['FC Bayern', 'Borussia Dortmund'],
  ['Bayern Munich', 'Borussia Dortmund'],
];

export function calculateInternalRivalries(team: Player[]): { penalty: number, conflicts: string[] } {
  let penalty = 0;
  const conflicts: string[] = [];
  
  const clubCounts: Record<string, number> = {};
  team.forEach(p => {
    if (p.club) {
      clubCounts[p.club] = (clubCounts[p.club] || 0) + 1;
    }
  });

  RIVALRIES.forEach(([clubA, clubB]) => {
    if (clubCounts[clubA] && clubCounts[clubB]) {
      const matchPenalty = (clubCounts[clubA] * clubCounts[clubB]); // max penalty depends on overlaps
      penalty += matchPenalty;
      conflicts.push(`${clubA} vs ${clubB}`);
    }
  });

  // Scale the penalty a bit, e.g. -2 chem per conflict
  return { penalty: penalty * 2, conflicts };
}

export function calculateDerbyBonus(teamA: Player[], teamB: Player[]): { bonusA: number, bonusB: number, derbies: string[] } {
  let totalDerbies = 0;
  const derbies: string[] = [];
  
  const clubCountsA: Record<string, number> = {};
  teamA.forEach(p => {
    if (p.club) {
      clubCountsA[p.club] = (clubCountsA[p.club] || 0) + 1;
    }
  });
  
  const clubCountsB: Record<string, number> = {};
  teamB.forEach(p => {
    if (p.club) {
      clubCountsB[p.club] = (clubCountsB[p.club] || 0) + 1;
    }
  });

  RIVALRIES.forEach(([club1, club2]) => {
    // A has club1 and B has club2
    if (clubCountsA[club1] > 0 && clubCountsB[club2] > 0) {
      totalDerbies += (clubCountsA[club1] * clubCountsB[club2]);
      derbies.push(`${club1} vs ${club2}`);
    }
    // A has club2 and B has club1
    if (clubCountsA[club2] > 0 && clubCountsB[club1] > 0) {
      totalDerbies += (clubCountsA[club2] * clubCountsB[club1]);
      if (!derbies.includes(`${club2} vs ${club1}`) && !derbies.includes(`${club1} vs ${club2}`)) {
        derbies.push(`${club1} vs ${club2}`);
      }
    }
  });

  // Calculate bonus based on density of the derby. 
  // Let's say +1 OVR bonus for each player involved in a derby, up to a max
  const bonus = Math.min(totalDerbies, 10);
  
  return {
    bonusA: bonus,
    bonusB: bonus,
    derbies
  };
}
