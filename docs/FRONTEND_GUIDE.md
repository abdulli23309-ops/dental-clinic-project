# Dr. Hira's Dental Care — Administrator & CMS Operations Guide

Welcome to the administrative portal for Dr. Hira's Dental Care. This guide walks you through everyday clinic operations: updating branding, managing doctors and staff, showcasing clinic photos, moderating patient reviews, setting treatment prices, and customizing homepage copy.

---

## Table of Contents
1. [Logging in to the Admin Dashboard](#1-logging-in-to-the-admin-dashboard)
2. [Updating the Clinic Logo & Branding](#2-updating-the-clinic-logo--branding)
3. [Editing Homepage Hero Messaging](#3-editing-homepage-hero-messaging)
4. [Managing Treatments & Procedure Prices](#4-managing-treatments--procedure-prices)
5. [Managing Team Members & Doctor Profiles](#5-managing-team-members--doctor-profiles)
6. [Managing the "Inside Our Modern Clinic" Gallery](#6-managing-the-inside-our-modern-clinic-gallery)
7. [Managing Patient Reviews (Success Stories)](#7-managing-patient-reviews-success-stories)
8. [Frequently Asked Questions & Tips](#8-frequently-asked-questions--tips)

---

## 1. Logging in to the Admin Dashboard

1. Open your browser and navigate to the clinic website:
   - **Local / Staging:** `http://localhost:3000/login`
   - **Production:** `https://your-domain.com/login`
2. Enter your administrative credentials:
   - **Email:** Your clinic administrator email (e.g., `admin@marlowdental.com`)
   - **Password:** Your administrator password
3. Click **Sign In**.
4. Upon successful authentication, you will be redirected to the main administrative portal (`/admin`).

> **Tip:** You can switch between Light and Dark themes anytime by clicking the crescent moon / sun icon in the top right corner of the dashboard.

---

## 2. Updating the Clinic Logo & Branding

1. In the left navigation sidebar, click **Website CMS** (`/admin/website`).
2. Select the first tab: **General & Branding**.
3. Under **Clinic Logo**:
   - Click the **Choose Photo File** button.
   - Select your logo image (supported formats: PNG, WebP, SVG, JPG up to 15MB).
   - **Best Practice:** Use a transparent PNG or SVG logo. A transparent background ensures your logo seamlessly blends into both the light header and dark mode without white box borders.
4. You will see an immediate preview of the uploaded logo.
5. In the same tab, verify or update your **Practice Name**, **Short Brand Name**, **Phone Number**, **Email**, and **Physical Address**.
6. Click **Save Changes** at the bottom of the section.
7. Your changes are saved to PostgreSQL and immediately reflected on the public website header and footer.

---

## 3. Editing Homepage Hero Messaging

1. Navigate to **Website CMS** (`/admin/website`).
2. Click the **Homepage Hero** tab.
3. You can edit:
   - **Hero Eyebrow:** Short intro badge above the main title (e.g., *World-Class Dentistry in Islamabad*).
   - **Hero Heading:** Main headline (e.g., *Precision Care, Confident Smiles*).
   - **Hero Description:** Explanatory copy describing the clinic's philosophy and comfort.
   - **Primary CTA Text & Link:** E.g., *Book an Appointment* pointing to `/book`.
   - **Secondary CTA Text & Link:** E.g., *Explore Treatments* pointing to `/#treatments`.
   - **Hero Photo:** Upload a high-resolution photo of Dr. Hira or the main clinic arch frame.
4. Click **Save Changes**.

---

## 4. Managing Treatments & Procedure Prices

1. In the left navigation sidebar, click **Services & Fees** (`/admin/services`).
2. You will see all categorized clinical procedures:
   - **Preventive** (Cleanings, Exams, Fluoride)
   - **Restorative** (Fillings, Crowns, Bridges, Root Canals)
   - **Cosmetic** (Teeth Whitening, Veneers, Smile Makeovers)
   - **Emergency** (Toothache Relief, Urgent Extractions)

### Adding a New Treatment:
1. Click the **+ Add Service** button in the upper right.
2. Fill out the service details:
   - **Title:** e.g., *Porcelain Dental Veneers*
   - **Category:** Select category from dropdown.
   - **Slug:** URL identifier (e.g., `porcelain-veneers`).
   - **Cash Fee:** Displayed transparent pricing (e.g., `PKR 25,000` or `$450`).
   - **Duration:** Estimated chair time (e.g., `60 mins`).
   - **Short Summary:** Brief description shown on the homepage card.
   - **Full Clinical Description:** Detailed procedure explanation.
   - **Service Photo:** Click **Choose File** to upload a clinical image (up to 15MB).
   - **Highlight as Featured Treatment:** Check this box if you want this service displayed prominently in the homepage Treatments carousel.
   - **Offering Clinics & Assigned Doctors:** Check the branches and clinicians authorized to perform this treatment.
3. Click **Save Service** (the sticky button at the bottom of the modal).

### Editing Prices or Existing Treatments:
1. Locate the treatment card in the list.
2. Click the **Edit** button.
3. The modal will open with internal scrolling.
4. Modify the fee in the **Cash Fee** field or update duration, description, or photo.
5. Click **Update Service** at the bottom.

---

## 5. Managing Team Members & Doctor Profiles

1. In the left navigation sidebar, click **Team Members** (`/admin/team`).
2. You can view all existing clinical staff and doctors.

### Adding a Doctor or Specialist:
1. Click **+ Add Team Member**.
2. Complete the form:
   - **Full Name:** e.g., *Dr. Hira*
   - **Display Name:** e.g., *Dr. Hira BDS, RDS*
   - **Professional Title:** e.g., *Lead Dental Surgeon & Aesthetic Specialist*
   - **Role:** Select *Doctor*, *Specialist*, or *Director*.
   - **Photo Upload:** Click **Choose Photo File** and select a portrait photo (up to 15MB).
   - **Biography & Philosophy:** Clinical education, alma mater, and patient care focus.
   - **Assigned Branch / Location:** Select which clinic location the doctor practices at.
   - **Active Status:** Ensure the toggle is checked so the profile appears publicly.
3. Click **Save Team Member**.
4. The doctor will immediately appear on the public homepage **Our Team** carousel and in the appointment booking flow.

---

## 6. Managing the "Inside Our Modern Clinic" Gallery

1. Navigate to **Website CMS** (`/admin/website`).
2. Click the **Gallery** tab (indicated by the camera/image icon).
3. **Uploading a New Photo:**
   - Under **Upload Clinic Gallery Photo**, click **Choose Photo File**.
   - Select a high-resolution photo of an operatory suite, sterilization bay, consultation room, or modern dental chair.
   - Enter an **Optional Caption / Title** (e.g., *Endodontic Microsurgery Suite* or *Serene Patient Lounge*).
   - Click **Add to Gallery**.
4. **Managing Existing Photos:**
   - Below the form, you will see all active photos in the **Active Gallery Photos** grid.
   - Each photo displays its thumbnail, caption, and order index.
   - To remove a photo from the gallery, simply click the red **Delete** button on that card.
5. **Public Experience:**
   - On the homepage, visitors see a modern responsive grid layout.
   - Clicking any photo opens a full-screen **Lightbox view** displaying the image in high-definition. Clicking anywhere closes the lightbox.
   - If no gallery images are uploaded, the section automatically hides itself cleanly without blank spaces.

---

## 7. Managing Patient Reviews (Success Stories)

1. Navigate to **Website CMS** (`/admin/website`).
2. Click the **Success Stories** tab.
3. **Adding a Patient Review:**
   - **Patient Name:** e.g., *Ayesha Khan* or *Zainab M.*
   - **Star Rating:** 1 to 5 stars (defaults to 5).
   - **Review Text:** Quote of what the patient said about their comfort, painless procedure, or smile transformation.
   - **Source:** Select or type source (e.g., *Google Review*, *Direct Feedback*, *Verified Patient*).
   - **Published Toggle:** Check to make visible on public website.
   - Click **Add Review**.
4. **Deleting / Unpublishing Reviews:**
   - Click **Delete** to permanently remove outdated feedback.

---

## 8. Frequently Asked Questions & Tips

- **Image Formats & Size:** The system supports images up to **15 MB**. For fastest page loads, JPG or WebP is recommended for photos, and transparent PNG is recommended for logos.
- **Immediate Live Updates:** All changes in the CMS update the PostgreSQL database in real-time. If you have the public website open in another tab, refresh the page to see your newest edits.
- **Safety & Backups:** Deleting an item permanently removes it from the database. If you only want to temporarily pause a service or doctor, you can uncheck the **Active / Public** checkbox instead of deleting.
