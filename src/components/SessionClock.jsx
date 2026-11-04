import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { durationText, sessionDurationMs, timeText } from '../domain/routines';
import { Button } from './ui';

export default function SessionClock({ session, onStop, busy = false }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (session.pendingStopAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session.id, session.pendingStopAt]);
  return (
    <div className="session-clock">
      <div className="timer-readout" role="timer" aria-label="Workout elapsed time">
        <Clock3 size={18} />
        <strong>{durationText(sessionDurationMs(session, now))}</strong>
        <small>
          {session.pendingStopAt
            ? 'Stopped · choose whether to save'
            : `Started ${timeText(session.startedAt)} · includes rests`}
        </small>
      </div>
      <Button variant="secondary" onClick={onStop} disabled={busy || !!session.pendingStopAt}>
        {session.pendingStopAt ? 'Session stopped' : 'Stop session'}
      </Button>
    </div>
  );
}
