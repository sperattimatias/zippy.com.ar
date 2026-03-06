'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

type ToastTone = 'default' | 'success' | 'error';

export function toast(message: string, tone: ToastTone = 'default') {
  if (tone === 'success') return sonnerToast.success(message);
  if (tone === 'error') return sonnerToast.error(message);
  return sonnerToast(message);
}

export function Toaster() {
  return <SonnerToaster theme="dark" richColors position="bottom-right" closeButton />;
}
