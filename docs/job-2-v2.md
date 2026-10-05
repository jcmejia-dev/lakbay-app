# Lakbay Job 2 V2

1. Files changed

- app/api/explore/route.ts
- app/globals.css
- app/ride-app.tsx
- components/lakbay/fuel-panel.tsx
- components/lakbay/map-canvas.tsx
- components/lakbay/navigator.tsx
- components/lakbay/personalize.tsx
- components/lakbay/profile-avatar.tsx
- components/lakbay/profile.tsx
- components/lakbay/route-eta.tsx
- components/lakbay/route-options.tsx
- components/lakbay/weather-icon.tsx
- components/lakbay/weather-summary.tsx
- lib/app-updates.ts
- lib/destination.ts
- lib/eta.ts
- lib/navigation.ts
- lib/profile.ts
- lib/rerouting.ts
- lib/routing.ts
- lib/weather.ts
- tests/ride-systems.test.mjs
- docs/job-2-v2.md (this report)

2. Weather cleanup

The weather sheet has one Weather ahead title. Its duplicate body heading and visible Open-Meteo footer were removed. The compact map weather card hides while that sheet is open. Last-update age remains visible; clearing the destination removes destination forecasts and refetches only local weather.

3. Animated weather

Reusable inline SVG icons cover sunny, partly cloudy, cloudy, rain, heavy rain, wind, thunderstorms, snow, unavailable and clear/partly cloudy night conditions. Small CSS animations have a reduced-motion override. Existing weather requests remain deduplicated and cached for ten minutes. Destination forecast samples the hour nearest the selected route's estimated arrival, with unavailable output outside the forecast window.

4. Avatar synchronization

Header, profile summary and GPS marker consume the canonical saved RiderProfile. Saving identity changes updates that state. Photo upload saves its new version immediately and calls onSaved; no additional Save profile click or login is required. Versioned URLs invalidate prior photos; the private avatar endpoint already uses no-store. Failed images use the fallback. Authentication account data remains separate from editable rider identity.

5. User marker

The user's GPS marker uses an outlined SVG location pin with a circular profile photo inside. Its fallback uses the same outline and selected default avatar. Photo/name changes rebuild the marker icon; GPS movement only updates its position. Leaflet image sizing is overridden inside the avatar so the photo stays 32 by 32 pixels. The old S badge is removed. A small, distinct route-start dot appears only when the start is over 50 metres from GPS, or GPS is unavailable. Existing destination flags and subtle POI pins remain.

6. ETA

Distance and duration originate in the real OSRM road-route response. During navigation, remaining duration is estimated by the selected route's remaining-distance fraction; it is not a new live-traffic calculation. The UI shows approximate minutes and a rounded clock ETA. GPS staleness is identified. Route selection updates ETA, destination-weather timing and fuel calculations together.

7. Traffic

The current OSRM endpoint supplies no live traffic feed. The response marks traffic unavailable and the UI says Live traffic unavailable. No synthetic congestion or traffic delay is added.

8. Alternatives and Fastest

The route request asks the existing OSRM provider for alternatives. Responses are schema-validated and duplicate geometry is removed. Up to three routes can be selected from the options sheet or secondary map lines. Fastest is displayed only after comparing at least two distinct valid returned routes by duration, never by distance. Providers can return one route; that case has no Fastest claim. Old saved single routes remain supported. See [OSRM route API](https://project-osrm.org/docs/v5.24.0/api/#route-service).

9. Rerouting and cancellation

Automatic rerouting runs only during recording, with GPS accuracy at most 35 metres, a fix at most 15 seconds old, an offset over 180 metres, two distinct samples and eight seconds of sustained deviation. A 45-second request cooldown and busy guard prevent loops. Failed reroutes preserve the previous route. Manual recalculation remains available. Destination clearing aborts pending routes and invalidates late responses, clears route/alternatives/start/ETA and destination-specific fuel output. During an active or paused draft it asks for confirmation, pauses and saves the draft before clearing navigation; it does not delete recorded kilometres.

10. Validation

- TypeScript: npx tsc --noEmit --incremental false passed.
- Production: npm run build passed all five stages.
- Tests: npm run test:ride-systems passed 10 tests covering fuel, arrival, POIs, stored records, weather caching, cancellation, ETA, route parsing, rerouting and profile/weather states.
- Mobile browser (390 by 844, actual components, mocked APIs and GPS): alternative selection, weather cleanup, route cancellation, active confirmation/save/resume, fuel warnings, arrival and offline ratings passed with no page runtime errors.
- Mobile profile/browser regression: first-launch persistence, authentication loading, sheet exits, map styles, notifications/update reload, saved identity and immediate upload sync passed. Marker image dimensions are asserted as 32 by 32 pixels.
- Configured npm run lint ran and remains failing on existing repository diagnostics, including generated/vendor files. Comparable app/components/hooks/lib/tests scope went from 78 errors and 23 warnings before this job to 74 errors and 20 warnings. No additional diagnostic count by file/rule was introduced.
- git diff --check passed.

11. Providers and remaining limits

No new dependency, database migration or provider credential is needed for these changes. Live congestion and traffic-aware ETA require an actual traffic-enabled routing feed, server-side credentials where required, and an adapter; none is currently configured. Current routes use the provider's driving profile and do not guarantee motorcycle-specific restrictions. Browser/GPS checks use fixtures, so physical-device GPS drift and provider outages remain field-test items. App/Play Store linking still needs published listings; the existing Update app action remains a web-version reload test. A new permanent Job 2 V2 notification appears in the account inbox after this build is deployed. Pushing main alone does not prove the hosting deployment completed.
