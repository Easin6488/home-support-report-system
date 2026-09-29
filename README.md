# Home Support Report Management System

A responsive Supabase-powered Engineer Work & Report Management System.

## Included
- Admin Dashboard
- Engineer Login
- Daily Report Entry
- Ticket Management
- Customer Management
- Engineer-wise / Date-wise reports
- Search / Filter / Sort
- Excel download
- PDF download
- Admin full edit/delete access
- Report sheet customization
- Supabase database
- Role-based access with Row Level Security
- Responsive desktop/mobile UI

## Stack
- Vite + React
- Supabase Auth + PostgreSQL + RLS
- XLSX for Excel export
- jsPDF + AutoTable for PDF export

## Setup

### 1. Create Supabase project
Create a project at https://supabase.com/

### 2. Create database
Open Supabase SQL Editor and run:

`supabase/schema.sql`

This creates tables, indexes, functions and RLS policies.

### 3. Enable email/password authentication
Supabase Dashboard -> Authentication -> Providers -> Email.

For testing, you can disable email confirmation. For production, keep email confirmation enabled.

### 4. Configure the frontend
Copy:

`src/config.example.js` -> `src/config.js`

Then put your:
- Supabase Project URL
- Supabase anon/public key

Never put the service-role key in this frontend.

### 5. Install and run
```bash
npm install
npm run dev
```

### 6. Create the first Admin
Create a user from Supabase Authentication -> Users.

Then in SQL Editor run:
```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_ADMIN_EMAIL';
```

### 7. Deploy
Build:
```bash
npm run build
```

Deploy the `dist` folder to Vercel, Netlify, GitHub Pages, Cloudflare Pages, or another static host.

## Important
The frontend uses Supabase RLS. The browser must only use the anon/public key. Do not expose the service-role key.

## Default workflow
Admin:
- manage engineers
- manage customers
- manage tickets
- edit/delete reports
- customize report columns

Engineer:
- login
- create/update own daily reports
- create/update tickets
- view customers/tickets/reports according to RLS

