export const experiments = [
  {
    id: '001',
    slug: 'words-in-motion',
    title: 'Words in Motion',
    description: 'Still, float, scramble and type.',
    available: true,
  },
  {
    id: '002',
    slug: 'finding-form',
    title: 'Finding Form',
    description: 'A sphere of words becomes a poem.',
    available: true,
  },
  {
    id: '003',
    slug: 'the-weight-of-words',
    title: 'The Weight of Words',
    description: 'Gravity, collisions and resistance.',
    available: false,
  },
] as const;

export const experimentUrl = (slug: string) =>
  `#/experiments/${slug}`;
