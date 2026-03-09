/**
 * Tests TDD — buildShareMessage (share.utils.ts)
 *
 * Écrits AVANT l'implémentation — TDD strict obligatoire (F3-03, spec Tech Lead Maxime).
 *
 * Format attendu :
 *   WikiHop — J'ai relié "[startTitle]" à "[targetTitle]"
 *   en [jumps] saut[s] et [formatElapsed(elapsedSeconds)] !
 *
 *   Sauras-tu faire mieux ?
 */

import { buildShareMessage } from '../src/utils/share.utils';

describe('buildShareMessage', () => {
  it('commence par "WikiHop — " et se termine par "Sauras-tu faire mieux ?"', () => {
    const msg = buildShareMessage('Antibes', 'Photosynthèse', 3, 125);
    expect(msg.startsWith('WikiHop — ')).toBe(true);
    expect(msg.endsWith('Sauras-tu faire mieux ?')).toBe(true);
  });

  it('singulier : 1 saut, durée < 60 s', () => {
    const msg = buildShareMessage('Paris', 'Rome', 1, 45);
    expect(msg).toContain('en 1 saut et 45 s !');
  });

  it('pluriel : 3 sauts, durée >= 60 s', () => {
    const msg = buildShareMessage('Chat', 'Astronomie', 3, 125);
    // 125 s = 2 m 05 s
    expect(msg).toContain('en 3 sauts et 2 m 05 s !');
  });

  it('zéro saut est singulier', () => {
    const msg = buildShareMessage('Tour Eiffel', 'Liberté', 0, 10);
    expect(msg).toContain('en 0 saut et 10 s !');
  });

  it('inclut les titres entre guillemets droits', () => {
    const start = 'Albert Einstein';
    const target = 'Relativité restreinte';
    const msg = buildShareMessage(start, target, 2, 60);
    expect(msg).toContain(`"${start}"`);
    expect(msg).toContain(`"${target}"`);
  });

  it('durée longue : 3661 s = 61 m 01 s', () => {
    const msg = buildShareMessage('A', 'B', 5, 3661);
    expect(msg).toContain('en 5 sauts et 61 m 01 s !');
  });

  it('vérifie le message complet sur un cas représentatif', () => {
    const msg = buildShareMessage('Paris', 'Rome', 2, 90);
    const expected = [
      'WikiHop — J\'ai relié "Paris" à "Rome"',
      'en 2 sauts et 1 m 30 s !',
      '',
      'Sauras-tu faire mieux ?',
    ].join('\n');
    expect(msg).toBe(expected);
  });
});
