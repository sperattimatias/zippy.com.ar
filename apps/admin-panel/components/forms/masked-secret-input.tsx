// DEPRECATED: do not use in new code. Prefer `SecretInput` directly.
'use client';

import { SecretInput } from './secret-input';

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
  return <SecretInput hasStored={hasStored} value={value} onChange={onChange} placeholder={placeholder} />;
}
