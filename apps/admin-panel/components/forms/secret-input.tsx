'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function SecretInput({
  hasStored,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  hasStored: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!hasStored) setEditing(true);
  }, [hasStored]);

  if (!editing && hasStored) {
    return (
      <div className="flex items-center gap-2">
        <Input value="••••••••" readOnly aria-label="secret-masked" disabled={disabled} />
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)} disabled={disabled}>
          Reingresar
        </Button>
      </div>
    );
  }

  return (
    <Input
      type="password"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  );
}
