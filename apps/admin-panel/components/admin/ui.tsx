// LEGACY - DO NOT USE
// Compatibility bridge kept to reduce merge conflicts with long-lived branches.
// Prefer `components/page/PageHeader`, `components/common/SectionCard`,
// `components/states/*`, and `lib/toast` in all new code.

import { SectionCard } from '../common/SectionCard';
import { EmptyState as ModernEmptyState } from '../states/EmptyState';
import { ErrorState as ModernErrorState } from '../states/ErrorState';
import { LoadingState as ModernLoadingState } from '../states/LoadingState';

export const AdminCard = SectionCard;
export const EmptyState = ModernEmptyState;
export const ErrorState = ModernErrorState;
export const LoadingState = ModernLoadingState;

// Legacy toast shim intentionally removed from active usage.
// Keep export as `never` to make accidental runtime usage fail at compile time.
export const Toast: never = undefined as never;
