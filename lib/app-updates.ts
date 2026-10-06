import type {RideNotice} from '@/lib/notifications/types';

// Add one entry with a unique, permanent ID when shipping a user-visible update.
// Read status uses the existing account inbox, so reopening never duplicates a release.
export const appUpdates: RideNotice[] = [{
  id: 'update:2026-10-06-vercel',
  title: 'Lakbay updated: ready for Vercel',
  body: 'Lakbay now runs on standard Next.js with PostgreSQL storage. Your map, weather, routes, fuel estimates and profile features remain available.',
  tab: 'ride',
  time: Date.parse('2026-10-05T17:11:37Z'),
  kind: 'update',
}, {
  id: 'update:2026-10-06-job-2-v2',
  title: 'Lakbay updated: clearer navigation',
  body: 'Clear destinations, compare real route alternatives, view estimated arrival times and animated weather, and see your saved profile photo on your location pin. Automatic rerouting now checks accurate GPS fixes. Live traffic remains unavailable.',
  tab: 'ride',
  time: Date.parse('2026-10-05T16:56:32Z'),
  kind: 'update',
}, {
  id: 'update:2026-10-06-job-2',
  title: 'Lakbay updated: weather, arrivals & fuel',
  body: 'Compact weather, clearer destinations, quieter map stops, arrival celebrations and ride ratings are here. Add your vehicle and estimated fuel in Garage and Map tools.',
  tab: 'ride',
  time: Date.parse('2026-10-05T16:40:18Z'),
  kind: 'update',
}, {
  id: 'update:2026-10-06-job-1',
  title: 'Lakbay updated: a smoother ride',
  body: 'Panels now open and close smoothly. The welcome appears once per device, loading starts after sign-in, and saved profile changes update your map marker. Choose Street, Minimal or Night in Map tools.',
  tab: 'ride',
  time: Date.parse('2026-10-05T16:25:01Z'),
  kind: 'update',
}];
