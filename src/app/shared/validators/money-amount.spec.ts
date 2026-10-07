import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import { moneyAmount } from './money-amount';

describe('moneyAmount', () => {
  const messagesFor = (amount: number | null): string[] => {
    const priceForm = TestBed.runInInjectionContext(() =>
      form(signal({ price: amount }), (path) => {
        moneyAmount(path.price, 'Price');
      }),
    );
    return priceForm
      .price()
      .errors()
      .map((error) => error.message ?? error.kind);
  };

  it('should accept a whole number of hryvnias from 1 up', () => {
    for (const amount of [1, 2, 99, 1234, 9_999_999]) {
      expect(messagesFor(amount)).toEqual([]);
    }
  });

  it('should require an amount', () => {
    expect(messagesFor(null)).toEqual(['Price is required']);
  });

  it('should reject an amount below 1', () => {
    expect(messagesFor(0)).toEqual(['Price must be at least 1 ₴']);
    expect(messagesFor(-5)).toEqual(['Price must be at least 1 ₴']);
  });

  it('should accept up to 10 000 000 and reject anything larger', () => {
    expect(messagesFor(10_000_000)).toEqual([]);
    for (const amount of [10_000_001, 1e16]) {
      expect(messagesFor(amount)).toEqual(['Price is too large']);
    }
  });

  it('should reject an amount with a fraction of a hryvnia', () => {
    for (const amount of [1.5, 12.01, 99.9]) {
      expect(messagesFor(amount)).toEqual(['Price must be a whole number of hryvnias']);
    }
  });
});
