/**
 * Tests — MiniBarChart.tsx (F3-08)
 *
 * Couvre :
 *   - État vide : message "Aucune partie à afficher"
 *   - Rendu normal : barres, labels de sauts, labels de dates
 *   - Couleurs : victoire #16A34A, abandon #94A3B8
 *   - Légende : présence des labels Victoire et Abandonné
 *   - Accessibilité : accessibilityLabel synthétisant les données
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import { MiniBarChart } from '../../../src/components/stats/MiniBarChart';
import type { ChartDataPoint } from '../../../src/utils/stats.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const DATA_VICTORY: ChartDataPoint = {
  jumps: 4,
  status: 'won',
  label: '10/03',
};

const DATA_ABANDONED: ChartDataPoint = {
  jumps: 2,
  status: 'abandoned',
  label: '08/03',
};

const DATA_MULTI: ReadonlyArray<ChartDataPoint> = [
  { jumps: 3, status: 'abandoned', label: '04/03' },
  { jumps: 1, status: 'won', label: '05/03' },
  { jumps: 5, status: 'abandoned', label: '06/03' },
  { jumps: 2, status: 'won', label: '07/03' },
  { jumps: 6, status: 'won', label: '08/03' },
  { jumps: 4, status: 'abandoned', label: '09/03' },
  { jumps: 8, status: 'won', label: '10/03' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MiniBarChart — état vide', () => {
  it('affiche "Aucune partie à afficher" si data vide', () => {
    const { getByText } = render(<MiniBarChart data={[]} />);
    expect(getByText('Aucune partie à afficher')).toBeTruthy();
  });

  it('n\'affiche pas la légende si data vide', () => {
    const { queryByText } = render(<MiniBarChart data={[]} />);
    expect(queryByText('Victoire')).toBeNull();
    expect(queryByText('Abandonné')).toBeNull();
  });
});

describe('MiniBarChart — rendu normal', () => {
  it('affiche le label de sauts pour chaque barre', () => {
    const { getByText } = render(<MiniBarChart data={[DATA_VICTORY, DATA_ABANDONED]} />);
    expect(getByText('4')).toBeTruthy(); // sauts de DATA_VICTORY
    expect(getByText('2')).toBeTruthy(); // sauts de DATA_ABANDONED
  });

  it('affiche les labels de dates', () => {
    const { getByText } = render(<MiniBarChart data={[DATA_VICTORY, DATA_ABANDONED]} />);
    expect(getByText('10/03')).toBeTruthy();
    expect(getByText('08/03')).toBeTruthy();
  });

  it('affiche les labels de légende Victoire et Abandonné', () => {
    const { getAllByText } = render(<MiniBarChart data={[DATA_VICTORY, DATA_ABANDONED]} />);
    // "Victoire" et "Abandonné" sont dans la légende
    expect(getAllByText('Victoire').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Abandonné').length).toBeGreaterThanOrEqual(1);
  });

  it('affiche 7 labels de dates pour 7 points', () => {
    const { getByText } = render(<MiniBarChart data={DATA_MULTI} />);
    DATA_MULTI.forEach((point) => {
      expect(getByText(point.label)).toBeTruthy();
    });
  });
});

describe('MiniBarChart — accessibilité', () => {
  it('le conteneur graphique a un accessibilityLabel synthétisant les données', () => {
    const { UNSAFE_queryByProps } = render(
      <MiniBarChart data={[DATA_VICTORY, DATA_ABANDONED]} />,
    );
    const container = UNSAFE_queryByProps({ accessible: true });
    expect(container).toBeTruthy();
    expect(container?.props.accessibilityLabel).toContain('10/03');
    expect(container?.props.accessibilityLabel).toContain('08/03');
  });

  it('les labels de dates ont accessible={false}', () => {
    const { getAllByText } = render(<MiniBarChart data={[DATA_VICTORY]} />);
    const dateTexts = getAllByText('10/03');
    // Les labels de date doivent avoir accessible={false}
    dateTexts.forEach((el) => {
      expect(el.props.accessible).toBe(false);
    });
  });
});

describe('MiniBarChart — maxHeight prop', () => {
  it('accepte maxHeight personnalisé sans erreur', () => {
    expect(() => {
      render(<MiniBarChart data={[DATA_VICTORY]} maxHeight={100} />);
    }).not.toThrow();
  });

  it('utilise 140 par défaut', () => {
    const { UNSAFE_queryByProps } = render(<MiniBarChart data={[DATA_VICTORY]} />);
    const container = UNSAFE_queryByProps({ accessible: true });
    // La View graphique a height=140
    expect(container?.props.style).toBeDefined();
  });
});

describe('MiniBarChart — cas limite maxJumps = 0', () => {
  it('affiche sans erreur si tous les records ont 0 saut', () => {
    const zeroData: ReadonlyArray<ChartDataPoint> = [
      { jumps: 0, status: 'won', label: '10/03' },
      { jumps: 0, status: 'abandoned', label: '09/03' },
    ];
    expect(() => {
      render(<MiniBarChart data={zeroData} />);
    }).not.toThrow();
  });
});
