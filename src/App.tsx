import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LoadingScreen from './components/LoadingScreen';
import ExperimentNavigation from './components/ExperimentNavigation';
import ExperimentIndex from './pages/ExperimentIndex';
import WordsInMotion from './pages/WordsInMotion';
import FindingForm from './pages/FindingForm';
import TheWeightOfWords from './pages/TheWeightOfWords';
import Unsaid from './pages/Unsaid';
import Submerged from './pages/Submerged';
import { experiments } from './data/experiments';
import './styles/page-transitions.css';
import './styles/experiment-layout.css';

type IntroPhase = 'counting' | 'revealing' | 'ready';
type Slide = {
  from: string;
  to: string;
  direction: 1 | -1;
  entering: boolean;
};

const PAGE_SLIDE_MS = 1250;

function readRoute() {
  const route = window.location.hash.slice(1);
  return route.startsWith('/experiments') ? route : '/experiments';
}

function getExperimentIndex(route: string) {
  return experiments.findIndex((item) => route === `/experiments/${item.slug}`);
}

function Page({ route, introPhase }: { route: string; introPhase: IntroPhase }) {
  switch (route) {
    case '/experiments/words-in-motion': return <WordsInMotion />;
    case '/experiments/finding-form': return <FindingForm />;
    case '/experiments/the-weight-of-words': return <TheWeightOfWords />;
    case '/experiments/unsaid': return <Unsaid />;
    case '/experiments/submerged': return <Submerged />;
    default: return <ExperimentIndex introPhase={introPhase} />;
  }
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('counting');
  const [slide, setSlide] = useState<Slide | null>(null);
  const currentRouteRef = useRef(route);
  const slideRef = useRef<Slide | null>(null);

  useEffect(() => {
    currentRouteRef.current = route;
  }, [route]);
  useEffect(() => {
    slideRef.current = slide;
  }, [slide]);

  // Hash links work with normal browser back/forward history.
  useEffect(() => {
    function onRouteChange() {
      const next = readRoute();
      const previous = currentRouteRef.current;
      if (next === previous && !slideRef.current) return;

      const fromIndex = getExperimentIndex(previous);
      const toIndex = getExperimentIndex(next);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (
        !slideRef.current &&
        fromIndex >= 0 &&
        toIndex >= 0 &&
        fromIndex !== toIndex &&
        !reduceMotion
      ) {
        setSlide({
          from: previous,
          to: next,
          direction: toIndex > fromIndex ? 1 : -1,
          entering: false,
        });
        return;
      }

      // Index navigation, direct URLs, accessibility mode and interrupted
      // transitions switch directly without accumulating page instances.
      setSlide(null);
      currentRouteRef.current = next;
      setRoute(next);
      window.scrollTo(0, 0);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    window.addEventListener('hashchange', onRouteChange);
    return () => window.removeEventListener('hashchange', onRouteChange);
  }, []);

  // Mount the new page outside the viewport before beginning the slide.
  useEffect(() => {
    if (!slide || slide.entering) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setSlide((current) => current ? { ...current, entering: true } : null);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [slide]);

  function finishSlide() {
    if (!slide) return;
    const next = slide.to;
    currentRouteRef.current = next;
    setRoute(next);
    setSlide(null);
    // Finding Form uses ScrollTrigger, whose measurements must be refreshed
    // after its page is no longer in the moving overlay.
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }

  // Fallback if the browser suppresses transitionend (e.g. background tab).
  useEffect(() => {
    if (!slide?.entering) return;
    const timeout = window.setTimeout(finishSlide, 1050);
    return () => window.clearTimeout(timeout);
  }, [slide?.entering, slide?.to]);

  useEffect(() => {
    if (introPhase === 'ready' && !slide) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [introPhase, slide]);

  useEffect(() => {
    if (introPhase !== 'revealing') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => setIntroPhase('ready'),
      reduced ? 0 : PAGE_SLIDE_MS + 750
    );
    return () => window.clearTimeout(timer);
  }, [introPhase]);

  const currentIndex = getExperimentIndex(route);
  const currentSlug = currentIndex >= 0 ? experiments[currentIndex].slug : null;

  return (
    <>
      {introPhase !== 'ready' && (
        <LoadingScreen onCountComplete={() => setIntroPhase('revealing')} />
      )}

      <main className={`site-page site-page--${introPhase}`}>
        <div key={route} className="experiment-route-layer">
          <Page route={route} introPhase={introPhase} />
        </div>

        {slide && (
          <div
            key={slide.to}
            className={`experiment-route-layer experiment-route-layer--incoming${slide.entering ? ' is-entering' : ''}`}
            style={{ '--slide-entry': slide.direction === 1 ? '100%' : '-100%' } as CSSProperties}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && event.propertyName === 'transform') {
                finishSlide();
              }
            }}
          >
            <Page route={slide.to} introPhase="ready" />
          </div>
        )}
      </main>

      {introPhase === 'ready' && !slide && currentSlug && (
        <ExperimentNavigation slug={currentSlug} />
      )}
    </>
  );
}
