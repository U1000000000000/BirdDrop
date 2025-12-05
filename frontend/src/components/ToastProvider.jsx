import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

function ToastItem({ t, onAction }) {
  const { id, message, type, action, secondary, timeout = 4000 } = t;

  useEffect(() => {
    if (timeout > 0) {
      const to = setTimeout(() => onAction(id, 'timeout'), timeout);
      return () => clearTimeout(to);
    }
  }, [id, timeout, onAction]);

  return (
    <div className={`max-w-lg mx-auto mb-3 px-4 py-2 rounded-full flex items-center justify-between gap-3 shadow-lg ${type === 'error' ? 'bg-rose-600/95 text-white' : 'bg-white/6 text-white backdrop-blur-md border border-gray-300/20'}`}>
      <div className="flex-1 text-sm">{message}</div>
      <div className="flex items-center gap-2">
        {secondary && (
          <button onClick={() => onAction(id, 'secondary')} className="px-3 py-1 rounded-full bg-white/10 text-xs">{secondary.label}</button>
        )}
        {action && (
          <button onClick={() => onAction(id, 'action')} className="px-3 py-1 rounded-full bg-emerald-500 text-xs text-white">{action.label}</button>
        )}
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmQueue, setConfirmQueue] = useState([]);

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const show = useCallback((message, opts = {}) => {
    const id = `toast-${++idCounter}`;
    const t = { id, message, ...opts };
    setToasts(s => [t, ...s]);
    return id;
  }, []);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      const id = `confirm-${++idCounter}`;
      const onAction = (id) => {
        setConfirmQueue(q => q.filter(x => x.id !== id));
        resolve(true);
      };
      const onCancel = (id) => {
        setConfirmQueue(q => q.filter(x => x.id !== id));
        resolve(false);
      };
      const item = {
        id,
        message,
        action: { label: opts.acceptLabel || 'Accept', cb: onAction },
        secondary: { label: opts.declineLabel || 'Decline', cb: onCancel },
        timeout: opts.timeout || 15000,
        type: opts.type || 'info'
      };
      setConfirmQueue(q => [item, ...q]);
    });
  }, []);

  // Expose global API for legacy scripts
  useEffect(() => {
    const api = {
      show: (message, opts) => show(message, opts),
      confirm: (message, opts) => confirm(message, opts)
    };
    try { window.__birddrop_toast = api; } catch (e) {}
    return () => {
      try { delete window.__birddrop_toast; } catch (e) {}
    };
  }, [show, confirm]);

  const handleAction = useCallback((id, kind) => {
    const c = confirmQueue.find(x => x.id === id);
    if (c) {
      if (kind === 'action' && c.action && c.action.cb) c.action.cb(id);
      else if (kind === 'secondary' && c.secondary && c.secondary.cb) c.secondary.cb(id);
      else if (kind === 'timeout') { if (c.secondary && c.secondary.cb) c.secondary.cb(id); }
      return;
    }
    if (kind === 'action' || kind === 'secondary' || kind === 'timeout') remove(id);
  }, [confirmQueue, remove]);

  return (
    <ToastContext.Provider value={{ show, confirm }}>
      {children}
      {/* Toast container - bottom center */}
      <div className="fixed left-0 right-0 bottom-6 pointer-events-none z-50">
        <div className="flex flex-col items-center px-4">
          {confirmQueue.map(c => (
            <div key={c.id} className="w-full max-w-md pointer-events-auto">
              <div className={`mb-3 px-4 py-3 rounded-full bg-white/6 text-white shadow-lg flex items-center justify-between gap-3 backdrop-blur-md border border-gray-300/20`}>
                <div className="flex-1 text-sm">{c.message}</div>
                <div className="flex items-center gap-2">
                  {c.secondary && <button onClick={() => handleAction(c.id, 'secondary')} className="px-3 py-1 rounded-full bg-white/10 text-xs">{c.secondary.label}</button>}
                  {c.action && <button onClick={() => handleAction(c.id, 'action')} className="px-3 py-1 rounded-full bg-emerald-500 text-xs text-white">{c.action.label}</button>}
                </div>
              </div>
            </div>
          ))}
          {toasts.map(t => (
            <div key={t.id} className="w-full max-w-md pointer-events-auto">
              <ToastItem t={t} onAction={(id, kind) => handleAction(id, kind)} />
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
