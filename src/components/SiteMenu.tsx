import { useEffect, useRef, useState, type CSSProperties } from 'react';
import '../styles/site-menu.css';

type Panel = 'about' | 'contact' | null;

type SiteMenuProps = {
  route: string;
};

// Add your real public email when you're ready to receive messages.
// Until then the Contact panel is informational, not a fake email link.
const CONTACT_EMAIL = '';

export default function SiteMenu({ route }: SiteMenuProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const isHome = route === '/experiments';

  useEffect(() => {
    setOpen(false);
    setPanel(null);
  }, [route]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!panel) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialogCloseRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPanel(null);
        triggerRef.current?.focus();
      }
      if (event.key === 'Tab') {
        const dialog = document.getElementById('site-menu-dialog');
        if (!dialog) return;
        const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [panel]);

  function showPanel(next: Exclude<Panel, null>) {
    setOpen(false);
    setPanel(next);
  }

  function closePanel() {
    setPanel(null);
    triggerRef.current?.focus();
  }

  return (
    <>
      <div className={`site-menu${open ? ' site-menu--open' : ''}`} ref={containerRef}>
        <button
          ref={triggerRef}
          className="site-menu__trigger"
          type="button"
          aria-controls="site-menu-list"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'CLOSE' : 'MENU'} <span aria-hidden="true">{open ? '×' : '+'}</span>
        </button>

        <nav id="site-menu-list" className="site-menu__list" aria-label="Site pages" aria-hidden={!open}>
          <a
            href="#/experiments"
            className={`site-menu__entry${isHome ? ' is-current' : ''}`}
            aria-current={isHome ? 'page' : undefined}
            style={{ '--menu-row': 0 } as CSSProperties}
            onClick={() => setOpen(false)}
          >
            <span className="site-menu__dot" aria-hidden="true" />
            <span>Home</span>
            <span className="site-menu__arrow" aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            className={`site-menu__entry${panel === 'about' ? ' is-current' : ''}`}
            style={{ '--menu-row': 1 } as CSSProperties}
            onClick={() => showPanel('about')}
          >
            <span className="site-menu__dot" aria-hidden="true" />
            <span>About</span>
            <span className="site-menu__arrow" aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className={`site-menu__entry${panel === 'contact' ? ' is-current' : ''}`}
            style={{ '--menu-row': 2 } as CSSProperties}
            onClick={() => showPanel('contact')}
          >
            <span className="site-menu__dot" aria-hidden="true" />
            <span>Contact</span>
            <span className="site-menu__arrow" aria-hidden="true">↗</span>
          </button>
        </nav>
      </div>

      {panel && (
        <div
          className="site-menu__backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closePanel();
          }}
        >
          <section
            id="site-menu-dialog"
            className="site-menu__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-menu-dialog-title"
          >
            <div className="site-menu__dialog-top">
              <span>TSUNAMI OF WORDS</span>
              <button ref={dialogCloseRef} type="button" aria-label="Close dialog" onClick={closePanel}>CLOSE ×</button>
            </div>
            <h2 id="site-menu-dialog-title">{panel === 'about' ? 'About.' : 'Contact.'}</h2>
            {panel === 'about' ? (
              <p>
                Tsunami of Words is an interactive collection exploring what happens
                when typography, movement and language meet. Each experiment is a
                different way to interact with words.
              </p>
            ) : (
              <>
                <p>For conversations about creative coding, design, or working together.</p>
                {CONTACT_EMAIL ? (
                  <a className="site-menu__contact-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL} ↗</a>
                ) : (
                  <p className="site-menu__contact-pending">CONTACT DETAILS COMING SOON</p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
