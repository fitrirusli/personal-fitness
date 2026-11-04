import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  CircleUserRound,
  Clock3,
  Dumbbell,
  LayoutDashboard,
  Leaf,
  ShieldCheck,
  WifiOff,
  X,
} from 'lucide-react';
import { useJournal } from './lib/store';
import { useMuscleReminders } from './lib/muscle-reminders';
import { acceptRestoredMealPhoto } from './lib/meal-camera';
import Today from './pages/Today';
import Train from './pages/Train';
import Food from './pages/Food';
import Progress from './pages/Progress';
import Profile, { Onboarding } from './pages/Profile';

const navigation = [
  { to: '/', label: 'Today', icon: LayoutDashboard },
  { to: '/train', label: 'Train', icon: Dumbbell },
  { to: '/food', label: 'Food', icon: Leaf },
  { to: '/progress', label: 'Progress', icon: Activity },
  { to: '/profile', label: 'Profile', icon: CircleUserRound },
];
function RestTimer() {
  const { state, change, setError } = useJournal();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!state?.restUntil) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state?.restUntil]);
  if (!state?.restUntil) return null;
  const remaining = Math.max(0, Math.ceil((state.restUntil - now) / 1000));
  return (
    <div className={`rest-timer ${remaining === 0 ? 'ready' : ''}`} role="status">
      <Clock3 size={18} />
      <div>
        <strong>
          {remaining
            ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
            : 'Rest complete'}
        </strong>
        <small>{remaining ? 'Breathe. Reset. Go again.' : 'Continue when you feel ready.'}</small>
      </div>
      <button
        className="icon-btn"
        aria-label="Dismiss rest timer"
        onClick={() =>
          change((draft) => {
            draft.restUntil = null;
          }).catch((e) => setError(e.message))
        }
      >
        <X size={18} />
      </button>
    </div>
  );
}
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function Shell() {
  const { state, mode, switchMode, error, setError } = useJournal();
  useMuscleReminders(state, mode);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let remove;
    import('@capacitor/app')
      .then(async ({ App }) => {
        const listener = await App.addListener('appRestoredResult', (event) => {
          if (!acceptRestoredMealPhoto(event)) return;
          window.location.hash = '/food';
          window.dispatchEvent(new Event('pf-camera-restored'));
        });
        remove = () => listener.remove();
        if (disposed) remove();
      })
      .catch((error) => setError(`Camera result could not be recovered: ${error.message}`));
    return () => {
      disposed = true;
      remove?.();
    };
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    let remove;
    let disposed = false;
    if (Capacitor.isNativePlatform())
      import('@capacitor/app').then(async ({ App }) => {
        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          if (document.querySelector('dialog[open]')) {
            document
              .querySelector('dialog[open]')
              .dispatchEvent(new Event('cancel', { cancelable: true }));
          } else if (canGoBack) window.history.back();
          else App.minimizeApp();
        });
        remove = () => listener.remove();
        if (disposed) remove();
      });
    return () => {
      disposed = true;
      remove?.();
    };
  }, []);
  if (!state)
    return (
      <div className="loading">
        <div className="brand-mark">
          <Dumbbell />
        </div>
        <h2>Opening your journal…</h2>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  if (!state.profile)
    return (
      <>
        <Onboarding />
        {mode === 'demo' && (
          <button className="demo-return" onClick={() => switchMode('personal')}>
            Return to personal journal
          </button>
        )}
      </>
    );
  return (
    <div className="app-shell">
      <ScrollReset />
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Dumbbell size={23} />
          </span>
          <span>
            personal
            <br />
            <b>fitness</b>
          </span>
        </Link>
        <p className="nav-label">YOUR EVERYDAY ATHLETE</p>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={20} />
              <span>{label}</span>
              <ArrowUpRight size={15} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={23} />
          <strong>Just you. And your progress.</strong>
          <p>
            Saved on this device.
            <br />
            Ready when you are.
          </p>
          <Link to="/profile">
            Back up your journal
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="sidebar-user">
          <span>{state.profile.name[0].toUpperCase()}</span>
          <div>
            <strong>{state.profile.name}</strong>
            <small>{mode === 'demo' ? 'Fictional demo' : 'Personal journal'}</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <Link to="/" className="mobile-brand">
            <Dumbbell size={23} />
            <strong>personal fitness</strong>
          </Link>
          <div className="topbar-motto">
            MAKE TODAY COUNT<span>↗</span>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              {online ? <ShieldCheck size={15} /> : <WifiOff size={15} />}{' '}
              {online ? 'Saved locally' : 'Offline · ready to train'}
            </span>
            <Link to="/profile" className="avatar" aria-label="Open profile">
              {state.profile.name[0].toUpperCase()}
            </Link>
          </div>
        </header>
        {mode === 'demo' && (
          <div className="demo-banner">
            <strong>FICTIONAL DEMO</strong>
            <span>Sample records. Your personal journal is separate.</span>
            <button onClick={() => switchMode('personal')}>
              Use my own journal
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/train" element={<Train />} />
            <Route path="/food" element={<Food />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Today />} />
          </Routes>
          <footer>
            PERSONAL FITNESS <span>Build a rhythm worth keeping.</span>
            <span className="footer-privacy">Private by default.</span>
            <small className="copyright">© 2026 fitrirusli. All rights reserved.</small>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <RestTimer />
      {error && (
        <div className="global-error" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
