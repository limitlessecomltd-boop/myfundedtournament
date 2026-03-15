export type TournamentTier   = "starter" | "pro" | "elite";
export type TournamentStatus = "upcoming" | "registration" | "active" | "ended" | "cancelled";
export type EntryStatus      = "pending_payment" | "active" | "breached" | "disqualified" | "completed";
export type ViolationType    = "hft" | "hedge" | "deposit" | "account_change";
export type PayoutStatus     = "pending" | "approved" | "paid" | "rejected";
export type FundedStatus     = "pending_kyc" | "kyc_done" | "funded" | "active" | "suspended" | "closed";

export interface Tournament {
  id: string;
  name: string;
  tier: TournamentTier;
  entry_fee: number;
  max_entries: number;
  max_active_per_trader: number;
  max_total_per_trader: number;
  registration_open: string;
  start_time: string;
  end_time: string;
  status: TournamentStatus;
  prize_pool: number;
  winner_entry_id?: string;
  active_entries: number;
  unique_traders: number;
  created_at: string;
}

export interface Entry {
  id: string;
  tournament_id: string;
  user_id: string;
  entry_number: number;
  mt5_login: string;
  broker: string;
  starting_balance: number;
  current_balance: number;
  current_equity: number;
  profit_abs: number;
  profit_pct: number;
  total_trades: number;
  winning_trades: number;
  excluded_trades: number;
  max_drawdown_pct: number;
  status: EntryStatus;
  locked_at?: string;
  created_at: string;
  // leaderboard extras
  position?: number;
  win_rate?: number;
  display_name?: string;
  username?: string;
}

export interface Trade {
  id: string;
  entry_id: string;
  mt5_ticket: number;
  pair: string;
  side: "buy" | "sell";
  lot_size: number;
  open_price: number;
  close_price?: number;
  open_time: string;
  close_time?: string;
  duration_seconds?: number;
  profit: number;
  swap: number;
  commission: number;
  status: "open" | "closed";
  violation: "hft" | "hedge" | "none";
  excluded: boolean;
}

export interface Payment {
  id: string;
  nowpayments_id: string;
  payment_address: string;
  amount_usd: number;
  currency: string;
  status: string;
  tx_hash?: string;
  confirmed_at?: string;
  paymentUrl?: string;
  expiresAt?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  wallet_address?: string;
  is_admin: boolean;
  total_entries?: number;
  total_tournaments?: number;
  wins?: number;
  created_at: string;
}

export interface FundedAccount {
  id: string;
  entry_id: string;
  user_id: string;
  tournament_id: string;
  account_size: number;
  broker_account?: string;
  broker_name?: string;
  max_drawdown_pct: number;
  daily_drawdown_pct: number;
  trader_split_pct: number;
  status: FundedStatus;
  kyc_verified_at?: string;
  funded_at?: string;
  notes?: string;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  funded_account_id: string;
  user_id: string;
  gross_profit: number;
  trader_amount: number;
  platform_amount: number;
  wallet_address: string;
  currency: string;
  status: PayoutStatus;
  tx_hash?: string;
  notes?: string;
  created_at: string;
  // joined fields
  email?: string;
  username?: string;
  tournament_name?: string;
  account_size?: number;
}

export interface Violation {
  id: string;
  entry_id: string;
  type: ViolationType;
  description: string;
  evidence: Record<string, any>;
  status: string;
  created_at: string;
  // joined
  email?: string;
  username?: string;
  mt5_login?: string;
  entry_number?: number;
  tournament_name?: string;
}
