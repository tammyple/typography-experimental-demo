import SphereToPoem from './SphereToPoem';
import { useEffect, useState, type CSSProperties } from 'react';

type Effect = 'still' | 'scatter' | 'wave' | 'echo';

const effects: { id: Effect; label: string }[] = [
  { id: 'still', label: 'STILL' },
  { id: 'scatter', label: 'SCATTER' },
  { id: 'wave', label: 'WAVE' },
  { id: 'echo', label: 'ECHO' },
];

const word = 'WORDS';
const scatterOffsets = [
  { x: -0.65, y: -0.8, r: -17 },
  { x: 0.45, y: 0.7, r: 13 },
  { x: -0.15, y: -0.35, r: -9 },
  { x: 0.6, y: 0.5, r: 16 },
  { x: -0.4, y: -0.7, r: -12 },
];

function EffectLabel({ label, effect }: { label: string; effect: Effect }) {
  return (
    <span aria-hidden="true" className={`preview preview-${effect}`}>
      {label.split('').map((letter, index) => (
        <span key={`${letter}-${index}`} className="preview-letter" style={{ '--i': index } as CSSProperties}>
          {letter}
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const [effect, setEffect] = useState<Effect>('still');
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!aboutOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAboutOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [aboutOpen]);

  return (
    <main className="min-h-svh bg-[#080808] px-3 py-3 text-[#111111] sm:px-6 sm:py-5 lg:px-14 lg:py-8">
      <section className="mx-auto flex min-h-[calc(100svh-24px)] max-w-[1440px] flex-col rounded-[22px] bg-[#f1efe9] px-5 pt-6 pb-5 sm:min-h-[calc(100svh-40px)] sm:px-6 lg:min-h-[calc(100svh-64px)]" aria-label="Tsunami of Words typography playground">
        <header className="flex shrink-0 items-center justify-between gap-4 text-[12px] font-normal tracking-[0.025em] sm:text-[16px]">
          <a href="#home" className="outline-offset-4 transition-opacity hover:opacity-60 focus-visible:underline">
            TSUNAMI OF WORDS
          </a>
          <div className="flex items-center gap-4 sm:gap-8">
            <a href="#sphere-poem" className="outline-offset-4 hover:underline">SPHERE ↘</a>
          <button onClick={() => setAboutOpen(true)} className="cursor-pointer outline-offset-4 transition-opacity hover:opacity-60 focus-visible:underline" type="button">
            ABOUT <span aria-hidden="true">↗</span>
          </button>
          </div>
        </header>

        <div className="mt-12 shrink-0 border-t border-[#afafaf] sm:mt-16" />

        <div id="home" className="flex min-h-[390px] flex-1 flex-col sm:min-h-[480px]">
          <div className="flex flex-1 items-center justify-center px-0 py-12 sm:px-5">
            <h1 className={`artwork mode-${effect} flex w-full max-w-[1050px] items-center justify-between`} aria-label="WORDS">
              {word.split('').map((char, index) => {
                const { x, y, r } = scatterOffsets[index];
                const style = {
                  '--i': index,
                  '--sx': x,
                  '--sy': y,
                  '--rotation': `${r}deg`,
                } as CSSProperties;
                return (
                  <span className="art-letter" data-char={char} aria-hidden="true" key={`${char}-${index}`} style={style}>
                    {char}
                  </span>
                );
              })}
            </h1>
          </div>
          <p className="pb-7 text-center text-[11px] tracking-[0.025em] text-[#757575] sm:pb-9 sm:text-[16px]" aria-live="polite">
            CURRENT MODE / {effect.toUpperCase()}
          </p>
        </div>

        <footer className="shrink-0 border-t border-[#aaa] pt-10 pb-1 sm:pt-11">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-x-7">
            {effects.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                aria-label={`${label.toLowerCase()} typography effect`}
                aria-pressed={effect === id}
                onClick={() => setEffect(id)}
                className={`effect-control group relative cursor-pointer pb-3 text-[15px] font-normal tracking-[0.005em] outline-offset-4 sm:text-[20px] ${effect === id ? 'is-active font-semibold' : ''}`}
              >
                <EffectLabel label={label} effect={id} />
                <span className={`absolute right-0 bottom-0 left-0 h-[3px] transition-colors duration-200 sm:h-[4px] ${effect === id ? 'bg-[#161616]' : 'bg-[#d2d0ca] group-hover:bg-[#777]'}`} />
              </button>
            ))}
          </div>
          <p className="mt-9 text-center text-[11px] tracking-[0.01em] text-[#858585] sm:text-[16px]">
            Select an effect to change the typography.
          </p>
        </footer>
      </section>

      <SphereToPoem />

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-5" onMouseDown={(e) => { if (e.target === e.currentTarget) setAboutOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="about-title" className="w-full max-w-[480px] rounded-[20px] bg-[#f1efe9] p-7 shadow-2xl sm:p-10">
            <div className="flex items-start justify-between gap-4">
              <h2 id="about-title" className="font-serif text-4xl">About this experiment.</h2>
              <button type="button" autoFocus onClick={() => setAboutOpen(false)} aria-label="Close about" className="cursor-pointer text-2xl hover:opacity-60">×</button>
            </div>
            <p className="mt-7 text-base leading-relaxed text-[#494949]">Tsunami of Words is a small interactive typography playground. Choose an effect, and watch the same letters behave in different ways.</p>
            <p className="mt-4 text-sm text-[#797979]">A starting point for experimenting with words, motion, and meaning.</p>
            <button type="button" onClick={() => setAboutOpen(false)} className="mt-8 cursor-pointer border-b border-black pb-1 text-sm">BACK TO EXPERIMENT ↗</button>
          </div>
        </div>
      )}
    </main>
  );
}
