import { experiments, experimentUrl } from '../data/experiments';
import '../styles/experiment-navigation.css';

type Props = {
  slug: string;
};

/** One consistent navigation bar for every experiment page. */
export default function ExperimentNavigation({ slug }: Props) {
  const currentIndex = experiments.findIndex((item) => item.slug === slug);
  if (currentIndex < 0) return null;

  const current = experiments[currentIndex];
  const previous = currentIndex > 0 ? experiments[currentIndex - 1] : null;
  const next = currentIndex < experiments.length - 1
    ? experiments[currentIndex + 1]
    : null;

  return (
    <nav className="experiment-navigation" aria-label="Experiment navigation">
      <div className="experiment-navigation__left">
        {previous && (
          <a href={experimentUrl(previous.slug)}
             className="experiment-navigation__link"
             aria-label={`Previous experiment: ${previous.title}`}>
            <span aria-hidden="true">←</span> PREVIOUS
          </a>
        )}
      </div>

      <a
        className="experiment-navigation__home"
        href="#/experiments"
        aria-label="Return to all experiments"
        title="All experiments"
      >
        {current.id} / {String(experiments.length).padStart(3, '0')}
      </a>

      <div className="experiment-navigation__right">
        {next && (
          <a href={experimentUrl(next.slug)}
             className="experiment-navigation__link"
             aria-label={`Next experiment: ${next.title}`}>
            NEXT <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </nav>
  );
}
