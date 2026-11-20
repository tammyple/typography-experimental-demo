import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LoadingScreen from './components/LoadingScreen';
import ExperimentNavigation from './components/ExperimentNavigation';
import SiteMenu from './components/SiteMenu';
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
  // Show the intro only when the site first loads on Home.
  // A direct visit or refresh on an experiment opens it immediately.
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() =>
    readRoute() === '/experiments' ? 'counting' : 'ready'
  );
  const [slide, setSlide] = useState<Slide | null>(null);
  const currentRouteRef = useRef(route);
  const slideRef = useRef<Slide | null>(null);

  // On a hard refresh the browser may restore yesterday's scroll position.
  // Reset it before first paint, otherwise the opening hero appears cropped
  // and seems to jump into place after the white page slides up.
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const resetScroll = () => window.scrollTo(0, 0);
    resetScroll();
    window.addEventListener('pageshow', resetScroll);
    const frame = requestAnimationFrame(resetScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pageshow', resetScroll);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  // Keep the first viewport anchored during both stages of the intro.
  // In particular, don't let late font/layout changes trigger scroll anchoring.
  useLayoutEffect(() => {
    if (introPhase !== 'ready') window.scrollTo(0, 0);
  }, [introPhase]);

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

  useLayoutEffect(() => {
    if (introPhase === 'ready' && !slide) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlBackground = html.style.backgroundColor;
    const previousBodyBackground = body.style.backgroundColor;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (introPhase !== 'ready') {
      // Black even behind the counter; no white divider can peek through.
      html.style.backgroundColor = '#080808';
      body.style.backgroundColor = '#080808';
    }
    if (introPhase !== 'ready') window.scrollTo(0, 0);
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.backgroundColor = previousHtmlBackground;
      body.style.backgroundColor = previousBodyBackground;
    };
  }, [introPhase, slide]);

  useEffect(() => {
    if (introPhase !== 'revealing') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => {
        window.scrollTo(0, 0);
        setIntroPhase('ready');
      },
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
      {introPhase === 'ready' && <SiteMenu route={slide?.to ?? route} />}
    </>
  );
}
