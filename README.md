# Growvika CRM

Growvika ka personal client management software (demo). Next.js + Tailwind. Data browser ke localStorage mein save hota hai.

## Modules
1. **Team Login** – Admin aur Employee roles
2. **Dashboard** – kamai, pending payments, bacha hua amount, aaj ke follow-ups, charts
3. **Client Profile** – contact, GST, services, notes
4. **Leads Pipeline** – drag & drop stages, follow-ups, lead ko ek click mein client banana
5. **Billing** – har payment ki history, har payment ka alag invoice PDF, "Download Full Bill" PDF, WhatsApp/Email send
6. **Communication History** – calls, meetings, WhatsApp, files ka record
7. **Company Account** – kitna aaya, kahan aur kyun kharch hua, kitna bacha, report PDF

## Demo logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@growvika.com | admin123 |
| Employee | riya@growvika.com | riya123 |

## Chalana
```bash
npm install
npm run dev
```

> Note: Ye demo hai. Data sirf usi browser mein save hota hai (localStorage). Real use ke liye database (jaise Supabase/Postgres) aur proper authentication lagana hoga.
