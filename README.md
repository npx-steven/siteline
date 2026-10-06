<p align="center">
  <img src="public/icons/siteline-icon-512.png" width="96" alt="Siteline logo" />
</p>

<h1 align="center">Siteline</h1>

<p align="center">
  <strong>Job site photos that file themselves.</strong><br />
  A mobile-first web app for construction teams: take a photo on site and it lands in the right project by GPS.
</p>

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20PostGIS-3ecf8e?logo=supabase&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white" />
  <img alt="Deployed on Vercel" src="https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel" />
</p>

<!--
  Screenshots: drop images in docs/ and uncomment.
  <p align="center">
    <img src="docs/projects.png" width="240" />
    <img src="docs/capture.png" width="240" />
    <img src="docs/viewer.png" width="240" />
  </p>
-->

---

## The problem

On a construction site, photos are the record of the job: progress, problems, proof of work. In practice they end up mixed into a foreman's camera roll alongside every other site that week, then get sorted by hand (or never). Sending a batch to a client means a group text or a shared drive nobody can find later.

**Siteline removes the sorting step.** Tap the camera, take the shot, and the app matches your location to the nearest job site and files it there. Photos keep their capture time, GPS point and author, the whole team sees them, and you can hand a client a clean, expiring link to just the photos they need.

## Features

### GPS auto-filing
- One camera button, always on screen. **The GPS fix starts when the button is pressed**, so it's usually ready by the time the shutter fires.
- A **PostGIS `ST_DWithin` query** returns the company's projects within 100 m of the shot. The closest match is preselected; other nearby sites are one tap away.
- If there's no match, the app offers to create a new project at that spot. If GPS fails entirely, it falls back to a searchable list of every project instead of dead-ending.

### Trustworthy photo metadata
- EXIF capture time and GPS are read **on the device before upload** (`exifr` loads only when needed), along with orientation-corrected dimensions.
- The app tells a fresh capture apart from a camera-roll pick. A photo taken just now can borrow the phone's current GPS. An old photo from the library can't, because it was probably taken somewhere else.
- The server treats everything the client sends as untrusted. It rejects future dates, out-of-range coordinates and impossible dimensions **without failing the upload over bad metadata**.

### Projects and documents
- Address autofill from your current location (Mapbox reverse geocoding), with forward geocoding to store each project as a PostGIS point.
- Filter by **All / Starred / Recent / Nearby**. Stars are per user, not shared across the team.
- Photos are grouped by day. Plans, permits and other documents sit next to them.
- Long-press a photo to enter multi-select for bulk download, delete or share.

### Full-screen photo viewer
- Swipe, pinch-zoom and keyboard navigation, built on `yet-another-react-lightbox`.
- An info panel shows capture time, who took the photo, file size, dimensions, a map link, and an **"on site" badge** for photos taken within a quarter mile of the project address.
- Editable per-photo notes.
- The open photo lives in the URL (`?photo=<id>`), so **the phone's back gesture closes the viewer** instead of leaving the page, and a link opens straight to a specific photo. Swiping uses `history.replaceState` so moving between photos never triggers a server round trip.

### Client sharing
- Managers pick photos and generate a share link with an unguessable 192-bit token. Links **expire after 30 days**.
- Clients see a branded, no-login page with **Gallery** and **Timeline** views and a one-click **ZIP download**, streamed from a route handler with JSZip.
- The share link only grants the exact photos that were selected, through a join table. The ZIP route checks expiry on its own as well, because it can be reached without loading the page first.

### Teams, roles and invites
- Company onboarding, plus invite links with a role attached that expire after 7 days. Owners can rotate a link to revoke it.
- Three roles: **Owner**, **Project Manager** and **Crew**, each with its own permissions (below).

### Installable PWA
- Web app manifest, standalone display, safe-area-aware layout and app icons, so it installs to the home screen and feels like a native app.

## Security model: multi-tenant by design

The part I'm proudest of is the data isolation. **Postgres Row-Level Security enforces it, not the app code.** The UI checks roles only to hide buttons and show clear error messages. If someone bypassed the UI completely, the database would still refuse.

| Permission                 | Owner | Project Manager | Crew     |
| -------------------------- | :---: | :-------------: | :------: |
| Edit company               | ✓     |                 |          |
| Manage invites             | ✓     |                 |          |
| Create projects            | ✓     | ✓               | ✓        |
| Edit / delete projects     | ✓     | ✓               |          |
| Upload / delete documents  | ✓     | ✓               |          |
| Share photos with clients  | ✓     | ✓               |          |
| Delete photos              | ✓     | ✓               | own only |

How it works:

- **Identity and tenancy are separate.** A `memberships (company_id, user_id, role)` table means one user can belong to several companies with a different role in each. Policies read memberships directly instead of trusting JWT claims, so **removing someone takes effect on their next request**.
- **The authorization helpers are hidden from the API.** `is_member()`, `has_role()` and `shares_company()` live in a `private` schema that PostgREST doesn't expose. They run as `SECURITY DEFINER` with a locked `search_path`.
- **Clients can't pick the tenant.** Photos, documents and share links get their `company_id` from a trigger, pinned to their project's company by a composite foreign key.
- **Storage is private and namespaced.** Files are stored at `{company_id}/{project_id}/{file}`, and storage policies parse the company from the path. Every image is served through a short-lived **signed URL**, created in one batch per page render.
- **A company always keeps an owner.** A trigger blocks removing or demoting the last owner.
- **Least privilege for RPCs.** `EXECUTE` is revoked from `anon` on every RPC the public doesn't need. The service-role key is used only by the public share page and the ZIP route, and only after the token and its expiry have been checked.
- **Careful write ordering.** Deletes remove database rows before storage objects. A failed insert after an upload cleans up the orphaned file. A share link whose photos fail to attach is rolled back.

The schema changes ship as reviewable SQL migrations in [`supabase/migrations`](supabase/migrations). The move to memberships used an **expand → backfill → contract** sequence, so the database stayed compatible while the app code was being deployed.

## Tech stack

| Layer        | Tools |
| ------------ | ----- |
| Framework    | **Next.js 16** (App Router, Server Components, Server Actions, Route Handlers), **React 19** |
| Language     | **TypeScript** (strict) |
| Backend      | **Supabase**: Postgres, Auth, Storage, Row-Level Security, SQL functions |
| Geospatial   | **PostGIS** (`geography`, `ST_DWithin`), Mapbox Geocoding v6, Haversine distance on the client |
| UI           | **Tailwind CSS 4**, shadcn/ui, Radix UI, Vaul drawers, Sonner toasts, Tabler and Lucide icons |
| Forms        | React Hook Form and **Zod** schemas shared by client and server |
| Media        | `exifr` (EXIF and GPS), `yet-another-react-lightbox`, JSZip |
| Hosting      | Vercel |

## Architecture

```
src/
├── app/
│   ├── (marketing)/          Landing page
│   ├── (auth)/               Sign in / sign up
│   ├── (app)/                Authenticated app: projects, project detail,
│   │                         settings, account, onboarding.
│   │                         layout.tsx owns the camera → GPS → upload flow.
│   ├── join/[token]/         Accept a team invite
│   └── share/[token]/        Public client gallery + /download ZIP route
├── actions/                  Server Actions (auth, projects, upload, share,
│                             invites, geocoding), the only write path
├── components/               UI grouped by feature (project, photo-viewer,
│                             share, account, onboarding) + shadcn primitives
├── lib/
│   ├── supabase/             Server, service-role and proxy clients;
│   │                         batched signed URLs
│   ├── permissions.ts        Role → capability map (mirrors the RLS policies)
│   ├── photo-metadata.ts     On-device EXIF / GPS / dimension extraction
│   ├── photos.ts             PostGIS EWKB decoder, on-site radius, maps links
│   └── validators/           Zod schemas
├── proxy.ts                  Next.js 16 proxy: session refresh + route guards
└── types/
supabase/migrations/          RLS policies, RPCs, triggers, schema changes
```

**A few decisions worth calling out:**

- **Route guarding in the Next.js 16 `proxy`.** It refreshes the Supabase session cookie and sends users to the right place (landing page, onboarding, or the app) based on their auth state and whether they have a company.
- **Server Actions are the only write path.** Each one validates input with Zod, re-checks auth, and reads the target through RLS before writing. Results come back as discriminated unions (`{ ok: true } | { ok: false, error }`) instead of thrown errors.
- **A hand-written PostGIS decoder.** PostgREST returns geography columns as hex EWKB. [`parsePostgisPoint`](src/lib/photos.ts) decodes it with a `DataView` (byte order, SRID flag, geometry type) so the app doesn't need a GIS library just to read a point.
- **Fast first paint.** Route-level `loading.tsx` skeletons, a prioritized LCP image on the first project card, and error boundaries at the route and global level.

## Getting started

**Prerequisites:** Node 20+, a Supabase project with the PostGIS extension enabled, and a Mapbox access token.

```bash
git clone https://github.com/stevenpartida/siteline.git
```

```bash
cd siteline && npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public anon key, which is governed by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used by the public share page and the ZIP route |
| `MAPBOX_ACCESS_TOKEN` | **Server only.** Forward and reverse geocoding |

Apply the migrations in `supabase/migrations` (for example with `supabase db push`), then start the dev server:

```bash
npm run dev
```

The camera and geolocation APIs only work in a secure context. To test on a real phone over your LAN, use the HTTPS dev server:

```bash
npm run dev:https
```

## Roadmap

- Offline capture queue for sites with no signal
- Annotate photos (arrows and markup) in the viewer
- Daily progress reports exported as PDF
- Automated tests for the RLS policies with pgTAP

## Author

**Steven Partida**: [GitHub](https://github.com/stevenpartida)
