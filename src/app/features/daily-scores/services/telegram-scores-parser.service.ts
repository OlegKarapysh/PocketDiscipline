import { Service } from '@angular/core';
import type { TelegramExportParseResult } from '../models/telegram-export-parse-result.model';
import type { TelegramScoreRow } from '../models/telegram-score-row.model';

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/u;
const SCORE_TEXT = /^(?<score>10|[1-9])\/10$/u;
const QUOTED_MAX_LENGTH = 40;

@Service()
export class TelegramScoresParserService {
  parse(text: string): TelegramExportParseResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^\uFEFF/u, ''));
    } catch {
      throw new Error('This is not a Telegram chat export.');
    }

    if (!this.isRecord(parsed) || !Array.isArray(parsed['messages'])) {
      throw new Error('This is not a Telegram chat export.');
    }

    const candidates: TelegramScoreRow[] = [];
    const skippedMessages: string[] = [];

    for (const item of parsed['messages']) {
      if (!this.isRecord(item)) {
        throw new Error('This is not a Telegram chat export.');
      }
      if (item['type'] !== 'message') continue;

      const body = this.extractText(item['text']);
      if (!body) continue;

      const parsedDate = this.parseDate(item['date']);
      const match = SCORE_TEXT.exec(body);

      if (match?.groups?.['score']) {
        candidates.push({
          date: parsedDate.date,
          score: Number(match.groups['score']),
          createdAt: parsedDate.timestamp,
        });
      } else {
        skippedMessages.push(`${parsedDate.date}: ${this.quote(body)}`);
      }
    }

    const byDate = new Map<string, TelegramScoreRow>();
    let duplicateDates = 0;

    for (const row of candidates.sort((a, b) => a.createdAt - b.createdAt)) {
      if (byDate.has(row.date)) duplicateDates++;
      byDate.set(row.date, row);
    }

    if (byDate.size === 0) {
      throw new Error('No daily scores (1/10–10/10) were found in this export.');
    }

    return {
      scores: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
      duplicateDates,
      skippedMessages,
    };
  }

  private extractText(raw: unknown): string {
    if (typeof raw === 'string') {
      return raw.replace(/\s+/gu, ' ').trim();
    }
    if (Array.isArray(raw)) {
      const joined = raw
        .map((part) => {
          if (typeof part === 'string') return part;
          if (this.isRecord(part) && typeof part['text'] === 'string') return part['text'];
          return '';
        })
        .join('');
      return joined.replace(/\s+/gu, ' ').trim();
    }
    return '';
  }

  private parseDate(raw: unknown): { date: string; timestamp: number } {
    const rawStr = typeof raw === 'string' ? raw : '';
    const parts = DATE_TIME.exec(rawStr);
    if (!parts) {
      throw new Error(`Invalid message date ${this.quote(rawStr || 'missing')} in export.`);
    }

    const year = Number(parts[1]);
    const month = Number(parts[2]);
    const day = Number(parts[3]);
    const hours = parts[4] ? Number(parts[4]) : 12;
    const minutes = parts[5] ? Number(parts[5]) : 0;
    const seconds = parts[6] ? Number(parts[6]) : 0;

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      throw new Error(`Invalid message date ${this.quote(rawStr)} in export.`);
    }

    const utc = new Date(Date.UTC(year, month - 1, day));
    if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
      throw new Error(`Invalid message date ${this.quote(rawStr)} in export.`);
    }

    const localDate = new Date(year, month - 1, day, hours, minutes, seconds);

    return {
      date: `${parts[1]}-${parts[2]}-${parts[3]}`,
      timestamp: localDate.getTime(),
    };
  }

  private quote(value: string): string {
    return `"${value.length > QUOTED_MAX_LENGTH ? `${value.slice(0, QUOTED_MAX_LENGTH)}…` : value}"`;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
