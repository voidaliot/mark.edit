import { describe, expect, it } from 'vitest';
import { getDocumentStats } from '../src/shared/utils/documentStats';

describe('getDocumentStats', () => {
  it('counts words and characters', () => {
    expect(getDocumentStats('Hello **small cat**')).toEqual({
      words: 3,
      characters: 19,
    });
  });

  it('handles empty documents', () => {
    expect(getDocumentStats('   ')).toEqual({
      words: 0,
      characters: 3,
    });
  });
});
