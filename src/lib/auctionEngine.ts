import { Player, Bidder, Bid } from '../types';

// ============================================================================
// Shared, framework-agnostic auction rules.
// Used by: the live game hook (useAuctionGame), the Fast-Forward auto-agent,
// and the headless Simulation engine below. Keeping valuation, eligibility
// and budget rules in one place is what guarantees Fast-Forward and
// Simulation can never silently diverge from what "real" play would do.
// ============================================================================

export function calculateBaseValue(player: Player): number {
  const diff = Math.max(0, player.overall - 70);
  return Math.floor(100_000 + Math.pow(diff, 2.3) * 10_000);
}

export function getBotPlayerMultiplier(bidderId: string, playerId: string) {
  let hash = 0;
  const str = bidderId + playerId;
  for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  const rand = Math.abs(hash) / 2147483648; // 0 to 1
  if (rand < 0.4) return 0; // 40% chance the bot completely ignores the player
  return 0.8 + rand * 1.5;
}

const genericPos = (pos: string) => {
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'MID';
  if (['CF', 'ST', 'LW', 'RW', 'SS'].includes(pos)) return 'ATT';
  return 'MID';
};

export function canBidOnPlayer(bidderTeam: Player[], player: Player): { allowed: boolean; reason?: string } {
  if (bidderTeam.length >= 23) return { allowed: false, reason: 'Roster Full (23 max)' };

  const counts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  bidderTeam.forEach(p => counts[genericPos(p.position)]++);

  counts[genericPos(player.position)]++;

  if (counts.GK > 4) return { allowed: false, reason: 'Max 4 GKs allowed' };
  if (counts.DEF > 10) return { allowed: false, reason: 'Max 10 DEFs allowed' };
  if (counts.MID > 10) return { allowed: false, reason: 'Max 10 MIDs allowed' };
  if (counts.ATT > 8) return { allowed: false, reason: 'Max 8 ATTs allowed' };

  const remainingSlots = 23 - (counts.GK + counts.DEF + counts.MID + counts.ATT);

  const minGK = 2;
  const minDEF = 5;
  const minMID = 5;
  const minATT = 3;

  const neededGK = Math.max(0, minGK - counts.GK);
  const neededDEF = Math.max(0, minDEF - counts.DEF);
  const neededMID = Math.max(0, minMID - counts.MID);
  const neededATT = Math.max(0, minATT - counts.ATT);

  const totalNeeded = neededGK + neededDEF + neededMID + neededATT;

  if (remainingSlots < totalNeeded) {
    return { allowed: false, reason: 'Must save slots for required positions' };
  }

  return { allowed: true };
}

/** True while a bidder still needs to fill a required position minimum. */
function isUnderPositionMinimum(bidderTeam: Player[], player: Player): boolean {
  const counts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  bidderTeam.forEach(p => counts[genericPos(p.position)]++);
  const mins: Record<string, number> = { GK: 2, DEF: 5, MID: 5, ATT: 3 };
  const group = genericPos(player.position);
  return counts[group] < mins[group];
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — deterministic so Fast-Forward/Simulation runs are
// reproducible and testable, unlike Math.random().
// ---------------------------------------------------------------------------
export interface SeededRng {
  next(): number;
  seed: number;
}

export function createSeededRng(seed?: number): SeededRng {
  const initialSeed = (seed ?? Date.now()) >>> 0;
  let a = initialSeed;
  return {
    seed: initialSeed,
    next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
}

export function seededShuffle<T>(arr: T[], rng: SeededRng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auto-bid decision — shared by the Fast-Forward user-agent and the
// Simulation engine's AI-controlled bidders. Live bots keep their existing
// hash-based multiplier logic in useAuctionGame untouched (no regression
// risk to current game balance); this is the net-new, configurable path.
// ---------------------------------------------------------------------------
export type Strategy = 'CAUTIOUS' | 'BALANCED' | 'AGGRESSIVE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AutoBidProfile {
  strategy: Strategy;
  aggressiveness: number;       // 0.0 - 2.0, multiplies the strategy ceiling
  maxSpendPerLotPct: number;    // 0.0 - 1.0, cap as a fraction of current budget
  reserveFloor: number;         // currency never spent below
  positionPriorityOverride: boolean;
  ignoreChance: number;         // 0.0 - 1.0, chance to sit out a round even if willing (simulation realism only)
}

export function defaultAutoBidProfile(overrides: Partial<AutoBidProfile> = {}): AutoBidProfile {
  return {
    strategy: 'BALANCED',
    aggressiveness: 1.0,
    maxSpendPerLotPct: 0.15,
    reserveFloor: 0,
    positionPriorityOverride: true,
    ignoreChance: 0,
    ...overrides
  };
}

function strategyMultiplier(strategy: Strategy): number {
  switch (strategy) {
    case 'CAUTIOUS': return 1.1;
    case 'AGGRESSIVE': return 2.4;
    case 'BALANCED':
    default: return 1.6;
  }
}

export function difficultyToProfile(difficulty: Difficulty, aggressiveness: number): AutoBidProfile {
  switch (difficulty) {
    case 'EASY':
      return defaultAutoBidProfile({ strategy: 'CAUTIOUS', aggressiveness, ignoreChance: 0.5, maxSpendPerLotPct: 0.10 });
    case 'HARD':
      return defaultAutoBidProfile({ strategy: 'AGGRESSIVE', aggressiveness, ignoreChance: 0.2, maxSpendPerLotPct: 0.25 });
    case 'MEDIUM':
    default:
      return defaultAutoBidProfile({ strategy: 'BALANCED', aggressiveness, ignoreChance: 0.4, maxSpendPerLotPct: 0.15 });
  }
}

interface DecideAutoBidArgs {
  bidder: Bidder;
  player: Player;
  currentBid: number;
  highestBidderId: string | null;
  profile: AutoBidProfile;
  rng?: SeededRng;
}

/**
 * Never bypasses canBidOnPlayer or the bidder's budget — those are the two
 * hard invariants Fast-Forward and Simulation are required to preserve.
 * Returns the next bid amount, or null if this bidder should not act.
 */
export function decideAutoBid({ bidder, player, currentBid, highestBidderId, profile, rng }: DecideAutoBidArgs): number | null {
  if (highestBidderId === bidder.id) return null;

  const check = canBidOnPlayer(bidder.team, player);
  if (!check.allowed) return null;

  if (profile.ignoreChance > 0 && rng && rng.next() < profile.ignoreChance) return null;

  const baseVal = calculateBaseValue(player);
  let ceilingMultiplier = strategyMultiplier(profile.strategy) * profile.aggressiveness;
  if (profile.positionPriorityOverride && isUnderPositionMinimum(bidder.team, player)) {
    ceilingMultiplier *= 1.25;
  }

  const ceiling = Math.min(
    bidder.budget - profile.reserveFloor,
    baseVal * ceilingMultiplier,
    bidder.budget * profile.maxSpendPerLotPct
  );

  if (ceiling <= currentBid) return null;

  const increment = Math.max(500_000, Math.floor(currentBid * 0.05));
  const nextBid = Math.min(currentBid + increment, ceiling, bidder.budget);

  if (nextBid <= currentBid) return null;
  return Math.floor(nextBid);
}

// ---------------------------------------------------------------------------
// Synchronous lot resolution — converges a single lot to a winner without
// wall-clock timers, so it can run instantly (Fast-Forward "INSTANT" speed)
// or thousands of times in a batch simulation. Same valuation/eligibility
// rules as live play; the *shape* of the loop (rounds, not real ticks) is
// necessarily different from live per-second bidding, so bid sequences are
// not expected to be byte-identical to a hypothetical real-time run — the
// game rules they enforce are.
// ---------------------------------------------------------------------------
export interface LotResolution {
  history: Bid[];
  highestBidderId: string | null;
  finalBid: number;
}

const MAX_CONVERGENCE_ROUNDS = 50;

export function resolveLotSync(
  player: Player,
  bidders: Bidder[],
  profiles: Record<string, AutoBidProfile>,
  rng: SeededRng,
  startingBidPct = 0.7
): LotResolution {
  let currentBid = Math.floor(calculateBaseValue(player) * startingBidPct);
  let highestBidderId: string | null = null;
  const history: Bid[] = [];

  for (let round = 0; round < MAX_CONVERGENCE_ROUNDS; round++) {
    const order = seededShuffle(bidders, rng);
    let anyBid = false;

    for (const bidder of order) {
      if (bidder.id === highestBidderId) continue;
      const profile = profiles[bidder.id] ?? defaultAutoBidProfile();
      const amount = decideAutoBid({ bidder, player, currentBid, highestBidderId, profile, rng });
      if (amount != null) {
        currentBid = amount;
        highestBidderId = bidder.id;
        anyBid = true;
        history.unshift({ bidderId: bidder.id, amount, timestamp: round * 1000 });
      }
    }

    if (!anyBid) break;
  }

  return { history, highestBidderId, finalBid: currentBid };
}

// ---------------------------------------------------------------------------
// Headless draft simulation.
// ---------------------------------------------------------------------------
export interface SimulationConfig {
  numBidders: number;
  aiDifficulty: Difficulty;
  biddingAggressiveness: number;
  startingBudget: number;
  poolSize: number;
  seed?: number;
  batchRuns: number;
}

export function defaultSimulationConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    numBidders: 6,
    aiDifficulty: 'MEDIUM',
    biddingAggressiveness: 1.0,
    startingBudget: 200_000_000,
    poolSize: 200,
    batchRuns: 1,
    ...overrides
  };
}

export interface SimulationLotEntry {
  type: 'SOLD' | 'UNSOLD';
  playerId: string;
  playerName: string;
  winnerId?: string;
  amount?: number;
}

export interface SimulationRunReport {
  config: SimulationConfig;
  seed: number;
  bidders: Bidder[];
  log: SimulationLotEntry[];
}

const SIM_BIDDER_NAMES = ['Manager A', 'Manager B', 'Manager C', 'Manager D', 'Manager E', 'Manager F', 'Manager G', 'Manager H'];

export function runDraftSimulation(pool: Player[], config: SimulationConfig): SimulationRunReport {
  const rng = createSeededRng(config.seed);

  const bidders: Bidder[] = Array.from({ length: config.numBidders }, (_, i) => ({
    id: `sim_${i}`,
    name: SIM_BIDDER_NAMES[i] ?? `Manager ${i + 1}`,
    isUser: false,
    budget: config.startingBudget,
    team: [],
    purchasePrices: {}
  }));

  const profile = difficultyToProfile(config.aiDifficulty, config.biddingAggressiveness);
  const profiles: Record<string, AutoBidProfile> = {};
  bidders.forEach(b => { profiles[b.id] = profile; });

  let queue = seededShuffle(pool.slice(0, Math.min(config.poolSize, pool.length)), rng);
  let idx = 0;
  let consecutiveUnsold = 0;
  const log: SimulationLotEntry[] = [];
  let safety = 0;
  const safetyCap = queue.length * 3 + 50; // guards against pathological requeue loops

  while (idx < queue.length && safety < safetyCap) {
    safety++;
    if (bidders.every(b => b.team.length >= 23)) break;

    const player = queue[idx];
    const eligible = bidders.filter(b => b.team.length < 23 && canBidOnPlayer(b.team, player).allowed);

    if (eligible.length === 0) { idx++; continue; }

    const result = resolveLotSync(player, eligible, profiles, rng);

    if (result.highestBidderId) {
      consecutiveUnsold = 0;
      const winner = bidders.find(b => b.id === result.highestBidderId)!;
      winner.budget -= result.finalBid;
      winner.team = [...winner.team, player];
      winner.purchasePrices = { ...(winner.purchasePrices || {}), [player.id]: result.finalBid };
      log.push({ type: 'SOLD', playerId: player.id, playerName: player.name, winnerId: winner.id, amount: result.finalBid });
    } else {
      consecutiveUnsold++;
      const remaining = queue.length - idx - 1;
      log.push({ type: 'UNSOLD', playerId: player.id, playerName: player.name });
      if (consecutiveUnsold <= remaining) {
        queue = [...queue, player];
      } else {
        break;
      }
    }
    idx++;
  }

  return { config, seed: rng.seed, bidders, log };
}

export interface BatchAggregate {
  winRateByBidder: Record<string, number>;
  avgFinalOvrByBidder: Record<string, number>;
  avgSpendByBidder: Record<string, number>;
}

export interface BatchSimulationReport {
  config: SimulationConfig;
  runs: SimulationRunReport[];
  aggregate: BatchAggregate;
}

function avgOvr(team: Player[]): number {
  if (team.length === 0) return 0;
  return team.reduce((s, p) => s + p.overall, 0) / team.length;
}

export function runBatchSimulation(pool: Player[], config: SimulationConfig): BatchSimulationReport {
  const runs: SimulationRunReport[] = [];
  const baseSeed = config.seed ?? Date.now();

  for (let i = 0; i < config.batchRuns; i++) {
    runs.push(runDraftSimulation(pool, { ...config, seed: baseSeed + i }));
  }

  const wins: Record<string, number> = {};
  const ovrSums: Record<string, number> = {};
  const spendSums: Record<string, number> = {};

  runs.forEach(run => {
    const scored = run.bidders.map(b => ({ id: b.id, totalOvr: b.team.reduce((s, p) => s + p.overall, 0), avgOvr: avgOvr(b.team), spend: config.startingBudget - b.budget }));
    const winnerId = [...scored].sort((a, b) => b.totalOvr - a.totalOvr)[0]?.id;
    if (winnerId) wins[winnerId] = (wins[winnerId] || 0) + 1;
    scored.forEach(s => {
      ovrSums[s.id] = (ovrSums[s.id] || 0) + s.avgOvr;
      spendSums[s.id] = (spendSums[s.id] || 0) + s.spend;
    });
  });

  const ids = runs[0]?.bidders.map(b => b.id) ?? [];
  const aggregate: BatchAggregate = { winRateByBidder: {}, avgFinalOvrByBidder: {}, avgSpendByBidder: {} };
  ids.forEach(id => {
    aggregate.winRateByBidder[id] = (wins[id] || 0) / runs.length;
    aggregate.avgFinalOvrByBidder[id] = (ovrSums[id] || 0) / runs.length;
    aggregate.avgSpendByBidder[id] = (spendSums[id] || 0) / runs.length;
  });

  return { config, runs, aggregate };
}

// ---------------------------------------------------------------------------
// Fast-Forward config — the strategy/speed profile drives the "user"
// bidder's own auto-bid decisions specifically, but the speed boost it
// enables (accelerated timers, or the INSTANT drain below) applies to every
// lot, including bot-vs-bot ones, for as long as Fast-Forward stays active.
// ---------------------------------------------------------------------------
export type FastForwardSpeed = '2x' | '4x' | 'INSTANT';

export interface FastForwardConfig {
  strategy: Strategy;
  maxSpendPerLotPct: number;
  reserveFloor: number;
  positionPriorityOverride: boolean;
  speed: FastForwardSpeed;
}

export function defaultFastForwardConfig(overrides: Partial<FastForwardConfig> = {}): FastForwardConfig {
  return {
    strategy: 'BALANCED',
    maxSpendPerLotPct: 0.15,
    reserveFloor: 0,
    positionPriorityOverride: true,
    speed: '2x',
    ...overrides
  };
}

export function fastForwardConfigToProfile(config: FastForwardConfig): AutoBidProfile {
  return defaultAutoBidProfile({
    strategy: config.strategy,
    aggressiveness: 1.0,
    maxSpendPerLotPct: config.maxSpendPerLotPct,
    reserveFloor: config.reserveFloor,
    positionPriorityOverride: config.positionPriorityOverride,
    ignoreChance: 0 // the user opted in explicitly; no simulated hesitation
  });
}

// ---------------------------------------------------------------------------
// Fast-Forward "INSTANT" drain — synchronously resolves the live queue
// without wall-clock timers. Bots reuse the exact live bid formula
// (getBotPlayerMultiplier + the same willingness gate, seeded instead of
// Math.random for determinism); the user bidder goes through decideAutoBid
// with the player's Fast-Forward profile. Never bypasses canBidOnPlayer or
// budget checks. Once the user's own squad is full, decideAutoBid naturally
// stops producing bids for them (canBidOnPlayer fails), but the drain keeps
// resolving remaining lots for every other manager instead of handing back
// to slow real-time bidding — there's nothing left for the user to decide,
// so there's no reason to make them sit through it. Stops only once every
// squad is full or the queue is exhausted.
// ---------------------------------------------------------------------------
function decideLiveBotBid(bot: Bidder, player: Player, currentBid: number, highestBidderId: string | null, rng: SeededRng): number | null {
  if (highestBidderId === bot.id) return null;
  const check = canBidOnPlayer(bot.team, player);
  if (!check.allowed) return null;

  const baseVal = calculateBaseValue(player);
  const multiplier = getBotPlayerMultiplier(bot.id, player.id);
  const botMaxBid = Math.min(bot.budget, baseVal * multiplier);
  if (botMaxBid <= currentBid) return null;

  if (rng.next() <= 0.4) return null; // mirrors live play's `Math.random() > 0.4` willingness gate

  const increment = Math.max(500_000, Math.floor(currentBid * 0.05));
  const nextBid = Math.min(currentBid + increment, bot.budget, botMaxBid);
  if (nextBid <= currentBid) return null;
  return nextBid;
}

export interface InstantDrainResult {
  bidders: Bidder[];
  queue: Player[];
  nextIndex: number;
  log: SimulationLotEntry[];
  stopped: 'QUEUE_EXHAUSTED' | 'ALL_FULL';
}

export function runInstantFastForwardDrain(
  queue: Player[],
  startIndex: number,
  bidders: Bidder[],
  userId: string,
  ffConfig: FastForwardConfig,
  rng: SeededRng
): InstantDrainResult {
  const workingBidders = bidders.map(b => ({ ...b, team: [...b.team], purchasePrices: { ...(b.purchasePrices || {}) } }));
  const log: SimulationLotEntry[] = [];
  const userProfile = fastForwardConfigToProfile(ffConfig);

  // A queue of still-unresolved lots. An unsold lot goes to the back, not
  // dropped — a player nobody wants right now may well sell once other
  // bidders' squads/budgets have moved on. We only stop early once a full
  // lap through everything still pending produces zero sales: that's proof
  // no further progress is possible, not just a run of bad luck.
  const pending: Player[] = queue.slice(startIndex);
  let cyclesSinceLastSale = 0;
  const safetyCap = pending.length * 8 + 500;
  let safety = 0;

  // Once bidding-driven demand genuinely deadlocks (see below), any bidder
  // still short of 23 gets filled from what's left at base value — this
  // never overrides canBidOnPlayer or budget, it only removes the *soft*
  // "doesn't feel like bidding" willingness gate. That gate is a fixed hash
  // of bidder id + player id (not reseeded), so a specific bidder can end up
  // structurally uninterested in this exact pool every single run; without
  // this pass that bidder would finish short by design, not by bad luck.
  const finish = (stopped: InstantDrainResult['stopped']): InstantDrainResult => {
    let progress = true;
    while (progress) {
      progress = false;
      for (const bidder of workingBidders) {
        if (bidder.team.length >= 23) continue;
        const idx = pending.findIndex(p => canBidOnPlayer(bidder.team, p).allowed && bidder.budget >= calculateBaseValue(p));
        if (idx === -1) continue;
        const player = pending[idx];
        const price = calculateBaseValue(player);
        bidder.budget -= price;
        bidder.team = [...bidder.team, player];
        bidder.purchasePrices = { ...(bidder.purchasePrices || {}), [player.id]: price };
        log.push({ type: 'SOLD', playerId: player.id, playerName: player.name, winnerId: bidder.id, amount: price });
        pending.splice(idx, 1);
        progress = true;
      }
    }
    const allFull = workingBidders.every(b => b.team.length >= 23);
    return { bidders: workingBidders, queue: [...queue.slice(0, startIndex), ...pending], nextIndex: startIndex, log, stopped: allFull ? 'ALL_FULL' : stopped };
  };

  while (pending.length > 0 && safety < safetyCap) {
    safety++;

    if (workingBidders.every(b => b.team.length >= 23)) {
      return { bidders: workingBidders, queue: [...queue.slice(0, startIndex), ...pending], nextIndex: startIndex, log, stopped: 'ALL_FULL' };
    }

    const player = pending.shift()!;
    let currentBid = Math.floor(calculateBaseValue(player) * 0.7);
    let highestBidderId: string | null = null;

    for (let round = 0; round < MAX_CONVERGENCE_ROUNDS; round++) {
      const order = seededShuffle(workingBidders, rng);
      let anyBid = false;
      for (const bidder of order) {
        if (bidder.id === highestBidderId) continue;
        const amount = bidder.id === userId
          ? decideAutoBid({ bidder, player, currentBid, highestBidderId, profile: userProfile, rng })
          : decideLiveBotBid(bidder, player, currentBid, highestBidderId, rng);
        if (amount != null) {
          currentBid = amount;
          highestBidderId = bidder.id;
          anyBid = true;
        }
      }
      if (!anyBid) break;
    }

    if (highestBidderId) {
      cyclesSinceLastSale = 0;
      const winner = workingBidders.find(b => b.id === highestBidderId)!;
      winner.budget -= currentBid;
      winner.team = [...winner.team, player];
      winner.purchasePrices = { ...(winner.purchasePrices || {}), [player.id]: currentBid };
      log.push({ type: 'SOLD', playerId: player.id, playerName: player.name, winnerId: winner.id, amount: currentBid });
    } else {
      log.push({ type: 'UNSOLD', playerId: player.id, playerName: player.name });
      pending.push(player);
      cyclesSinceLastSale++;
      // We've now touched more lots than currently remain pending without a
      // single sale anywhere in that stretch — a full lap with zero
      // progress. Nothing has changed (no budget/squad moved), so another
      // lap would just repeat the same outcome forever.
      if (cyclesSinceLastSale > pending.length) {
        return finish('QUEUE_EXHAUSTED');
      }
    }
  }

  return finish('QUEUE_EXHAUSTED');
}
