'use client';

import { useEffect, useState } from 'react';

type ToastTone = 'default' | 'success' | 'error';
type ToastPayload = { message: string; tone?: ToastTone; id: number };

let listeners: Array<(toast: ToastPayload) => void> = [];
let ids = 0;

export function toast(message: string, tone: ToastTone = 'default') {
  const payload: ToastPayload = { message, tone, id: ++ids };
  listeners.forEach((listener) => listener(payload));
}

export function Toaster() {
  const [items, setItems] = useState<ToastPayload[]>([]);

  useEffect(() => {
    const onToast = (payload: ToastPayload) => {
      setItems((prev) => [...prev, payload]);
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== payload.id));
      }, 3000);
    };

    listeners.push(onToast);
    return () => {
      listeners = listeners.filter((listener) => listener !== onToast);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`min-w-[220px] rounded-md border px-3 py-2 text-sm text-white shadow-lg ${
            item.tone === 'success'
              ? 'border-emerald-400/40 bg-emerald-700/90'
              : item.tone === 'error'
                ? 'border-rose-400/40 bg-rose-700/90'
                : 'border-slate-600 bg-slate-800/95'
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
