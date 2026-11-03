
export type Effect =
  | 'still'
  | 'float'
  | 'scramble'
  | 'type';

export const WORD = 'TYPOGRAPHY';

export const EFFECTS: {
  id: Effect;
  label: string;
  hoverHint: string;
  selectedHint: string;
}[] = [
  {
    id: 'still',
    label: 'STILL',
    hoverHint: 'The letters return to their original places.',
    selectedHint: 'Everything is still.',
  },
  {
    id: 'float',
    label: 'FLOAT',
    hoverHint: 'Letters drift and bounce between the lines.',
    selectedHint: 'Grab a letter, drag it, and throw it.',
  },
  {
    id: 'scramble',
    label: 'SCRAMBLE',
    hoverHint: 'The word decodes from left to right.',
    selectedHint: 'Watch the characters find their places.',
  },
  {
    id: 'type',
    label: 'TYPE',
    hoverHint: 'The word appears one letter at a time.',
    selectedHint: 'Watch the word being typed.',
  },
];
