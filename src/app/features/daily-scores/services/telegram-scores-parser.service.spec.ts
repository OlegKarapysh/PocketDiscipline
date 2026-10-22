import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TelegramScoresParserService } from './telegram-scores-parser.service';

describe('TelegramScoresParserService', () => {
  let parser: TelegramScoresParserService;

  beforeEach(() => {
    parser = TestBed.inject(TelegramScoresParserService);
  });

  const exportOf = (messages: object[]) =>
    JSON.stringify({
      name: 'Daily Scores',
      type: 'personal_chat',
      id: 1,
      messages,
    });

  it('rejects text that is not a Telegram JSON export', () => {
    expect(() => parser.parse('')).toThrow('This is not a Telegram chat export.');
    expect(() => parser.parse('not json')).toThrow('This is not a Telegram chat export.');
    expect(() => parser.parse(JSON.stringify({ name: 'Other' }))).toThrow('This is not a Telegram chat export.');
    expect(() => parser.parse(JSON.stringify({ messages: ['bad'] }))).toThrow('This is not a Telegram chat export.');
  });

  it('rejects an export that contains no 1/10–10/10 score messages', () => {
    const json = exportOf([
      { id: 1, type: 'service', date: '2026-09-01T10:00:00', text: '' },
      { id: 2, type: 'message', date: '2026-09-01T22:00:00', text: 'Hello' },
    ]);

    expect(() => parser.parse(json)).toThrow('No daily scores (1/10–10/10) were found in this export.');
  });

  it('rejects a message with an invalid or missing date', () => {
    const invalidCalendar = exportOf([{ id: 1, type: 'message', date: '2026-02-31T22:00:00', text: '9/10' }]);
    const invalidHours = exportOf([{ id: 1, type: 'message', date: '2026-09-01T25:00:00', text: '9/10' }]);
    const invalidMinutes = exportOf([{ id: 1, type: 'message', date: '2026-09-01T12:60:00', text: '9/10' }]);
    const missingDate = exportOf([{ id: 1, type: 'message', text: '9/10' }]);

    expect(() => parser.parse(invalidCalendar)).toThrow('Invalid message date "2026-02-31T22:00:00" in export.');
    expect(() => parser.parse(invalidHours)).toThrow('Invalid message date "2026-09-01T25:00:00" in export.');
    expect(() => parser.parse(invalidMinutes)).toThrow('Invalid message date "2026-09-01T12:60:00" in export.');
    expect(() => parser.parse(missingDate)).toThrow('Invalid message date "missing" in export.');
  });

  it('accepts messages on daylight saving time transition dates', () => {
    const json = exportOf([{ id: 1, type: 'message', date: '2026-03-29T03:15:00', text: '9/10' }]);

    const result = parser.parse(json);
    expect(result.scores).toEqual([
      { date: '2026-03-29', score: 9, createdAt: new Date(2026, 2, 29, 3, 15, 0).getTime() },
    ]);
  });

  it('parses string and entity-array score messages (1/10–10/10), ignores service/empty messages, and records skipped text', () => {
    const json =
      '\uFEFF' +
      exportOf([
        { id: 1, type: 'service', date: '2026-09-01T10:00:00', text: '' },
        { id: 2, type: 'message', date: '2026-09-01T12:00:00', text: '   ' },
        { id: 3, type: 'message', date: '2026-09-01T22:15:00', text: ' 1/10 ' },
        {
          id: 4,
          type: 'message',
          date: '2026-09-02',
          text: [{ type: 'bold', text: '10' }, '/10'],
        },
        { id: 5, type: 'message', date: '2026-09-03T21:00:00', text: '5/10 (yesterday)' },
        { id: 6, type: 'message', date: '2026-09-04T21:00:00', text: '0/10' },
        { id: 7, type: 'message', date: '2026-09-05T21:00:00', text: '11/10' },
      ]);

    const result = parser.parse(json);

    expect(result.scores).toEqual([
      { date: '2026-09-01', score: 1, createdAt: new Date(2026, 8, 1, 22, 15, 0).getTime() },
      { date: '2026-09-02', score: 10, createdAt: new Date(2026, 8, 2, 12, 0, 0).getTime() },
    ]);
    expect(result.duplicateDates).toBe(0);
    expect(result.skippedMessages).toEqual([
      '2026-09-03: "5/10 (yesterday)"',
      '2026-09-04: "0/10"',
      '2026-09-05: "11/10"',
    ]);
  });

  it('keeps the latest score when multiple messages fall on the same date and counts duplicates', () => {
    const json = exportOf([
      { id: 1, type: 'message', date: '2026-09-01T23:30:00', text: '9/10' },
      { id: 2, type: 'message', date: '2026-09-01T21:00:00', text: '7/10' },
    ]);

    const result = parser.parse(json);

    expect(result.scores).toEqual([
      { date: '2026-09-01', score: 9, createdAt: new Date(2026, 8, 1, 23, 30, 0).getTime() },
    ]);
    expect(result.duplicateDates).toBe(1);
  });

  it('truncates long skipped messages to 40 characters', () => {
    const json = exportOf([
      { id: 1, type: 'message', date: '2026-09-01T22:00:00', text: '9/10' },
      { id: 2, type: 'message', date: '2026-09-02T22:00:00', text: 'x'.repeat(100) },
    ]);

    const result = parser.parse(json);

    expect(result.skippedMessages).toEqual([`2026-09-02: "${'x'.repeat(40)}…"`]);
  });

  it('parses a 400+ message export in under 1 second', () => {
    const base = new Date(2025, 0, 1, 22, 0, 0).getTime();
    const oneDayMs = 86_400_000;
    const messages = Array.from({ length: 450 }, (_, index) => {
      const d = new Date(base + index * oneDayMs);
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return {
        id: index + 1,
        type: 'message',
        date: `${yyyy}-${mm}-${dd}T22:00:00`,
        text: `${String((index % 10) + 1)}/10`,
      };
    });
    const json = exportOf(messages);

    const start = performance.now();
    const result = parser.parse(json);
    const elapsedMs = performance.now() - start;

    expect(result.scores).toHaveLength(450);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
