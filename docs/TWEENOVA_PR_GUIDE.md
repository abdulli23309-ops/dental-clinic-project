# PR: Dr. Hira's Dental Care — Complete Premium Frontend & Live CMS

## Summary
Complete rebuild of the DHDC public website with a premium white/elegant design, fully dynamic CMS, and multi-branch support.

## What Changed

### Frontend
- **Design System**: White/elegant theme with Fraunces (serif) + Manrope (sans), alternating ivory backgrounds, premium spacing.
- **Hero Section**: Two-tone headline, floating tooth PNG, glassmorphism trust card, testimonial mini-card.
- **Locations**: Multi-city filter tabs (Islamabad, Lahore, Karachi), branch cards with photos, expandable hours/details.
- **Team**: City filter tabs, doctor cards with photos, credentials, specialties.
- **Gallery**: Dynamic image grid with lightbox (from CMS).
- **Success Stories**: Reviews with 5-star ratings and Google source labels.
- **Blogs**: 3 latest posts on homepage, full blog list at `/blog`, individual posts at `/blog/[slug]`.
- **Footer**: Grouped hours, today's hours highlighted, social links from CMS.
- **Urdu Support**: Full RTL layout, translated UI labels, `dir="rtl"` applied dynamically.
- **SEO**: Dynamic metadata from CMS, JSON-LD schema, sitemap, robots.

### Backend
- **New Tables**: `gallery_images`, `reviews`, `blog_posts`, `social_links`.
- **Service Images**: Added `image_url` column to `services` table.
- **Branch Images**: Added `image_url` column to `locations` and `clinics`.
- **CMS Endpoints**: Full CRUD for gallery, reviews, blogs, social links.
- **Upload Limit**: Increased from 5MB to 20MB.
- **Working Hours**: Fixed duplicate rows, added clinic filtering, exposed ETags for cache invalidation.

### Admin Panel
- **Website CMS Tabs**: General, Homepage, About, Contact, FAQ, SEO, Success Stories, Blogs, Gallery, Social Links.
- **Team Management**: 18 doctors with photos, credentials, education, bios, branch assignments.
- **Locations Management**: 4 branches with photos, addresses, hours, city filters.
- **Services Management**: 6 services with photos and fees.

## How to Set Up (For Developers)

### 1. Clone the Repo
```
git clone https://github.com/tweenova/dental-clinic.git
cd dental-clinic
```

### 2. Backend Setup
```
cd backend
..\.venv\Scripts\pip install -r requirements.txt
```

### 3. Configure `.env`
Copy `.env.example` to `.env`, set `DATABASE_URL` to your local PostgreSQL.

### 4. Run Migrations
```
..\.venv\Scripts\alembic upgrade head
```

### 5. Seed Demo Data
```
..\.venv\Scripts\python scripts\seed_demo_data.py
```
This populates 18 doctors, 4 branches, 4 gallery images, 3 reviews, 6 services, and copies all images to the correct folders.

### 6. Start Backend
```
..\.venv\Scripts\uvicorn app.main:app --port 8000
```

### 7. Frontend Setup
```
cd frontend
npm install
npm run dev
```

### 8. Open Browser
Go to `http://localhost:3000` — you should see the exact same site as the current demo.

## How to Use the CMS

1. Log in at `http://localhost:3000/login` with admin credentials from `seed_demo_data.py` output.
2. Go to `/admin/website` to manage homepage content, gallery, reviews, blogs.
3. Go to `/admin/team` to add/edit doctors.
4. Go to `/admin/locations` to manage branches.
5. Go to `/admin/services` to manage treatments and pricing.

All changes reflect on the public site within 3 seconds (live CMS).

## Tests Passing
- `npx tsc --noEmit`: 0 errors
- `npm run build`: 52 routes
- `npm test`: 51 tests passed
- `pytest`: 493 tests passed
