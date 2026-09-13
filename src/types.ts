export type Position = string;

export type PortraitSource = 'GENERATED' | 'LICENSED_PHOTO' | 'USER_UPLOADED';

export interface Player {
  id: string;
  name: string;
  overall: number;
  position: Position;
  club: string;
  country: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  image?: string;
  /** Present only when a manager has replaced this player's portrait with their own upload. */
  customPortraitAssetId?: string;
}

export interface Bidder {
  id: string;
  name: string;
  isUser: boolean;
  budget: number;
  team: Player[];
  purchasePrices?: Record<string, number>;
}

export interface Bid {
  bidderId: string;
  amount: number;
  timestamp: number;
}

export type GameState = 'LOBBY' | 'AUCTION' | 'SUMMARY';
export type AuctionState = 'IDLE' | 'BIDDING' | 'SOLD' | 'UNSOLD';

export interface AuctionPhase {
  currentPlayerIndex: number;
  state: AuctionState;
  currentBid: number;
  highestBidderId: string | null;
  timeLeft: number;
  history: Bid[];
}
