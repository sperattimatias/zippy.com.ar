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

export function useQueryState<T extends Record<string, string>>(defaults: T) {
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

  useEffect(() => {
    setState(readState());
  }, [readState]);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of Object.keys(state)) {
      const value = state[key];
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, state]);

  const patch = useCallback((partial: Partial<T>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of Object.keys(state)) {
      const value = state[key];
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [state]);

  return { state, patch, queryString };
}
