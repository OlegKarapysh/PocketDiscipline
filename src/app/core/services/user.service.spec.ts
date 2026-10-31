import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, from } from 'rxjs';
import { UserService } from './user.service';
import type { DbService } from '../../database/db.service';
import { openEmptyDb } from '../../shared/testing/empty-db';
import type { User } from '../models/user.model';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let db: DbService;

  const existingUser: User = { id: CURRENT_USER_ID, name: 'Current', balance: 500, createdAt: 1000, updatedAt: 1000 };

  const storedUser = () => db.users.get(CURRENT_USER_ID);

  beforeEach(async () => {
    db = await openEmptyDb();
    service = TestBed.inject(UserService);
  });

  describe('user$ live query', () => {
    it('should emit existing user from database', async () => {
      const user: User = { id: CURRENT_USER_ID, name: 'Existing', balance: 1500, createdAt: 1000, updatedAt: 2000 };
      await db.users.add(user);

      expect(await firstValueFrom(from(service.user$))).toEqual(user);
    });

    it('should return default initial user when user is not found in database', async () => {
      const user = await firstValueFrom(from(service.user$));

      expect(user).toEqual(
        expect.objectContaining({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: DEFAULT_INITIAL_BALANCE,
        }),
      );
    });

    it('should emit again when the balance changes', async () => {
      await db.users.add(existingUser);
      const balances: number[] = [];
      const subscription = from(service.user$).subscribe((user) => balances.push(user.balance));
      await vi.waitFor(() => {
        expect(balances).toEqual([500]);
      });

      await service.addBalance(200);

      await vi.waitFor(() => {
        expect(balances).toEqual([500, 700]);
      });
      subscription.unsubscribe();
    });
  });

  describe('addBalance', () => {
    it('should increment existing user balance and update timestamp', async () => {
      await db.users.add(existingUser);

      await service.addBalance(200);

      const user = await storedUser();
      expect(user?.balance).toBe(700);
      expect(user?.updatedAt).toBeGreaterThan(existingUser.updatedAt);
    });

    it('should handle negative amount for undoing rewards', async () => {
      await db.users.add(existingUser);

      await service.addBalance(-200);

      expect((await storedUser())?.balance).toBe(300);
    });

    it('should ignore non-finite amounts to protect balance integrity', async () => {
      await db.users.add(existingUser);

      await service.addBalance(Number.NaN);
      await service.addBalance(Infinity);

      expect(await storedUser()).toEqual(existingUser);
    });

    it('should apply concurrent credits one after another so neither is lost', async () => {
      await db.users.add(existingUser);

      await Promise.all([service.addBalance(100), service.addBalance(200)]);

      expect((await storedUser())?.balance).toBe(800);
    });

    it('should create new user record if user not found in database', async () => {
      await service.addBalance(200);

      expect(await storedUser()).toEqual(
        expect.objectContaining({
          id: CURRENT_USER_ID,
          balance: 200,
        }),
      );
    });
  });

  describe('setUpBalance', () => {
    it('should replace the balance and record when it was set up', async () => {
      await db.users.add(existingUser);

      await service.setUpBalance(12_000);

      expect(await storedUser()).toEqual(
        expect.objectContaining({ balance: 12_000, balanceSetUpAt: expect.any(Number) as number }),
      );
    });

    it('should accept a balance of 0', async () => {
      await db.users.add(existingUser);

      await service.setUpBalance(0);

      expect((await storedUser())?.balance).toBe(0);
    });

    it('should create the user record with the balance if it is missing', async () => {
      await service.setUpBalance(300);

      expect(await storedUser()).toEqual(
        expect.objectContaining({ id: CURRENT_USER_ID, balance: 300, balanceSetUpAt: expect.any(Number) as number }),
      );
    });

    it('should refuse a second setup', async () => {
      await db.users.add({ ...existingUser, balanceSetUpAt: 2000 });

      await expect(service.setUpBalance(12_000)).rejects.toThrow();

      expect((await storedUser())?.balance).toBe(500);
    });

    it('should let only the first of two concurrent setups through', async () => {
      await db.users.add(existingUser);

      const results = await Promise.allSettled([service.setUpBalance(100), service.setUpBalance(200)]);

      expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
      expect((await storedUser())?.balance).toBe(100);
    });

    it('should reject a negative or fractional balance without touching the database', async () => {
      await db.users.add(existingUser);

      for (const amount of [-1, 12.5, Number.NaN]) {
        await expect(service.setUpBalance(amount)).rejects.toThrow();
      }

      expect(await storedUser()).toEqual(existingUser);
    });
  });
});
