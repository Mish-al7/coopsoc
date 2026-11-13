# Society membership site

Online membership application for Trichur Handicrafts Workers Industrial Co-operative Society (C.IND (R) 193).
Malayalam + English (switch in the header), mobile-first.

**Stack:** Next.js 16 (App Router, server actions) · MongoDB (Mongoose) · Cloudinary (private image storage) · Tailwind CSS 4.
Look follows the society's site (thwics.com), modernised: orange → red gradient, navy text, white sections.
Fonts: Mulish (Latin, the site's "Muli") + Anek Malayalam (Malayalam).

## What it does

- **Members:** register / log in with email + password → fill the membership form (same fields as the paper form) → upload photo, signature, Aadhaar front/back, up to 3 extra photos → track status, edit while under review, print the filled form.
- **Office (admin):** list + search + filter by status → open an application → compare Aadhaar card images with the form → tick "Aadhaar verified" (and "Fee received" when a fee screenshot was sent) → approve (auto membership no. `M-0001`, or type one), ask for changes (member sees the note), or reject.
- **Super admin:** `/admin/settings` (button "⚙ Fee & QR" on the office page) — set the membership fee, upload the bank's UPI QR, UPI ID, account name and bank details. With a fee above 0, the form starts with a "Membership fee" step: the member pays by QR / UPI (one-tap "Pay in UPI app" button on phones) and uploads the payment screenshot (+ optional transaction ID). Fee 0 turns the step off.

### Aadhaar
No paid KYC API. The number is checked for format + Verhoeff checksum (catches typos instantly), then the office
checks it against the uploaded card images. An application can't be approved until "Aadhaar verified" is ticked.
Aadhaar numbers are stored **encrypted** (AES-256-GCM); only the last 4 digits are stored in plain text.
The same Aadhaar can't be used for two applications.

### Photos
Resized in the browser, then re-encoded on the server (EXIF/GPS removed). Uploaded to Cloudinary as
**authenticated** (non-public) assets and served only through `/api/files/...`, which checks that the viewer is the
applicant or an admin. If Cloudinary keys are missing, files are stored in `./.data/uploads` (local testing only).

## Run locally

```bash
npm install
```

```bash
npm run db
```
(starts a local MongoDB on port 27017, data in `./.data/mongo` — keep it running in its own terminal)

```bash
npm run dev
```

Open http://localhost:3000. Settings live in `.env.local` (see `.env.example`).

### Local test accounts
Created while testing against the local database only:

| Role | Email | Password |
|---|---|---|
| Member | member@coopsoc.test | TestPass#2026 |
| Member (photos on Cloudinary) | member2@coopsoc.test | TestPass#2026 |
| Admin | admin@coopsoc.test | AdminPass#2026 |

Any email listed in `ADMIN_EMAILS` becomes an admin when it registers or logs in. Emails in `SUPER_ADMIN_EMAILS`
are admins too and can also open `/admin/settings` (fee + QR).

To test against the local database without touching Atlas, run `npm run db` and start the dev server with the
`coopsoc-dev-localdb` launch configuration (it overrides `MONGODB_URI`).

## Going live

1. **MongoDB Atlas** (free M0): create a cluster + database user, allow network access, and put the connection string in `MONGODB_URI`.
2. **Cloudinary**: fill `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Set fresh random `SESSION_SECRET` and `AADHAAR_SECRET` (32+ chars). **Never change `AADHAAR_SECRET` after real data exists**: stored Aadhaar numbers can't be decrypted without it.
4. Set `ADMIN_EMAILS` to the office's email(s) and `SUPER_ADMIN_EMAILS` to whoever may change the fee / QR.
5. Deploy (e.g. Vercel): add the same env vars there.

## Where things are

- Text in both languages: `src/lib/i18n.ts`
- Society details (reg. no., phones): `src/lib/society.ts`
- Form fields + validation: `src/lib/validation.ts`, `src/components/application-form.tsx`
- Server actions: `src/app/actions/`
- Logo: `public/logo.png` (round, transparent) is used everywhere; `src/app/icon.png` is the browser-tab icon.
  The current file was cut from a small screenshot — replace both with a sharper copy of the logo when available.
- Colours / fonts: `src/app/globals.css` (`@theme`) and `src/app/layout.tsx`.
