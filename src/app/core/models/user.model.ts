export const CURRENT_USER_ID = 1;
export const CURRENT_USER_NAME = 'Current';
export const DEFAULT_INITIAL_BALANCE = 0;

export interface User {
  id: number;
  name: string;
  balance: number;
  // Absent until the balance is set up in Settings, which can be done once per database.
  balanceSetUpAt?: number;
  createdAt: number;
  updatedAt: number;
}
