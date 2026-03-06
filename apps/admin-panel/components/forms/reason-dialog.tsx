'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './form';
import { ConfirmDialog } from './confirm-dialog';
import { Textarea } from '../ui/textarea';

const reasonSchema = z.object({
  reason: z.string().trim().min(1, 'El motivo es obligatorio'),
});

type ReasonFormValues = z.infer<typeof reasonSchema>;

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
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const form = useForm<ReasonFormValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ reason: '' });
    }
  }, [form, open]);

  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      loading={loading}
      onClose={onClose}
      onConfirm={form.handleSubmit(async (values) => onConfirm(values.reason.trim()))}
      destructive
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(async (values) => onConfirm(values.reason.trim()))}>
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{reasonLabel ?? 'Motivo'}</FormLabel>
                <FormControl>
                  <Textarea {...field} className="min-h-[90px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ConfirmDialog>
  );
}
