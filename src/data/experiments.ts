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
    description: 'Sweep letters through gravity, collisions and resistance.',
    available: true,
  },
  {
    id: '004',
    slug: 'unsaid',
    title: 'Unsaid',
    description: 'Erase a repeated phrase. Reveal what it refuses to say.',
    available: true,
  },
] as const;

export const experimentUrl = (slug: string) =>
  `#/experiments/${slug}`;
