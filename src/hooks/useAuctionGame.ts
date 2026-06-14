import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, Bidder, AuctionPhase, GameState, Bid } from '../types';
import { PLAYERS, INITIAL_BUDGET } from '../data/players';
import { getBotTransferReply, getBotRejectReply } from '../utils/botComments';

const BOT_NAMES = ['Sir Alex', 'Pep', 'Carlo', 'Jurgen Klopp', 'Jose Mourinho'];

function calculateBaseValue(player: Player): number {
  const diff = Math.max(0, player.overall - 70);
  return Math.floor(100_000 + Math.pow(diff, 2.3) * 10_000);
}

function getBotPlayerMultiplier(botId: string, playerId: string) {
  let hash = 0;
  const str = botId + playerId;
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
  
  // Hypothetical new state if they win this player
  counts[genericPos(player.position)]++;

  // FIFA standards logic: 3 GKs ideally, max 4 maybe. Let's say max 4 GKs.
  if (counts.GK > 4) return { allowed: false, reason: 'Max 4 GKs allowed' };
  if (counts.DEF > 10) return { allowed: false, reason: 'Max 10 DEFs allowed' };
  if (counts.MID > 10) return { allowed: false, reason: 'Max 10 MIDs allowed' };
  if (counts.ATT > 8) return { allowed: false, reason: 'Max 8 ATTs allowed' };

  const remainingSlots = 23 - (counts.GK + counts.DEF + counts.MID + counts.ATT);
  
  const minGK = 2; // At least 1 sub GK
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

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
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

  // Main game loop
  useEffect(() => {
    if (gameState !== 'AUCTION' || auctionPhase.state !== 'BIDDING' || isPaused) return;

    const timer = setInterval(() => {
      setAuctionPhase((prev) => {
        if (prev.timeLeft <= 1) {
          // Time up! Player sold or passed.
          return {
            ...prev,
            state: prev.highestBidderId ? 'SOLD' : 'UNSOLD',
            timeLeft: 0
          };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, auctionPhase.state, isPaused]);

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

      // Next player timeout
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
      }, 3000); // 3 seconds to review result

      return () => clearTimeout(to);
    }
  }, [auctionPhase.state, auctionQueue, auctionPhase.currentPlayerIndex, gameState, auctionPhase.highestBidderId, auctionPhase.currentBid, addToast]);

  // Refs for bot logic to avoid constant interval reset
  const phaseRef = useRef(auctionPhase);
  const biddersRef = useRef(bidders);
  const queueRef = useRef(auctionQueue);
  const isPausedRef = useRef(isPaused);
  
  const consecutiveUnsoldRef = useRef(0);

  useEffect(() => {
    phaseRef.current = auctionPhase;
    biddersRef.current = bidders;
    queueRef.current = auctionQueue;
    isPausedRef.current = isPaused;
  }, [auctionPhase, bidders, auctionQueue, isPaused]);

  // Bot logic
  useEffect(() => {
    if (gameState !== 'AUCTION') return;
    
    // Run bot logic randomly
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

  const resetGame = useCallback(() => {
    setGameState('LOBBY');
    setTransactions([]);
    setAuctionQueue([]);
    setBidders(prev => prev.map(b => ({ ...b, team: [], budget: INITIAL_BUDGET })));
    setToasts([]);
    setIsPaused(false);
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
    loadGameFromCloud
  };
}
