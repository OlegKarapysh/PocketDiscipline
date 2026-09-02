export const CURRENT_USER_ID = 1;
export const CURRENT_USER_NAME = 'Current';
export const DEFAULT_INITIAL_BALANCE = 0;

export interface User {
  id: number;
  name: string;
  balance: number;
  createdAt: number;
  updatedAt: number;
}
