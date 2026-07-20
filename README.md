# HostelPro — Multi-Tenant Hostel Management SaaS

A SaaS platform for managing multiple hostels from a single application, powered by **Next.js 15**, **Supabase (PostgreSQL)**, and **Tailwind CSS**.

## Features

- Multi-tenant architecture with Row Level Security (RLS)
- Dashboard with real-time stats, charts, and tables
- Student directory management
- Room inventory and bed-level allocation
- Fee management and payment tracking
- Expense management with categories
- Profit dashboard with financial analytics
- Role-based access control (Super Admin, Manager, Staff)
- Secure authentication via Supabase Auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Charts | Recharts |
| Icons | Lucide React |

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### 2. Clone & Install

```bash
cd "D:\Hostel management System"
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run the migration files in order:
   - `supabase/migrations/20260101000001_initial_schema.sql`
   - `supabase/migrations/20260101000002_rls_policies.sql`
3. Run the seed data: `supabase/seed.sql`
4. Go to **Authentication > Users** and create a test user (e.g. `admin@hostelpro.com`)
5. Copy the user's UUID and run in SQL Editor:

```sql
UPDATE profiles SET role = 'hostel_super_admin', full_name = 'Alex Rivera'
WHERE id = 'YOUR_USER_UUID';

INSERT INTO hostel_members (hostel_id, user_id, role)
VALUES ('a0000000-0000-0000-0000-000000000001', 'YOUR_USER_UUID', 'hostel_super_admin');
```

### 4. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials from **Project Settings > API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your test user.

## Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────┐
│              Supabase Project               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Hostel A│  │ Hostel B│  │ Hostel C│    │
│  │ (tenant)│  │ (tenant)│  │ (tenant)│    │
│  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │          │
│  ┌────▼────────────▼────────────▼────┐    │
│  │     PostgreSQL (shared DB)        │    │
│  │  Every table has hostel_id column │    │
│  │  RLS policies enforce isolation   │    │
│  └───────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

Every business table includes a `hostel_id` foreign key. Row Level Security ensures users can only access data for hostels they belong to.

## Onboarding a New Client

To add a new hostel client:

1. Insert a row into `hostels`
2. Create an admin user via Supabase Auth
3. Link the user in `hostel_members`
4. Seed default expense categories for the new `hostel_id`

See the SQL in `supabase/seed.sql` for an example.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/              # Login page
│   ├── dashboard/          # Main dashboard
│   ├── students/           # Student directory
│   ├── rooms/              # Room inventory
│   ├── allocations/        # Room allocation
│   ├── fees/               # Fee management
│   ├── expenses/           # Expense management
│   ├── profit/             # Profit dashboard
│   └── settings/           # Hostel settings
├── components/
│   ├── layout/             # Sidebar, Header, AdminLayout
│   └── ui/                 # Reusable UI components
├── contexts/               # Auth & Hostel React contexts
├── lib/
│   ├── supabase/           # Supabase client (browser, server, middleware)
│   └── utils.ts            # Formatting helpers
└── types/                  # TypeScript type definitions
supabase/
├── migrations/             # SQL schema + RLS policies
└── seed.sql                # Demo data
```

## Roles

| Role | Access |
|------|--------|
| `platform_super_admin` | All hostels (you, the SaaS owner) |
| `hostel_super_admin` | Full access to one hostel |
| `hostel_manager` | Manage students, rooms, fees |
| `hostel_staff` | View-only or limited actions |

## License

Private — All rights reserved.
