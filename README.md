# Floatr

Mobile-first AV assistance for temporary corporate events.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Open the Supabase SQL editor for the project.
2. Run `supabase/schema.sql`.
3. Use `/admin/` to create an event, rooms, technicians, and room assignments.
4. Print or display the QR code shown for each room.

The default admin PIN is `0000`. Change `NEXT_PUBLIC_ADMIN_CODE` before building if you want a different 4-digit PIN.

Attendees use `/help/[roomSlug]` without an account. Technicians log in at `/technician/` with the 4-digit PIN created in admin.

## GitHub Pages

The app exports static files with:

```bash
npm run build
```

The GitHub Actions workflow in `.github/workflows/pages.yml` publishes `out/` to GitHub Pages on pushes to `master` or `main`.
