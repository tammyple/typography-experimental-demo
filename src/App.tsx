import { useEffect, useState } from 'react';
import LoadingScreen from './components/LoadingScreen';
import ExperimentIndex from './pages/ExperimentIndex';
import WordsInMotion from './pages/WordsInMotion';
import FindingForm from './pages/FindingForm';
import TheWeightOfWords from './pages/TheWeightOfWords';
import Unsaid from './pages/Unsaid';
import Submerged from './pages/Submerged';

// Keep the existing hash routing: no new routing dependency.
type IntroPhase = 'counting' | 'revealing' | 'ready';
const PAGE_SLIDE_MS = 1250;

function readRoute() {
  const route = window.location.hash.slice(1);
  return route.startsWith('/experiments') ? route : '/experiments';
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('counting');

  useEffect(() => {
    function onRouteChange() {
      setRoute(readRoute());
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
    window.addEventListener('hashchange', onRouteChange);
    return () => window.removeEventListener('hashchange', onRouteChange);
  }, []);

  // Disable scrolling only while the intro is running.
  useEffect(() => {
    if (introPhase === 'ready') return;
    const oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = oldOverflow;
    };
  }, [introPhase]);

  // Remove the loader only AFTER the actual page finishes sliding up.
  useEffect(() => {
    if (introPhase !== 'revealing') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => setIntroPhase('ready'),
      reduced ? 0 : PAGE_SLIDE_MS + 100
    );
    return () => window.clearTimeout(timer);
  }, [introPhase]);

  let page;
  switch (route) {
    case '/experiments/words-in-motion':
      page = <WordsInMotion />;
      break;
    case '/experiments/finding-form':
      page = <FindingForm />;
      break;
    case '/experiments/the-weight-of-words':
      page = <TheWeightOfWords />;
      break;
    case '/experiments/unsaid':
      page = <Unsaid />;
      break;
    case '/experiments/submerged':
      page = <Submerged />;
      break;
    default:
      page = <ExperimentIndex introPhase={introPhase} />;
  }

  return (
    <>
      {introPhase !== 'ready' && (
        <LoadingScreen
          onCountComplete={() => setIntroPhase('revealing')}
        />
      )}

      <main
        className={`site-page site-page--${introPhase}`}
      >
        {page}
      </main>
    </>
  );
}
