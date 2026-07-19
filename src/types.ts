export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  userId: string;
  balance: number;
  totalDeposits: number;
  todayProfit: number;
  availableBalance: number;
  frozenBalance: number;
  referralCode: string;
  referralLink: string;
  inviteCodeUsed?: string;
  createdAt: string;
  vipPlanId?: string | null;
  vipPlanSubscribedAt?: string | null;
}

export interface Transaction {
  id: string;
  uid: string;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out' | 'vip_subscribe';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  addressOrRecipient?: string;
  network?: string;
}

export interface CoinData {
  name: string;
  symbol: string;
  price: number;
  change: string;
  color: string;
  sparkline: number[];
}

export interface VipPlan {
  id: string;
  deposit: number;
  dailyProfit: number;
  monthlyProfit: number;
  isHot: boolean;
}

export interface PriceAlert {
  id: string;
  uid: string;
  coin: string;
  targetPrice: number;
  condition: 'above' | 'below';
  createdAt: string;
  triggered: boolean;
}
