'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { FormField } from './form-field';

export function ReasonDialog({
  open,
  title,
  description,
  reasonLabel,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  reasonLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setReason('');
      setError(undefined);
    }
  }, [open]);

  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      loading={loading}
      onClose={onClose}
      onConfirm={() => {
        if (!reason.trim()) {
          setError('El motivo es obligatorio');
          return;
        }
        onConfirm(reason.trim());
      }}
    >
      <FormField label={reasonLabel ?? 'Motivo'} error={error}>
        <textarea
          className="min-h-[90px] w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-sm"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(undefined);
          }}
        />
      </FormField>
    </ConfirmDialog>
  );
}
