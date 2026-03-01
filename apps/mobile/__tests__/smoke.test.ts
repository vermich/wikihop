/**
 * Smoke Test — WikiHop Mobile Workspace
 *
 * Vérifie que :
 * 1. Le workspace @wikihop/shared est correctement résolu par Jest
 * 2. Jest est configuré correctement (sanity check)
 *
 * Ce test ne dépend d'aucun rendu React Native — il valide la plomberie
 * du monorepo avant d'aller plus loin.
 */

describe('Mobile workspace', () => {
  it('should import shared types without error', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isApiResponse } = require('@wikihop/shared') as typeof import('@wikihop/shared');
    expect(typeof isApiResponse).toBe('function');
  });

  it('should confirm jest is configured correctly', () => {
    expect(1 + 1).toBe(2);
  });
});
