'use client';

import React from 'react';

interface NumProps {
  children: React.ReactNode;
  className?: string;
  dir?: 'ltr' | 'rtl';
}

/**
 * <Num> wraps any mixed-direction or LTR token (phone numbers, prices,
 * durations, counters, dates, times, license numbers) so digits never
 * reverse in RTL contexts. Renders <bdi dir="ltr"> with tabular numerals.
 */
export function Num({ children, className, dir = 'ltr' }: NumProps) {
  return (
    <bdi dir={dir} className={`tabular-nums font-mono ${className ?? ''}`}>
      {children}
    </bdi>
  );
}

export default Num;