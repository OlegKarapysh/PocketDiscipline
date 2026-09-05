export interface WithdrawalRecord {
  id: string;
  amount: number;
  title: string;
  categoryId: string;
  notes?: string;
  date: string;
  timestamp: number;
  rewardId?: string | null;
}
