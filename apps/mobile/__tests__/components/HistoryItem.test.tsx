/**
 * Tests — HistoryItem.tsx (F3-26)
 *
 * Vérifie la résolution correcte du pluriel i18n pour les sauts.
 * Le bug F3-26 (clé 'history_item.jumps_one' au lieu de 'history_item.jumps')
 * produisait toujours "saut" au singulier quel que soit le count.
 */

import { render } from '@testing-library/react-native';
import type { GameRecord } from '@wikihop/shared';
import React from 'react';

import { HistoryItem } from '../../src/components/history/HistoryItem';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const BASE_RECORD: GameRecord = {
  id: 'test-1',
  startArticle: { id: '1', title: 'Paris', url: 'https://fr.wikipedia.org/wiki/Paris', language: 'fr' },
  targetArticle: { id: '2', title: 'Rome', url: 'https://fr.wikipedia.org/wiki/Rome', language: 'fr' },
  jumps: 1,
  durationMs: 30000,
  status: 'won',
  startedAt: '2026-03-16T09:59:30.000Z',
  completedAt: '2026-03-16T10:00:00.000Z',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryItem — pluriel i18n', () => {
  it('affiche "1 saut" au singulier (count = 1)', () => {
    const record: GameRecord = { ...BASE_RECORD, jumps: 1 };
    const { getByText } = render(<HistoryItem record={record} />);
    // Le texte affiché : "1 saut · 0:30"
    expect(getByText(/1 saut ·/)).toBeTruthy();
  });

  it('affiche "3 sauts" au pluriel (count = 3)', () => {
    const record: GameRecord = { ...BASE_RECORD, jumps: 3 };
    const { getByText } = render(<HistoryItem record={record} />);
    // Le texte affiché : "3 sauts · 0:30"
    expect(getByText(/3 sauts ·/)).toBeTruthy();
  });

  it("l'accessibilityLabel contient le pluriel correct (count = 5)", () => {
    const record: GameRecord = { ...BASE_RECORD, jumps: 5 };
    const { getByRole } = render(<HistoryItem record={record} />);
    const item = getByRole('button');
    expect(item.props.accessibilityLabel).toContain('5 sauts');
    expect(item.props.accessibilityLabel).not.toContain('5 saut ');
  });

  it("l'accessibilityLabel contient le singulier correct (count = 1)", () => {
    const record: GameRecord = { ...BASE_RECORD, jumps: 1 };
    const { getByRole } = render(<HistoryItem record={record} />);
    const item = getByRole('button');
    expect(item.props.accessibilityLabel).toContain('1 saut');
    expect(item.props.accessibilityLabel).not.toContain('1 sauts');
  });
});
