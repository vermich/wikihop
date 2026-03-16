/**
 * Tests alongside — HistoryItem.tsx (F3-23 + F3-35)
 *
 * Teste le badge défi du jour (F3-23), le badge mode difficile (F3-35)
 * et l'accessibilityLabel conditionnel.
 *
 * Note F3-26 : les badges affichent badgeLabel.toUpperCase() depuis les clés i18n.
 *   - badge_daily = "Défi du jour" → affiché "DÉFI DU JOUR"
 *   - badge_hard = "Difficile" → affiché "DIFFICILE"
 *
 * Couvre 5 cas F3-23 :
 *   1. Affiche badge "DÉFI DU JOUR" quand isDailyChallenge === true
 *   2. N'affiche pas le badge quand isDailyChallenge === false
 *   3. N'affiche pas le badge quand isDailyChallenge est absent (undefined)
 *   4. Inclut "Défi du jour." dans accessibilityLabel quand isDailyChallenge === true
 *   5. N'inclut pas "Défi du jour." dans accessibilityLabel quand isDailyChallenge === false
 *
 * Couvre 6 cas F3-35 :
 *   6. Affiche badge "DIFFICILE" quand difficulty === 'hard'
 *   7. N'affiche pas le badge quand difficulty === undefined
 *   8. N'affiche pas le badge quand difficulty === 'normal'
 *   9. Coexistence : badges "DÉFI DU JOUR" et "DIFFICILE" visibles simultanément
 *  10. accessibilityLabel contient "Difficile." quand difficulty === 'hard'
 *  11. accessibilityLabel ne contient pas "Difficile." quand difficulty === 'normal'
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
// Tests F3-23 — badge défi du jour
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryItem — badge défi du jour (F3-23)', () => {
  it('affiche le badge "DÉFI DU JOUR" quand isDailyChallenge === true', () => {
    // t('history_item.badge_daily') = 'Défi du jour' → .toUpperCase() = 'DÉFI DU JOUR'
    const record: GameRecord = { ...baseRecord, isDailyChallenge: true };
    render(<HistoryItem record={record} />);
    expect(screen.getByText('DÉFI DU JOUR')).toBeTruthy();
  });

  it("n'affiche pas le badge quand isDailyChallenge === false", () => {
    const record: GameRecord = { ...baseRecord, isDailyChallenge: false };
    render(<HistoryItem record={record} />);
    expect(screen.queryByText('DÉFI DU JOUR')).toBeNull();
  });

  it("n'affiche pas le badge quand isDailyChallenge est absent (undefined)", () => {
    // baseRecord n'a pas isDailyChallenge
    render(<HistoryItem record={baseRecord} />);
    expect(screen.queryByText('DÉFI DU JOUR')).toBeNull();
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

// ─────────────────────────────────────────────────────────────────────────────
// Tests F3-35 — badge mode difficile
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryItem — badge DIFF mode difficile (F3-35)', () => {
  it('affiche le badge "DIFFICILE" quand difficulty === "hard"', () => {
    // t('history_item.badge_hard') = 'Difficile' → .toUpperCase() = 'DIFFICILE'
    const record: GameRecord = { ...baseRecord, difficulty: 'hard' };
    render(<HistoryItem record={record} />);
    expect(screen.getByText('DIFFICILE')).toBeTruthy();
  });

  it("n'affiche pas le badge mode difficile quand difficulty est absent (undefined)", () => {
    // baseRecord n'a pas difficulty
    render(<HistoryItem record={baseRecord} />);
    expect(screen.queryByText('DIFFICILE')).toBeNull();
  });

  it("n'affiche pas le badge mode difficile quand difficulty === \"normal\"", () => {
    const record: GameRecord = { ...baseRecord, difficulty: 'normal' };
    render(<HistoryItem record={record} />);
    expect(screen.queryByText('DIFFICILE')).toBeNull();
  });

  it('affiche à la fois les badges "DÉFI DU JOUR" et "DIFFICILE" quand isDailyChallenge === true et difficulty === "hard"', () => {
    const record: GameRecord = { ...baseRecord, isDailyChallenge: true, difficulty: 'hard' };
    render(<HistoryItem record={record} />);
    expect(screen.getByText('DÉFI DU JOUR')).toBeTruthy();
    expect(screen.getByText('DIFFICILE')).toBeTruthy();
  });

  it('inclut "Difficile." dans accessibilityLabel quand difficulty === "hard"', () => {
    // hardBadgeLabel = t('history_item.badge_hard') = 'Difficile'
    const record: GameRecord = { ...baseRecord, difficulty: 'hard' };
    const { getByRole } = render(<HistoryItem record={record} />);
    const button = getByRole('button');
    const label = button.props.accessibilityLabel as string;
    expect(label).toContain('Difficile.');
  });

  it("n'inclut pas \"Difficile.\" dans accessibilityLabel quand difficulty === \"normal\"", () => {
    const record: GameRecord = { ...baseRecord, difficulty: 'normal' };
    const { getByRole } = render(<HistoryItem record={record} />);
    const button = getByRole('button');
    const label = button.props.accessibilityLabel as string;
    expect(label).not.toContain('Difficile.');
  });
});
