'use client';

import {cloneElement, useEffect, useState, type ReactElement, type HTMLAttributes} from 'react';

// Retain the last visible view for its exit animation, without changing layout.
export default function AnimatedPanel({open, children}: {open: boolean; children: ReactElement<HTMLAttributes<HTMLElement>>}) {
  const [retained, setRetained] = useState(open ? children : null);
  useEffect(() => {
    if (open) {
      // Synchronize the retained view with the visible panel.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRetained(children);
      return;
    }
    const timer = window.setTimeout(() => setRetained(null), 180);
    return () => window.clearTimeout(timer);
  }, [open, children]);
  const panel = open ? children : retained;
  return panel ? cloneElement(panel, {
    className: `${panel.props.className || ''} lakbay-panel`,
    'aria-hidden': open ? undefined : true,
    inert: !open,
    ...{'data-motion': open ? 'open' : 'closed'},
  }) : null;
}
