import { Storage } from '../storage';

describe('displayWord', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage();
  });

  it('strips punctuation', () => {
    expect(storage.displayWord('raven,')).toBe('raven');
  });

  it('collapses whitespace', () => {
    expect(storage.displayWord('nevermore   ')).toBe('nevermore');
  });

  it('preserves apostrophes and hyphens', () => {
    expect(storage.displayWord("rock 'n' roll - part 2")).toBe("rock 'n' roll - part 2");
  });

  it('handles empty input', () => {
    expect(storage.displayWord('')).toBe('');
  });

  it('handles whitespace-only input', () => {
    expect(storage.displayWord('   ')).toBe('');
  });

  it('handles null input', () => {
    expect(storage.displayWord(null)).toBe('');
  });
});
