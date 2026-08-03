import { describe, it, expect } from 'vitest';
import { CATEGORIES, pickCategories, buildInput, WORD_PROMPT } from './prompt';

describe('pickCategories', () => {
  it('returns exactly the requested number', () => {
    for (const n of [1, 5, 19, 20]) {
      expect(pickCategories(n)).toHaveLength(n);
    }
  });

  it('does not repeat while the pool lasts', () => {
    const picked = pickCategories(CATEGORIES.length);
    expect(new Set(picked).size).toBe(CATEGORIES.length);
  });

  it('cycles rather than truncating when asked for more than the pool holds', () => {
    const picked = pickCategories(CATEGORIES.length + 3);

    expect(picked).toHaveLength(CATEGORIES.length + 3);
    // Every category appears before any repeats begin.
    expect(new Set(picked.slice(0, CATEGORIES.length)).size).toBe(CATEGORIES.length);
  });

  it('varies between calls — this is what replaces temperature', () => {
    // Twenty draws of five landing in identical order would mean the shuffle
    // is not shuffling, which is the whole anti-repetition mechanism.
    const draws = new Set(
      Array.from({ length: 20 }, () => pickCategories(5).join('|'))
    );
    expect(draws.size).toBeGreaterThan(1);
  });

  it('includes the Indonesia category in the pool', () => {
    expect(CATEGORIES.some(c => c.startsWith('Indonesia'))).toBe(true);
  });
});

describe('buildInput', () => {
  it('numbers one category per requested pair', () => {
    const input = buildInput(3, [], ['hewan', 'olahraga', 'profesi']);

    expect(input).toContain('Buat tepat 3 pasangan');
    expect(input).toContain('1. hewan');
    expect(input).toContain('2. olahraga');
    expect(input).toContain('3. profesi');
  });

  it('never lists more categories than pairs requested', () => {
    const input = buildInput(2, [], ['hewan', 'olahraga', 'profesi']);

    expect(input).toContain('2. olahraga');
    expect(input).not.toContain('3. profesi');
  });

  it('omits the avoid block entirely when there is nothing to avoid', () => {
    expect(buildInput(1, [], ['hewan'])).not.toContain('SUDAH DIPAKAI');
  });

  it('emits avoid words as a fenced JSON array, not as prose', () => {
    const input = buildInput(1, ['Kopi', 'Teh'], ['hewan']);

    expect(input).toContain('SUDAH DIPAKAI');
    expect(input).toContain('["Kopi","Teh"]');
  });
});

describe('WORD_PROMPT', () => {
  it('permits widely-known brands but bans individual people', () => {
    expect(WORD_PROMPT).toContain('Merek, aplikasi, film, dan tempat BOLEH');
    expect(WORD_PROMPT).toContain('Nama orang');
    expect(WORD_PROMPT).toContain('TIDAK BOLEH');
  });

  it('allows two-word answers within the card layout limit', () => {
    expect(WORD_PROMPT).toContain('Maksimal 2 kata dan 20 karakter');
  });

  it('invites abstract concepts', () => {
    expect(WORD_PROMPT).toContain('Konsep abstrak');
  });

  it('names the category-overlap failure seen in live testing', () => {
    // The model produced Ayam / Daging despite the abstract rule, so the
    // concrete counterexample earns its place.
    expect(WORD_PROMPT).toContain('Ayam / Daging');
  });

  it('tells the model not to reuse its own examples', () => {
    expect(WORD_PROMPT).toContain('Jangan memakai pasangan yang sudah dicontohkan');
  });
});
