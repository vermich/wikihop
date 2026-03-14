/**
 * Tests alongside — HistoryItem.tsx (F3-23)
 *
 * Teste le badge "DÉFI" et l'accessibilityLabel conditionnel.
 *
 * Couvre 5 cas :
 *   1. Affiche badge "DÉFI" quand isDailyChallenge === true
 *   2. N'affiche pas le badge quand isDailyChallenge === false
 *   3. N'affiche pas le badge quand isDailyChallenge est absent (undefined)
 *   4. Inclut "Défi du jour." dans accessibilityLabel quand isDailyChallenge === true
 *   5. N'inclut pas "Défi du jour." dans accessibilityLabel quand isDailyChallenge === false
 */

import { render, screen } from '@testing-library/react-native';
import type { GameRecord } from '@wikihop/shared';
import React from 'react';

import { HistoryItem } from '../HistoryItem';

// ─────────────────────────────────────────────────────────────────────────────
// Fixture
// ─────────────────────────────────────────────────────────────────────────────

const baseRecord: GameRecord = {
  id: 'test-id-001',
  startArticle: {
    id: 'tour-eiffel',
    title: 'Tour Eiffel',
    url: 'https://fr.wikipedia.org/wiki/Tour_Eiffel',
    language: 'fr',
  },
  targetArticle: {
    id: 'louvre',
    title: 'Louvre',
    url: 'https://fr.wikipedia.org/wiki/Louvre',
    language: 'fr',
  },
  jumps: 3,
  durationMs: 125000,
  startedAt: '2026-03-10T14:00:00.000Z',
  completedAt: '2026-03-10T14:02:05.000Z',
  status: 'won',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryItem — badge défi du jour (F3-23)', () => {
  it('affiche le badge "DÉFI" quand isDailyChallenge === true', () => {
    const record: GameRecord = { ...baseRecord, isDailyChallenge: true };
    render(<HistoryItem record={record} />);
    expect(screen.getByText('DÉFI')).toBeTruthy();
  });

  it("n'affiche pas le badge quand isDailyChallenge === false", () => {
    const record: GameRecord = { ...baseRecord, isDailyChallenge: false };
    render(<HistoryItem record={record} />);
    expect(screen.queryByText('DÉFI')).toBeNull();
  });

  it("n'affiche pas le badge quand isDailyChallenge est absent (undefined)", () => {
    // baseRecord n'a pas isDailyChallenge
    render(<HistoryItem record={baseRecord} />);
    expect(screen.queryByText('DÉFI')).toBeNull();
  });

  it('inclut "Défi du jour." dans accessibilityLabel quand isDailyChallenge === true', () => {
    const record: GameRecord = { ...baseRecord, isDailyChallenge: true };
    const { getByRole } = render(<HistoryItem record={record} />);
    const button = getByRole('button');
    const label = button.props.accessibilityLabel as string;
    expect(label).toContain('Défi du jour.');
  });

  it("n'inclut pas \"Défi du jour.\" dans accessibilityLabel quand isDailyChallenge === false", () => {
    const record: GameRecord = { ...baseRecord, isDailyChallenge: false };
    const { getByRole } = render(<HistoryItem record={record} />);
    const button = getByRole('button');
    const label = button.props.accessibilityLabel as string;
    expect(label).not.toContain('Défi du jour.');
  });
});
