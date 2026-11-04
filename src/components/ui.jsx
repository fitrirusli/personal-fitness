import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import { X, Check, ArrowUpRight, Minus, Plus } from 'lucide-react';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Field({ label, hint, children, className = '' }) {
  const generated = useId();
  const control =
    isValidElement(children) && ['input', 'select', 'textarea'].includes(children.type);
  const id = children?.props?.id || generated;
  return (
    <div className={`field ${className}`}>
      {control ? <label htmlFor={id}>{label}</label> : <span id={id}>{label}</span>}
      {control ? (
        cloneElement(children, { id, 'aria-describedby': hint ? `${id}-hint` : undefined })
      ) : (
        <div role="group" aria-labelledby={id}>
          {children}
        </div>
      )}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Heading({ eyebrow, title, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={30} />}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Tag({ children, tone = '' }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function Meter({ value, max, tone = '' }) {
  return (
    <div
      className={`meter ${tone}`}
      role="progressbar"
      aria-valuenow={value || 0}
      aria-valuemin={0}
      aria-valuemax={max || 100}
    >
      <span
        style={{ width: `${Math.min(100, Math.max(0, ((value || 0) / (max || 1)) * 100))}%` }}
      />
    </div>
  );
}
export function Stat({ label, value, unit, children }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      {children}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={wide ? 'wide' : ''}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function FormError({ error }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
export function Stepper({ value, onChange, min = 0, max = 100, step = 1, label }) {
  return (
    <div className="stepper">
      <button
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={16} />
      </button>
      <span>{value}</span>
      <button
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
export function Action({ children, onClick }) {
  return (
    <button className="text-btn" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function SaveButton({ children = 'Save', busy, ...props }) {
  return (
    <Button type="submit" disabled={busy} {...props}>
      {busy ? (
        'Saving…'
      ) : (
        <>
          <Check size={17} />
          {children}
        </>
      )}
    </Button>
  );
}
export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}
