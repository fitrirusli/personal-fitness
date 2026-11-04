import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { emptyJournal, openJournal } from './journal';
import { demoJournal } from '../data/demo';

const Context = createContext(null);
export function JournalProvider({ children }) {
  const [mode, setMode] = useState(() =>
    localStorage.getItem('pf-mode') === 'demo' ? 'demo' : 'personal',
  );
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const repo = useRef(null);
  const channel = useRef(null);
  const current = useRef(mode);
  current.current = mode;
  useEffect(() => {
    let disposed = false;
    let repository;
    setState(null);
    const broadcast = new BroadcastChannel(`pf-${mode}`);
    channel.current = broadcast;
    openJournal(mode)
      .then(async (opened) => {
        repository = opened;
        if (disposed) {
          opened.close();
          return;
        }
        repo.current = opened;
        let value = await opened.read();
        if (mode === 'demo' && !value.profile) value = await opened.replace(demoJournal());
        if (!disposed) setState(value);
        broadcast.onmessage = async () => {
          try {
            const next = await opened.read();
            if (!disposed)
              setState((previous) =>
                previous && previous.revision > next.revision ? previous : next,
              );
          } catch (e) {
            if (!disposed) setError(e.message);
          }
        };
      })
      .catch((e) => setError(`Local storage could not open: ${e.message}`));
    return () => {
      disposed = true;
      broadcast.close();
      repository?.close();
      repo.current = null;
    };
  }, [mode]);
  const change = async (mutate) => {
    const opened = repo.current;
    const activeMode = current.current;
    if (!opened) throw new Error('Local storage is still opening.');
    const next = await opened.change(mutate);
    if (current.current === activeMode && opened === repo.current) {
      setState((previous) => (previous && previous.revision > next.revision ? previous : next));
      channel.current?.postMessage(next.revision);
    }
    return next;
  };
  const replace = async (value) => {
    const opened = repo.current;
    const activeMode = current.current;
    const next = await opened.replace(value);
    if (current.current === activeMode && opened === repo.current) {
      setState(next);
      channel.current?.postMessage(next.revision);
    }
  };
  const switchMode = (next) => {
    localStorage.setItem('pf-mode', next);
    setMode(next);
  };
  return (
    <Context.Provider
      value={{
        state,
        mode,
        change,
        replace,
        switchMode,
        error,
        setError,
        reset: () => replace(emptyJournal()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useJournal = () => useContext(Context);
