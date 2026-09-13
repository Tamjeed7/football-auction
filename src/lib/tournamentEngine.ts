import { Player, Bidder } from '../types';
import { getDefaultFormationForManager, getDefaultTacticForManager, adaptTacticAndFormation } from '../utils/tactics';
import { calculateInternalRivalries, calculateDerbyBonus } from '../utils/rivalry';
import { createSeededRng, SeededRng } from './auctionEngine';

// ============================================================================
// Shared match-power formula — extracted verbatim from SimulationPanel.tsx so
// the round-robin engine and the existing 1v1 quick-sim can never silently
// diverge on how a squad's strength is actually computed.
// ============================================================================

export function getStartingXIAndBench(manager: Bidder): { starters: Player[]; bench: Player[] } {
  let starters: Player[] = [];
  try {
    const saved = localStorage.getItem(`lineup-placements-${manager.id}`);
    if (saved) {
      const placements = JSON.parse(saved);
      const startingIds = Object.keys(placements).filter(k => !k.startsWith('sub-')).map(k => placements[k]);
      starters = manager.team.filter(p => startingIds.includes(p.id));
    }
  } catch {}

  if (starters.length !== 11) {
    starters = [...manager.team].sort((a, b) => b.overall - a.overall).slice(0, 11);
  }

  const starterIds = new Set(starters.map(p => p.id));
  const bench = manager.team.filter(p => !starterIds.has(p.id));
  return { starters, bench };
}

function calculateChemistry(team11: Player[]): number {
  let chem = 0;
  const countries = new Map<string, number>();
  const clubs = new Map<string, number>();
  team11.forEach(p => {
    countries.set(p.country, (countries.get(p.country) || 0) + 1);
    clubs.set(p.club, (clubs.get(p.club) || 0) + 1);
  });
  countries.forEach(count => { if (count > 1) chem += count * 2; });
  clubs.forEach(count => { if (count > 1) chem += count * 3; });
  return Math.min(100, 50 + chem);
}

function applyTacticalBonus(tactic: string, formation: string): { powerBonus: number; chemBonus: number } {
  let powerBonus = 0;
  let chemBonus = 0;
  if (tactic === 'Gegenpressing') { powerBonus = 2; chemBonus = 5; }
  else if (tactic === 'Tiki-Taka') { chemBonus = 10; powerBonus = 1; }
  else if (tactic === 'Park the Bus') { powerBonus = 3; }
  else if (tactic === 'Counter Attack') { powerBonus = 2; }
  else if (tactic === 'Direct Passing') { powerBonus = 1; chemBonus = 2; }
  else if (tactic === 'High Press') { powerBonus = 3; chemBonus = -2; }
  else if (tactic === 'Possession') { chemBonus = 8; }

  if (formation.includes('Attack')) { powerBonus += 4; chemBonus -= 3; }
  else if (formation.includes('Defend')) { powerBonus += 3; chemBonus += 2; }
  else if (formation.includes('False 9')) { chemBonus += 6; powerBonus += 1; }
  else if (formation.includes('Holding')) { chemBonus += 4; powerBonus += 2; }

  return { powerBonus, chemBonus };
}

export interface TeamMatchStats {
  power: number;
  avgOvr: number;
  chemistry: number;
  starters: Player[];
  bench: Player[];
  tactic: string;
  formation: string;
  internalRivalries: string[];
  derbies: string[];
}

export function computeTeamMatchStats(manager: Bidder, opponent: Bidder, managerFormations: Record<string, string>, managerTactics: Record<string, string>): TeamMatchStats {
  const { starters, bench } = getStartingXIAndBench(manager);
  const { starters: oppStarters } = getStartingXIAndBench(opponent);

  let tactic = managerTactics[manager.id] || getDefaultTacticForManager(manager.name);
  let formation = managerFormations[manager.id] || getDefaultFormationForManager(manager.name);

  if (tactic === 'Adaptive' || !manager.isUser) {
    const myOvr = starters.length ? starters.reduce((a, p) => a + p.overall, 0) / starters.length : 0;
    const oppOvr = oppStarters.length ? oppStarters.reduce((a, p) => a + p.overall, 0) / oppStarters.length : 0;
    const adapted = adaptTacticAndFormation(manager.name, myOvr, opponent.name, oppOvr, tactic, formation);
    tactic = adapted.adaptedTactic;
    formation = adapted.adaptedFormation;
  }

  const rawOvr = starters.length ? starters.reduce((a, p) => a + p.overall, 0) / starters.length : 0;
  let rawChem = calculateChemistry(starters);

  const { penalty, conflicts } = calculateInternalRivalries(starters);
  rawChem -= penalty;

  const { bonusA: derbyBonus, derbies } = calculateDerbyBonus(starters, oppStarters);

  const { powerBonus, chemBonus } = applyTacticalBonus(tactic, formation);
  const avgOvr = rawOvr + powerBonus;
  const chemistry = Math.max(0, Math.min(100, rawChem + chemBonus));
  const power = avgOvr * 0.7 + chemistry * 0.3 + derbyBonus;

  return { power, avgOvr, chemistry, starters, bench, tactic, formation, internalRivalries: conflicts, derbies };
}

// ============================================================================
// Minute-by-minute match timeline.
//
// Model (stated plainly, not hidden): total expected goals for an evenly
// matched pair is calibrated to ~2.6 combined (a realistic top-flight
// average); each side's share scales with their share of combined power.
// Goal timing is a per-minute independent trial across 93 minutes (90 + 3
// stoppage), not a literal physics model — this is a transparent, tunable
// approximation, not a claim of real-world predictive accuracy.
// ============================================================================

export type MatchEventType = 'GOAL' | 'SUB' | 'CARD' | 'INJURY' | 'HALFTIME' | 'FULLTIME';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side: 'A' | 'B';
  text: string;
}

export interface MatchSimConfig {
  maxSubs: number;
  subWindowStart: number;
  subWindowEnd: number;
}

export function defaultMatchSimConfig(overrides: Partial<MatchSimConfig> = {}): MatchSimConfig {
  return { maxSubs: 5, subWindowStart: 45, subWindowEnd: 85, ...overrides };
}

const GENERIC_POS = (pos: string): 'GK' | 'DEF' | 'MID' | 'ATT' => {
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF';
  if (['CF', 'ST', 'LW', 'RW', 'SS'].includes(pos)) return 'ATT';
  return 'MID';
};

const ATTACKING_WEIGHT = (pos: string): number => {
  const g = GENERIC_POS(pos);
  if (g === 'ATT') return 5;
  if (g === 'MID') return 3;
  if (g === 'DEF') return 1;
  return 0.1; // GK — vanishingly rare, not impossible
};

function pickWeighted<T>(items: T[], weight: (t: T) => number, rng: SeededRng): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

export interface MatchReport {
  managerAId: string;
  managerBId: string;
  managerAName: string;
  managerBName: string;
  statsA: { power: number; avgOvr: number; chemistry: number; tactic: string; formation: string };
  statsB: { power: number; avgOvr: number; chemistry: number; tactic: string; formation: string };
  events: MatchEvent[];
  scoreA: number;
  scoreB: number;
}

export function simulateMatchTimeline(
  teamAId: string, teamAName: string, statsA: TeamMatchStats,
  teamBId: string, teamBName: string, statsB: TeamMatchStats,
  config: MatchSimConfig, rng: SeededRng
): MatchReport {
  const onPitchA = [...statsA.starters];
  const onPitchB = [...statsB.starters];
  const benchA = [...statsA.bench];
  const benchB = [...statsB.bench];

  // Tactical matchup bonuses — same counters as the 1v1 SimulationPanel, so
  // a manager's style advantage means the same thing in both modes.
  let powerA = statsA.power;
  let powerB = statsB.power;
  const tacticA = statsA.tactic;
  const tacticB = statsB.tactic;
  if (tacticA === 'Gegenpressing' && tacticB === 'Possession') powerA += 5;
  if (tacticA === 'Possession' && tacticB === 'Park the Bus') powerA += 5;
  if (tacticA === 'Counter Attack' && tacticB === 'High Press') powerA += 5;
  if (tacticB === 'Gegenpressing' && tacticA === 'Possession') powerB += 5;
  if (tacticB === 'Possession' && tacticA === 'Park the Bus') powerB += 5;
  if (tacticB === 'Counter Attack' && tacticA === 'High Press') powerB += 5;

  const avgPower = (powerA + powerB) / 2 || 1;
  const baseXgPerTeam = 1.3;
  const parkTheBus = tacticA === 'Park the Bus' || tacticB === 'Park the Bus';
  const xgScale = parkTheBus ? 0.75 : 1.0; // mirrors the 1v1 sim's reduced "chances" count for Park the Bus
  let xgA = baseXgPerTeam * (powerA / avgPower) * xgScale;
  let xgB = baseXgPerTeam * (powerB / avgPower) * xgScale;

  const events: MatchEvent[] = [];
  let scoreA = 0, scoreB = 0;

  // Pre-schedule substitution minutes (sorted), one bench swap each.
  const scheduleSubs = (count: number) => {
    const minutes = new Set<number>();
    const span = Math.max(1, config.subWindowEnd - config.subWindowStart);
    while (minutes.size < Math.min(count, span) && minutes.size < count) {
      minutes.add(config.subWindowStart + Math.floor(rng.next() * span));
      if (minutes.size >= span) break;
    }
    return [...minutes].sort((a, b) => a - b);
  };
  const subMinutesA = scheduleSubs(Math.min(config.maxSubs, benchA.length));
  const subMinutesB = scheduleSubs(Math.min(config.maxSubs, benchB.length));

  let freshnessA = 1.0;
  let freshnessB = 1.0;

  const doSub = (side: 'A' | 'B', minute: number) => {
    const onPitch = side === 'A' ? onPitchA : onPitchB;
    const bench = side === 'A' ? benchA : benchB;
    const outfield = onPitch.filter(p => p.position !== 'GK');
    if (outfield.length === 0 || bench.length === 0) return;
    const playerOut = outfield[Math.floor(rng.next() * outfield.length)];
    const wantGroup = GENERIC_POS(playerOut.position);
    let replacementIdx = bench.findIndex(p => GENERIC_POS(p.position) === wantGroup);
    if (replacementIdx === -1) replacementIdx = 0;
    const playerIn = bench[replacementIdx];

    const outIdx = onPitch.findIndex(p => p.id === playerOut.id);
    onPitch[outIdx] = playerIn;
    bench.splice(replacementIdx, 1);

    events.push({ minute, type: 'SUB', side, text: `${playerIn.name} on for ${playerOut.name}` });
    if (side === 'A') freshnessA *= 1.03; else freshnessB *= 1.03;
  };

  for (let minute = 1; minute <= 93; minute++) {
    if (minute === 45) events.push({ minute, type: 'HALFTIME', side: 'A', text: `Half-time: ${teamAName} ${scoreA} - ${scoreB} ${teamBName}` });

    while (subMinutesA.length && subMinutesA[0] === minute) { doSub('A', subMinutesA.shift()!); }
    while (subMinutesB.length && subMinutesB[0] === minute) { doSub('B', subMinutesB.shift()!); }

    const fatigue = minute > 70 ? 1.15 : 1.0;
    const hazardA = (xgA / 93) * fatigue * freshnessA;
    const hazardB = (xgB / 93) * fatigue * freshnessB;

    if (rng.next() < hazardA && onPitchA.length) {
      const scorer = pickWeighted(onPitchA, p => ATTACKING_WEIGHT(p.position), rng);
      scoreA++;
      events.push({ minute, type: 'GOAL', side: 'A', text: `GOAL! ${scorer.name} (${teamAName}) — ${scoreA}-${scoreB}` });
    }
    if (rng.next() < hazardB && onPitchB.length) {
      const scorer = pickWeighted(onPitchB, p => ATTACKING_WEIGHT(p.position), rng);
      scoreB++;
      events.push({ minute, type: 'GOAL', side: 'B', text: `GOAL! ${scorer.name} (${teamBName}) — ${scoreA}-${scoreB}` });
    }

    // Cards/injuries: logged flavor only, no score/lineup effect — a stated
    // simplification, not a hidden mechanic.
    if (rng.next() < 0.012) {
      const side: 'A' | 'B' = rng.next() < 0.5 ? 'A' : 'B';
      const pool = side === 'A' ? onPitchA : onPitchB;
      if (pool.length) {
        const p = pool[Math.floor(rng.next() * pool.length)];
        events.push({ minute, type: 'CARD', side, text: `Yellow card: ${p.name}` });
      }
    }
    if (rng.next() < 0.003) {
      const side: 'A' | 'B' = rng.next() < 0.5 ? 'A' : 'B';
      const pool = side === 'A' ? onPitchA : onPitchB;
      if (pool.length) {
        const p = pool[Math.floor(rng.next() * pool.length)];
        events.push({ minute, type: 'INJURY', side, text: `Injury concern: ${p.name}` });
      }
    }
  }

  events.push({ minute: 93, type: 'FULLTIME', side: 'A', text: `Full-time: ${teamAName} ${scoreA} - ${scoreB} ${teamBName}` });

  return {
    managerAId: teamAId, managerBId: teamBId, managerAName: teamAName, managerBName: teamBName,
    statsA: { power: statsA.power, avgOvr: statsA.avgOvr, chemistry: statsA.chemistry, tactic: statsA.tactic, formation: statsA.formation },
    statsB: { power: statsB.power, avgOvr: statsB.avgOvr, chemistry: statsB.chemistry, tactic: statsB.tactic, formation: statsB.formation },
    events, scoreA, scoreB
  };
}

// ============================================================================
// Round-robin scheduler + league table.
// ============================================================================

export interface TournamentConfig extends MatchSimConfig {
  doubleRoundRobin: boolean;
  seed?: number;
}

export function defaultTournamentConfig(overrides: Partial<TournamentConfig> = {}): TournamentConfig {
  return { ...defaultMatchSimConfig(), doubleRoundRobin: false, ...overrides };
}

export interface StandingsRow {
  managerId: string;
  managerName: string;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDiff: number;
  points: number;
}

export interface TournamentResult {
  config: TournamentConfig;
  seed: number;
  fixtures: MatchReport[];
  table: StandingsRow[];
}

export function simulateRoundRobin(
  bidders: Bidder[],
  managerFormations: Record<string, string>,
  managerTactics: Record<string, string>,
  configInput: Partial<TournamentConfig> = {}
): TournamentResult {
  const config = defaultTournamentConfig(configInput);
  const masterSeed = config.seed ?? Date.now();

  const pairs: [Bidder, Bidder][] = [];
  for (let i = 0; i < bidders.length; i++) {
    for (let j = i + 1; j < bidders.length; j++) {
      pairs.push([bidders[i], bidders[j]]);
      if (config.doubleRoundRobin) pairs.push([bidders[j], bidders[i]]);
    }
  }

  const fixtures: MatchReport[] = pairs.map(([a, b], idx) => {
    const rng = createSeededRng((masterSeed + idx * 7919) >>> 0);
    const statsA = computeTeamMatchStats(a, b, managerFormations, managerTactics);
    const statsB = computeTeamMatchStats(b, a, managerFormations, managerTactics);
    return simulateMatchTimeline(a.id, a.name, statsA, b.id, b.name, statsB, config, rng);
  });

  const table = new Map<string, StandingsRow>();
  bidders.forEach(b => table.set(b.id, { managerId: b.id, managerName: b.name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 }));

  const headToHead = new Map<string, { for: number; against: number }>(); // key: "A|B"

  fixtures.forEach(m => {
    const rowA = table.get(m.managerAId)!;
    const rowB = table.get(m.managerBId)!;
    rowA.played++; rowB.played++;
    rowA.goalsFor += m.scoreA; rowA.goalsAgainst += m.scoreB;
    rowB.goalsFor += m.scoreB; rowB.goalsAgainst += m.scoreA;

    if (m.scoreA > m.scoreB) { rowA.won++; rowA.points += 3; rowB.lost++; }
    else if (m.scoreB > m.scoreA) { rowB.won++; rowB.points += 3; rowA.lost++; }
    else { rowA.drawn++; rowB.drawn++; rowA.points += 1; rowB.points += 1; }

    const keyAB = `${m.managerAId}|${m.managerBId}`;
    const keyBA = `${m.managerBId}|${m.managerAId}`;
    const hAB = headToHead.get(keyAB) || { for: 0, against: 0 };
    hAB.for += m.scoreA; hAB.against += m.scoreB;
    headToHead.set(keyAB, hAB);
    const hBA = headToHead.get(keyBA) || { for: 0, against: 0 };
    hBA.for += m.scoreB; hBA.against += m.scoreA;
    headToHead.set(keyBA, hBA);
  });

  table.forEach(row => { row.goalDiff = row.goalsFor - row.goalsAgainst; });

  const sorted = [...table.values()].sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points;
    if (r2.goalDiff !== r1.goalDiff) return r2.goalDiff - r1.goalDiff;
    if (r2.goalsFor !== r1.goalsFor) return r2.goalsFor - r1.goalsFor;
    // Final tiebreak: head-to-head goal difference between exactly these two.
    const h1 = headToHead.get(`${r1.managerId}|${r2.managerId}`);
    if (h1) return (h1.against - h1.for); // fewer goals conceded to r2 ranks r1 higher
    return 0;
  });

  return { config, seed: masterSeed, fixtures, table: sorted };
}
