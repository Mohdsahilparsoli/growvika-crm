# GrowVika CRM

GrowVika's client management software (demo). Built with Next.js and Tailwind. Data is saved in the browser's localStorage.

## Modules
1. **Team Login** – Admin and Employee roles
2. **Dashboard** – income, pending payments, balance left, today's follow-ups, charts
3. **Client Profile** – contact details, GST, services, notes
4. **Leads Pipeline** – drag-and-drop stages, follow-ups, convert a lead to a client in one click
5. **Billing** – full payment history, a separate invoice PDF for every payment, a "Download Full Bill" PDF, send via WhatsApp/Email
6. **Communication History** – calls, meetings, WhatsApp and file records
7. **Company Account** – what came in, where and why it was spent, what's left, report PDF

## Demo logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@growvika.com | admin123 |
| Employee | riya@growvika.com | riya123 |

## Run locally
```bash
npm install
npm run dev
```

> Note: This is a demo. Data is stored only in the browser you use (localStorage). For real use, add a database (e.g. Supabase/Postgres) and proper authentication.
