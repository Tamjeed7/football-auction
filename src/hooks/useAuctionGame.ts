import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, Bidder, AuctionPhase, GameState } from '../types';
import { PLAYERS, INITIAL_BUDGET } from '../data/players';
import { getBotTransferReply, getBotRejectReply } from '../utils/botComments';
import {
  calculateBaseValue,
  canBidOnPlayer,
  getBotPlayerMultiplier,
  createSeededRng,
  decideAutoBid,
  fastForwardConfigToProfile,
  runInstantFastForwardDrain,
  defaultFastForwardConfig,
  FastForwardConfig
} from '../lib/auctionEngine';

export { canBidOnPlayer };

const BOT_NAMES = ['Sir Alex', 'Pep', 'Carlo', 'Jurgen Klopp', 'Jose Mourinho'];

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface FastForwardActivityEntry {
  id: string;
  playerName: string;
  amount: number;
  timestamp: number;
}

export function useAuctionGame() {
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [startingBudget, setStartingBudget] = useState(INITIAL_BUDGET);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);


  const [bidders, setBidders] = useState<Bidder[]>(() => [
    { id: 'user', name: localStorage.getItem('app-manager-name') || 'My Club', isUser: true, budget: INITIAL_BUDGET, team: [] },
    ...BOT_NAMES.map((name, i) => ({ id: `bot_${i}`, name, isUser: false, budget: INITIAL_BUDGET, team: [] }))
  ]);

  const updateManagerName = useCallback((name: string) => {
    setBidders(prev => prev.map(b => b.id === 'user' ? { ...b, name } : b));
  }, []);

  // Portraits may only be changed on players in the user's own squad — this
  // is enforced here, not just by hiding the edit affordance in the UI, so
  // no caller can update another manager's player by mistake.
  const setPlayerPortrait = useCallback((playerId: string, assetId: string | null) => {
    setBidders(prev => prev.map(b => {
      if (!b.isUser) return b;
      if (!b.team.some(p => p.id === playerId)) return b;
      return {
        ...b,
        team: b.team.map(p => p.id === playerId ? { ...p, customPortraitAssetId: assetId ?? undefined } : p)
      };
    }));
  }, []);

  const [auctionQueue, setAuctionQueue] = useState<Player[]>([]);

  const [auctionPhase, setAuctionPhase] = useState<AuctionPhase>({
    currentPlayerIndex: 0,
    state: 'IDLE',
    currentBid: 0,
    highestBidderId: null,
    timeLeft: 10,
    history: []
  });

  const [isPaused, setIsPaused] = useState(false);
  const togglePause = useCallback(() => setIsPaused(p => !p), []);

  // ---------------------------------------------------------------------
  // Fast-Forward: an opt-in auto-agent that bids on the user's behalf.
  // Never bypasses canBidOnPlayer/budget checks (enforced by placeBid and
  // by decideAutoBid/runInstantFastForwardDrain in the shared engine).
  // ---------------------------------------------------------------------
  const [fastForward, setFastForward] = useState<{ active: boolean; config: FastForwardConfig }>({
    active: false,
    config: defaultFastForwardConfig()
  });
  const [ffActivityLog, setFfActivityLog] = useState<FastForwardActivityEntry[]>([]);

  const pushFfActivity = useCallback((entries: { playerName: string; amount: number }[]) => {
    if (entries.length === 0) return;
    setFfActivityLog(prev => {
      const next = [
        ...entries.map(e => ({ id: Date.now().toString() + Math.random(), playerName: e.playerName, amount: e.amount, timestamp: Date.now() })),
        ...prev
      ];
      return next.slice(0, 5);
    });
  }, []);

  const startFastForward = useCallback((config: FastForwardConfig) => {
    setFfActivityLog([]);
    setFastForward({ active: true, config });
  }, []);

  const stopFastForward = useCallback(() => {
    setFastForward(prev => ({ ...prev, active: false }));
  }, []);

  // Start the game
  const startGame = useCallback((budget: number) => {
    // Shuffle players
    const shuffled = [...PLAYERS].sort(() => 0.5 - Math.random());
    setAuctionQueue(shuffled);

    // Reset bidders
    setBidders([
      { id: 'user', name: localStorage.getItem('app-manager-name') || 'My Club', isUser: true, budget, team: [] },
      ...BOT_NAMES.map((name, i) => ({ id: `bot_${i}`, name, isUser: false, budget, team: [] }))
    ]);

    setGameState('AUCTION');
    setStartingBudget(budget);
    setFastForward({ active: false, config: defaultFastForwardConfig() });
    setFfActivityLog([]);

    setAuctionPhase({
      currentPlayerIndex: 0,
      state: 'BIDDING',
      currentBid: Math.floor(calculateBaseValue(shuffled[0]) * 0.7),
      highestBidderId: null,
      timeLeft: 10,
      history: []
    });
  }, []);

  const placeBid = useCallback((bidderId: string, amount: number) => {
    setAuctionPhase((prev) => {
      // If there's already a bid, new bid must be strictly greater. Otherwise, it must be at least the starting bid.
      if (prev.state !== 'BIDDING') return prev;
      if (prev.highestBidderId !== null && amount <= prev.currentBid) return prev;
      if (prev.highestBidderId === null && amount < prev.currentBid) return prev;

      const currentBidders = biddersRef.current;
      const bidder = currentBidders.find(b => b.id === bidderId);
      if (!bidder || bidder.budget < amount || bidder.team.length >= 23) return prev; // Cannot afford or full team

      // If user was highest bidder and someone else outbid them, show a toast
      if (prev.highestBidderId === 'user' && bidderId !== 'user') {
        addToast(`You are outbid by ${bidder.name}!`, 'warning');
      }

      return {
        ...prev,
        currentBid: amount,
        highestBidderId: bidderId,
        timeLeft: Math.min(prev.timeLeft + 3, 10), // reset/add time when bid placed
        history: [{ bidderId, amount, timestamp: Date.now() }, ...prev.history],
      };
    });
  }, [addToast]);

  // Refs for bot/FF logic to avoid constant interval reset
  const phaseRef = useRef(auctionPhase);
  const biddersRef = useRef(bidders);
  const queueRef = useRef(auctionQueue);
  const isPausedRef = useRef(isPaused);
  const fastForwardRef = useRef(fastForward);

  const consecutiveUnsoldRef = useRef(0);

  useEffect(() => {
    phaseRef.current = auctionPhase;
    biddersRef.current = bidders;
    queueRef.current = auctionQueue;
    isPausedRef.current = isPaused;
    fastForwardRef.current = fastForward;
  }, [auctionPhase, bidders, auctionQueue, isPaused, fastForward]);

  // Main countdown loop. Fast-Forward accelerates the tick by decrementing
  // timeLeft faster instead of shortening the wall-clock interval itself
  // (keeps the loop stable and testable rather than fighting setInterval's
  // minimum granularity).
  useEffect(() => {
    if (gameState !== 'AUCTION' || auctionPhase.state !== 'BIDDING' || isPaused) return;

    const decrementBy = !fastForward.active ? 1
      : fastForward.config.speed === 'INSTANT' ? 999
      : fastForward.config.speed === '4x' ? 4
      : 2;

    const timer = setInterval(() => {
      setAuctionPhase((prev) => {
        if (prev.timeLeft <= decrementBy) {
          // Time up! Player sold or passed.
          return {
            ...prev,
            state: prev.highestBidderId ? 'SOLD' : 'UNSOLD',
            timeLeft: 0
          };
        }
        return { ...prev, timeLeft: prev.timeLeft - decrementBy };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, auctionPhase.state, isPaused, fastForward.active, fastForward.config.speed]);

  // Handle sold / passed resolution
  useEffect(() => {
    if (gameState !== 'AUCTION') return;

    if (auctionPhase.state === 'SOLD' || auctionPhase.state === 'UNSOLD') {
      const currentPlayer = auctionQueue[auctionPhase.currentPlayerIndex];

      if (auctionPhase.state === 'SOLD' && auctionPhase.highestBidderId) {
        consecutiveUnsoldRef.current = 0;

        const winner = biddersRef.current.find(b => b.id === auctionPhase.highestBidderId);
        if (winner) {
          if (winner.isUser) {
            addToast(`You signed ${currentPlayer.name}!`, 'success');
            if (fastForwardRef.current.active) {
              pushFfActivity([{ playerName: currentPlayer.name, amount: auctionPhase.currentBid }]);
            }
          } else {
             addToast(`${currentPlayer.name} sold to ${winner.name}`, 'info');
          }
        }

        setBidders((prev) => {
          return prev.map(b => {
            if (b.id === auctionPhase.highestBidderId) {
              return {
                ...b,
                budget: b.budget - auctionPhase.currentBid,
                team: [...b.team, currentPlayer],
                purchasePrices: { ...(b.purchasePrices || {}), [currentPlayer.id]: auctionPhase.currentBid }
              };
            }
            return b;
          });
        });
      } else {
        consecutiveUnsoldRef.current += 1;
        addToast(`${currentPlayer.name} went unsold. Re-adding to pool.`, 'info');
      }

      // Next player timeout — Fast-Forward shortens the review pause.
      const reviewDelay = !fastForward.active ? 3000
        : fastForward.config.speed === 'INSTANT' ? 250
        : fastForward.config.speed === '4x' ? 750
        : 1500;

      const to = setTimeout(() => {
        let newQueue = queueRef.current;

        if (auctionPhase.state === 'UNSOLD') {
          const remainingBeforeReadd = queueRef.current.length - (auctionPhase.currentPlayerIndex + 1);
          if (consecutiveUnsoldRef.current <= remainingBeforeReadd) {
            newQueue = [...queueRef.current, currentPlayer];
            setAuctionQueue(newQueue);
          }
        }

        const currentBidders = biddersRef.current;
        const allFull = currentBidders.every(b => b.team.length >= 23);
        const remaining = newQueue.length - (auctionPhase.currentPlayerIndex + 1);

        // Deliberately no "stop Fast-Forward once the user's squad is full"
        // check here: once canBidOnPlayer fails for the user, decideAutoBid
        // naturally stops producing bids for them on its own — Fast-Forward
        // stays active and keeps accelerating the remaining bot-only lots
        // instead of dropping the rest of the draft back to real-time speed.

        if (auctionPhase.currentPlayerIndex + 1 >= newQueue.length || allFull || consecutiveUnsoldRef.current > remaining) {
          setGameState('SUMMARY');
        } else {
          const nextPlayer = newQueue[auctionPhase.currentPlayerIndex + 1];
          setAuctionPhase({
            currentPlayerIndex: auctionPhase.currentPlayerIndex + 1,
            state: 'BIDDING',
            currentBid: Math.floor(calculateBaseValue(nextPlayer) * 0.7),
            highestBidderId: null,
            timeLeft: 10,
            history: []
          });
        }
      }, reviewDelay);

      return () => clearTimeout(to);
    }
  }, [auctionPhase.state, auctionQueue, auctionPhase.currentPlayerIndex, gameState, auctionPhase.highestBidderId, auctionPhase.currentBid, addToast, fastForward.active, fastForward.config, pushFfActivity]);

  // Bot logic (unchanged from live play — Fast-Forward and Simulation never
  // alter how the built-in bots decide to bid; only the user's own slot and,
  // in Simulation mode, a fully separate headless engine are new).
  useEffect(() => {
    if (gameState !== 'AUCTION') return;

    const botTimer = setInterval(() => {
      const currentPhase = phaseRef.current;
      const currentBidders = biddersRef.current;
      const currentQueue = queueRef.current;
      const currentIsPaused = isPausedRef.current;

      if (currentPhase.state !== 'BIDDING' || currentIsPaused) return;

      const currentPlayer = currentQueue[currentPhase.currentPlayerIndex];
      if (!currentPlayer) return;

      const baseVal = calculateBaseValue(currentPlayer);

      currentBidders.forEach((bot) => {
        if (bot.isUser) return;
        if (currentPhase.highestBidderId === bot.id) return; // already winning

        const bidCheck = canBidOnPlayer(bot.team, currentPlayer);
        if (!bidCheck.allowed) return; // Formation constraint prevents bot from bidding

        const randomFactor = getBotPlayerMultiplier(bot.id, currentPlayer.id);
        const botMaxBid = Math.min(bot.budget, baseVal * randomFactor);

        // Want to bid if max is greater than current bid
        if (botMaxBid > currentPhase.currentBid) {
          // Add some randomness so bots don't all bid instantly
          if (Math.random() > 0.4) {
            const increment = Math.max(500_000, Math.floor(currentPhase.currentBid * 0.05));
            let nextBid = currentPhase.currentBid + increment;

            // Limit to budget constraint
            nextBid = Math.min(nextBid, bot.budget);
            if (nextBid > currentPhase.currentBid) {
                 placeBid(bot.id, nextBid);
            }
          }
        }
      });
    }, 1500);

    return () => clearInterval(botTimer);
  }, [gameState, placeBid]);

  // Fast-Forward user auto-bid (2x / 4x). INSTANT speed is handled by the
  // synchronous drain effect below instead, since at that speed there is no
  // per-tick window worth reacting on.
  useEffect(() => {
    if (gameState !== 'AUCTION' || !fastForward.active) return;

    const ffTimer = setInterval(() => {
      const phase = phaseRef.current;
      if (phase.state !== 'BIDDING' || isPausedRef.current) return;

      const player = queueRef.current[phase.currentPlayerIndex];
      const user = biddersRef.current.find(b => b.id === 'user');
      if (!player || !user) return;

      const profile = fastForwardConfigToProfile(fastForwardRef.current.config);
      const amount = decideAutoBid({
        bidder: user,
        player,
        currentBid: phase.currentBid,
        highestBidderId: phase.highestBidderId,
        profile
      });

      if (amount != null) {
        placeBid('user', amount);
      }
    }, 900);

    return () => clearInterval(ffTimer);
  }, [gameState, fastForward.active, placeBid]);

  // Fast-Forward INSTANT: synchronously drain the queue the moment a fresh
  // lot begins (no bids placed yet), bypassing wall-clock timers entirely.
  useEffect(() => {
    if (gameState !== 'AUCTION' || !fastForward.active || fastForward.config.speed !== 'INSTANT') return;
    if (auctionPhase.state !== 'BIDDING' || auctionPhase.highestBidderId !== null || isPaused) return;

    const rng = createSeededRng();
    const result = runInstantFastForwardDrain(auctionQueue, auctionPhase.currentPlayerIndex, bidders, 'user', fastForward.config, rng);

    setAuctionQueue(result.queue);
    setBidders(result.bidders);

    const wonEntries = result.log
      .filter(l => l.type === 'SOLD' && l.winnerId === 'user')
      .map(l => ({ playerName: l.playerName, amount: l.amount || 0 }));
    pushFfActivity(wonEntries);

    // The drain now only stops once every squad is full or the queue is
    // exhausted — either way the draft itself has concluded, not just the
    // user's part in it.
    setFastForward(prev => ({ ...prev, active: false }));
    setGameState('SUMMARY');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, fastForward.active, fastForward.config, auctionPhase.state, auctionPhase.highestBidderId, isPaused]);

  const resetGame = useCallback(() => {
    setGameState('LOBBY');
    setTransactions([]);
    setAuctionQueue([]);
    setBidders(prev => prev.map(b => ({ ...b, team: [], budget: INITIAL_BUDGET })));
    setToasts([]);
    setIsPaused(false);
    setFastForward({ active: false, config: defaultFastForwardConfig() });
    setFfActivityLog([]);
  }, []);

  const [transactions, setTransactions] = useState<any[]>([]);

  const handleTransfer = useCallback((
    type: 'BUY' | 'SELL' | 'SWAP',
    manager1Id: string,
    manager2Id: string,
    amount: number = 0,
    m1PlayerId?: string,
    m2PlayerId?: string,
    m1Comment?: string
  ) => {
    // Avoid state callback mutation
    let newTransaction: any = null;
    let rejectMsg: string | null = null;

    setBidders(prev => {
      const manager1 = prev.find(b => b.id === manager1Id);
      const manager2 = prev.find(b => b.id === manager2Id);
      if (!manager1 || !manager2 || manager1Id === manager2Id) return prev;

      let nextPrev = [...prev];
      const m1Index = nextPrev.findIndex(b => b.id === manager1Id);
      const m2Index = nextPrev.findIndex(b => b.id === manager2Id);
      let nextM1 = { ...manager1, team: [...manager1.team] };
      let nextM2 = { ...manager2, team: [...manager2.team] };

      let m2Comment = '';

      if (type === 'BUY' && m2PlayerId) {
        const p = nextM2.team.find(p => p.id === m2PlayerId);
        if (p && nextM1.budget >= amount && nextM1.team.length < 23) {
          const val = manager2.isUser ? 0 : calculateBaseValue(p) * getBotPlayerMultiplier(manager2Id, p.id);
          if (amount >= val) {
            nextM1.budget -= amount;
            nextM1.team.push(p);
            nextM1.purchasePrices = { ...(nextM1.purchasePrices || {}), [p.id]: amount };
            nextM2.budget += amount;
            nextM2.team = nextM2.team.filter(x => x.id !== p.id);
            if (!manager2.isUser) m2Comment = getBotTransferReply(manager2.name, 'BUY', p.name, null, manager1.name);
            newTransaction = { id: Date.now().toString(), type, fromTeam: nextM2.name, toTeam: nextM1.name, playerIn: p, amount, timestamp: Date.now(), m1Comment, m2Comment };
          } else if (!manager2.isUser) rejectMsg = getBotRejectReply(manager2.name);
        }
      } else if (type === 'SELL' && m1PlayerId) {
        const p = nextM1.team.find(p => p.id === m1PlayerId);
        if (p && nextM2.budget >= amount && nextM2.team.length < 23) {
          const val = manager2.isUser ? Infinity : calculateBaseValue(p) * getBotPlayerMultiplier(manager2Id, p.id);
          if (val >= amount || manager2.isUser) {
             nextM2.budget -= amount;
             nextM2.team.push(p);
             nextM2.purchasePrices = { ...(nextM2.purchasePrices || {}), [p.id]: amount };
             nextM1.budget += amount;
             nextM1.team = nextM1.team.filter(x => x.id !== p.id);
             if (!manager2.isUser) m2Comment = getBotTransferReply(manager2.name, 'SELL', null, p.name, manager1.name);
             newTransaction = { id: Date.now().toString(), type, fromTeam: nextM1.name, toTeam: nextM2.name, playerOut: p, amount, timestamp: Date.now(), m1Comment, m2Comment };
          } else if (!manager2.isUser) rejectMsg = getBotRejectReply(manager2.name);
        }
      } else if (type === 'SWAP' && m1PlayerId && m2PlayerId) {
        const p1 = nextM1.team.find(p => p.id === m1PlayerId);
        const p2 = nextM2.team.find(p => p.id === m2PlayerId);
        if (p1 && p2) {
          const m2P1Val = manager2.isUser ? Infinity : calculateBaseValue(p1) * getBotPlayerMultiplier(manager2Id, p1.id);
          const m2P2Val = manager2.isUser ? 0 : calculateBaseValue(p2) * getBotPlayerMultiplier(manager2Id, p2.id);
          if (m2P1Val >= m2P2Val || manager2.isUser) {
             nextM1.team = nextM1.team.filter(x => x.id !== p1.id);
             nextM1.team.push(p2);
             nextM2.team = nextM2.team.filter(x => x.id !== p2.id);
             nextM2.team.push(p1);
             if (!manager2.isUser) m2Comment = getBotTransferReply(manager2.name, 'SWAP', null, p1.name, manager1.name);
             newTransaction = { id: Date.now().toString(), type, fromTeam: nextM1.name, toTeam: nextM2.name, playerIn: p2, playerOut: p1, amount: 0, timestamp: Date.now(), m1Comment, m2Comment };
          } else if (!manager2.isUser) rejectMsg = getBotRejectReply(manager2.name);
        }
      }

      if (newTransaction) {
        nextPrev[m1Index] = nextM1;
        nextPrev[m2Index] = nextM2;

        // Push transaction via timeout to avoid state update during render
        setTimeout(() => {
          setTransactions(t => [newTransaction, ...t]);
          addToast(`Transfer successful!`, 'success');
          if (m1Comment) {
            setTimeout(() => addToast(`${manager1.name}: "${m1Comment}"`, 'info'), 500);
          }
          if (m2Comment) {
            setTimeout(() => addToast(`${manager2.name}: "${m2Comment}"`, 'info'), m1Comment ? 1500 : 500);
          }
        }, 0);
        return nextPrev;
      }

      if (rejectMsg) setTimeout(() => addToast(`${manager2.name}: "${rejectMsg}"`, 'error'), 0);
      else setTimeout(() => addToast(`Transfer rejected. Requirements not met.`, 'error'), 0);

      return prev;
    });

    return true;
  }, [addToast]);

  // Firebase Saving/Loading
  const saveGameToCloud = useCallback(async (userId: string) => {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'games', userId), {
        userId,
        gameState,
        startingBudget,
        auctionQueue: JSON.stringify(auctionQueue),
        bidders: JSON.stringify(bidders),
        transactions: JSON.stringify(transactions),
        auctionPhase: JSON.stringify(auctionPhase),
        isPaused,
        updatedAt: serverTimestamp()
      });
      addToast('Game saved to cloud!', 'success');
    } catch (e: any) {
      console.error(e);
      addToast('Failed to save game.', 'error');
    }
  }, [gameState, startingBudget, auctionQueue, bidders, transactions, auctionPhase, isPaused, addToast]);

  const loadGameFromCloud = useCallback(async (userId: string) => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const docSnap = await getDoc(doc(db, 'games', userId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState(data.gameState || 'LOBBY');
        setStartingBudget(data.startingBudget || INITIAL_BUDGET);
        if (data.auctionQueue) setAuctionQueue(JSON.parse(data.auctionQueue));
        if (data.bidders) setBidders(JSON.parse(data.bidders));
        if (data.transactions) setTransactions(JSON.parse(data.transactions));
        if (data.auctionPhase) setAuctionPhase(JSON.parse(data.auctionPhase));
        if (data.isPaused) setIsPaused(data.isPaused);
        addToast('Game loaded successfully!', 'success');
      } else {
        addToast('No saved game found.', 'info');
      }
    } catch (e: any) {
      console.error(e);
      addToast('Failed to load game.', 'error');
    }
  }, [addToast]);

  return {
    gameState,
    bidders,
    auctionQueue,
    auctionPhase,
    isPaused,
    togglePause,
    startGame,
    placeBid,
    resetGame,
    transactions,
    handleTransfer,
    toasts,
    removeToast,
    updateManagerName,
    saveGameToCloud,
    loadGameFromCloud,
    fastForward,
    ffActivityLog,
    startFastForward,
    stopFastForward,
    setPlayerPortrait,
    addToast
  };
}
