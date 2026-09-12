export interface CreateWithdrawalDto {
  amount: number;
  title: string;
  categoryId: string;
  notes?: string;
  rewardId?: string | null;
}
