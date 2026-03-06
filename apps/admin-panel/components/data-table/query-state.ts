'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [delayMs, value]);
  return debounced;
}

export function useQueryState<T extends Record<string, string>>(defaults: T, options?: { debounceMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const readState = useCallback(() => {
    const next = { ...defaults };
    for (const key of Object.keys(defaults)) {
      next[key as keyof T] = (searchParams.get(key) ?? defaults[key as keyof T]) as T[keyof T];
    }
    return next;
  }, [defaults, searchParams]);

  const [state, setState] = useState<T>(readState);
  const debouncedState = useDebouncedValue(state, options?.debounceMs ?? 350);

  useEffect(() => {
    setState(readState());
  }, [readState]);

  const encodeState = useCallback((targetState: T) => {
    const params = new URLSearchParams();
    for (const key of Object.keys(targetState)) {
      const value = targetState[key];
      if (value) params.set(key, value);
    }
    return params.toString();
  }, []);

  useEffect(() => {
    const query = encodeState(debouncedState);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedState, encodeState, pathname, router]);

  const patch = useCallback((partial: Partial<T>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const queryString = useMemo(() => encodeState(debouncedState), [debouncedState, encodeState]);

  return { state, patch, queryString };
}
