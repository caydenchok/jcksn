# ZERO88 Property — Marketing & SEO Readiness

Your public page lives at **`/p`** (e.g. `http://localhost:3000/p` in dev). This is the link you share on Facebook, WhatsApp status, business cards, etc.

## ✅ What's already done (in code)

- **Brand applied** — black + gold, ZERO88 logo wordmark, Jackson Liew, REN 37532, Buy/Sell/Rent, Kota Kinabalu/Sabah, Facebook + email + WhatsApp wired in.
- **Premium light design** with Igloo-style scroll animations (word reveals, parallax, count-up stats, sticky "Approach" section, reveal-on-scroll).
- **SEO** — page title, description, keywords (English + Malay), `RealEstateAgent` structured data (Google rich results), canonical URL.
- **Open Graph + Twitter cards** — when you paste your link on Facebook/WhatsApp it shows a branded black-and-gold preview image (auto-generated, no file needed).
- **Branded favicon**, `robots.txt`, `sitemap.xml`.
- Page works even before you fill Settings (falls back to ZERO88 brand info).

## 🔧 Do these to go live

1. **Fill the dashboard Settings** (`/settings`) — name, phone (`+60 17-817 3678`), email, **License No. = REN 37532**, company, tagline, bio, languages, specialities, and upload your **profile photo**. These now all show on `/p`.
2. **Add real property listings** with good photos (`/listings`). Photos are the #1 thing — bright, landscape, 1200px+ wide.
3. **Get a domain** (recommended): e.g. `zero88property.com`. Then set it once in `.env`:
   ```
   NEXT_PUBLIC_SITE_URL=https://zero88property.com
   ```
   This makes SEO links, sitemap and Facebook previews use your real URL. Until then everything still works locally.
4. **Deploy** so the link is public (Vercel is the easiest for Next.js). Right now it only runs on your computer.

## 📣 Facebook marketing checklist

- [ ] Put the `/p` link in your Facebook Page **bio / Call-to-action button** ("Send WhatsApp" or "Learn More").
- [ ] When posting a listing, paste the link — the gold preview card appears automatically. (Use Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/) to refresh the preview after changes.)
- [ ] Pin a post with your best listing + the link.
- [ ] Add the WhatsApp click-to-chat link to every post: `https://wa.me/60178173678`
- [ ] Consider a **Meta (Facebook/Instagram) Lead Ad** or **Click-to-WhatsApp ad** — these are ideal for property and send people straight to your WhatsApp.

## 🔎 Google / search checklist (after you have a domain)

- [ ] Create a free **Google Business Profile** ("Jackson Liew — ZERO88 Property, Kota Kinabalu") — huge for local property searches.
- [ ] Submit `https://yourdomain.com/sitemap.xml` in **Google Search Console**.
- [ ] Add a **Meta Pixel** and/or **Google Tag** to measure ad performance (ask and I can wire it in).

## 💡 Optional upgrades I can add on request

- Meta Pixel / Google Analytics tracking
- A lead capture form (name + phone) that saves to your dashboard
- Per-listing share images (each property gets its own Facebook preview)
- Multi-language toggle (English / 中文 / Malay)
