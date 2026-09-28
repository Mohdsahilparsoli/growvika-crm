# GrowVika CRM

GrowVika's client management software. Built with Next.js, Tailwind and Postgres (Neon). All data is stored in the database, so it's the same on every device.

## Modules
1. **Team Login** – Admin and Employee roles
2. **Dashboard** – income, pending payments, balance left, today's follow-ups, charts
3. **Client Profile** – contact details, GST, services, notes
4. **Leads Pipeline** – drag-and-drop stages, follow-ups, convert a lead to a client in one click
5. **Billing** – full payment history, a separate invoice PDF for every payment, a "Download Full Bill" PDF, send via WhatsApp/Email
6. **Communication History** – calls, meetings, WhatsApp and file records
7. **Company Account** – what came in, where and why it was spent, what's left, report PDF

## First-time setup
1. On Vercel, open the project → **Storage** → **Create Database** → **Neon** and connect it to this project. This sets `DATABASE_URL`.
2. Redeploy, then open the site. You'll see a **setup** screen to create the first admin account and company details.
3. Tables are created automatically on first use.

Optional: set `AUTH_SECRET` (any long random string) in Vercel environment variables to sign login sessions.

## Run locally
```bash
cp .env.example .env.local   # fill in DATABASE_URL
npm install
npm run dev
```

## Roles
- **Admin** – everything, including Billing, Company Account and Team & Settings
- **Employee** – only their assigned clients, leads and communication history (enforced on the server)
