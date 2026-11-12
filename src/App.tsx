import { useEffect, useState } from 'react';
import ExperimentIndex from './pages/ExperimentIndex';
import WordsInMotion from './pages/WordsInMotion';
import FindingForm from './pages/FindingForm';
import TheWeightOfWords from './pages/TheWeightOfWords';
import Unsaid from './pages/Unsaid';

// Hash routes work without adding a routing dependency.
// Examples:
//   #/experiments
//   #/experiments/words-in-motion
//   #/experiments/finding-form
function readRoute() {
  const route = window.location.hash.slice(1);
  return route.startsWith('/experiments') ? route : '/experiments';
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onRouteChange = () => {
      // Prevent the previous experiment's scroll position
      // from carrying over to the next experiment.
      setRoute(readRoute());
      requestAnimationFrame(() => window.scrollTo(0, 0));
    };

    window.addEventListener('hashchange', onRouteChange);
    return () => window.removeEventListener('hashchange', onRouteChange);
  }, []);

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
    default:
      page = <ExperimentIndex />;
  }

  return (
    <main className="min-h-svh w-full bg-[#f3f1ec] text-[#171717]">
      {page}
    </main>
  );
}
