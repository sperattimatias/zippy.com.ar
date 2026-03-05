'use client';

import { useState } from 'react';

export function MaskedSecretInput({
  hasStored,
  value,
  onChange,
  placeholder,
}: {
  hasStored: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing && hasStored) {
    return (
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
          value="••••••••"
          readOnly
          aria-label="secret-masked"
        />
        <button
          type="button"
          className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
          onClick={() => setEditing(true)}
        >
          Reemplazar
        </button>
      </div>
    );
  }

  return (
    <input
      className="w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
      type="password"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
