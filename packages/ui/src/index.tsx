import type { ReactNode } from 'react';

export interface PlaceholderProps {
  children?: ReactNode;
}

/** Placeholder component for the shared UI package. */
export function Placeholder({ children }: PlaceholderProps) {
  return <div className="ui-placeholder">{children ?? 'Shared UI placeholder'}</div>;
}
