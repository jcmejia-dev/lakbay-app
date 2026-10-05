import type {RideNotice} from '@/components/lakbay/notifications';

// Add one entry with a unique, permanent ID when shipping a user-visible update.
// Read status uses the existing account inbox, so reopening never duplicates a release.
export const appUpdates: RideNotice[] = [{
  id: 'update:2026-10-06-job-1',
  title: 'Lakbay updated: a smoother ride',
  body: 'Panels now open and close smoothly. The welcome appears once per device, loading starts after sign-in, and saved profile changes update your map marker. Choose Street, Minimal or Night in Map tools. Tap Update app to test loading the latest deployed web version.',
  tab: 'ride',
  time: Date.parse('2026-10-06T00:00:00+08:00'),
  kind: 'update',
}];
