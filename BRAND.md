# HIMMER — Launch Film Brief

## 1. Product in one sentence
HIMMER lets students print from their phone at any partner print shop: scan the shop's QR, upload, see the exact price, pay by UPI, and pick up the printout. No app install, and no WhatsApp back-and-forth.

## 2. Promise
**Print from your phone. No WhatsApp. No waiting.**
(Alt: "From your phone. To the page. Just like that." is the existing site hero.)

## 3. Audience
- **Who:** College students, plus coaching and school students [TO CONFIRM: your answer said "coders and high coders"; I read this as coaching and high-school students]. Based in Tier-2/3 India, starting in Yavatmal, Maharashtra. These are places where print queues build up around campuses.
- **Secondary:** Print and Xerox shop owners who want a shorter queue. They run HIMMER on the PC and printer they already have.
- **Pain, in their words:** "I send the PDF on WhatsApp and wait for minutes in the crowd. When it's urgent, it's the worst."
- **Old way:** WhatsApp or email the file to the shop, wait for the shopkeeper to find it, then guess the price and pay. There is no app competitor today.

## 4. Hero features
| # | User benefit | Screen / route | Wow moment to film |
|---|---|---|---|
| 1 | Print without installing anything | Shop QR display at `/kiosk/[shopId]` → phone camera at `/app/scan` | Phone points at the "PRINTER READY" QR and the app opens instantly on the shop |
| 2 | Know the exact price before paying | Print options at `/app/print` | Toggle B&W → Colour, copies 1 → 3, and the ₹ total updates live and locks |
| 3 | No waiting at the counter | Live tracking at `/j/[jobId]` (`/app/history/[jobId]`) | "Printing now…" on the phone, then a match cut to real paper sliding out of the printer |

## 5. Proof points
- 60+ real print jobs completed at a pilot shop in Yavatmal (job history screen; prices ₹3–6).
- The shop is live: real kiosk QR shows "PRINTER READY".
- No testimonials, user counts, or awards yet. Do not imply any.

## 6. Call to action, URL, launch date
- **CTA:** "Scan. Pay. Print." → **himmer.in**
- **Secondary CTA (shop owners):** "Run a print shop? Get HIMMER." [TO CONFIRM: include it or not]
- **Launch date:** [TO CONFIRM]

## 7. Visual identity
- **Colors:**
  - Emerald `#00CE68` (brand / accent)
  - Forest `#052E1B` (primary, dark backgrounds)
  - Canvas `#F6F7F2` (light background)
  - Ink `#162D24` (text)
  - Mint `#E6FAF1` (soft fill)
  - Emerald pressed `#00A854`
  - Secondary label `#5B6961`
- **Font:** Manrope (wordmark at 600, letter-spacing -0.03em; headlines 600–700).
- **Logos:** `apps/web/public/HIMMER_Manrope_Brand_Kit/` (horizontal / stacked / wordmark / symbol, in light, dark, white and black SVG). Copies are also in `launch-video-assets/04-brand-kit/`.
- **UI mode:** Light, soft cards, 1rem radius, gentle shadows. Use Forest green for end cards and the CTA.
- **Motion style:** Calm and precise. Smooth eased slides and scale-ups of phone UI, number roll-ups on the price, and match cuts from phone to paper. No glitch, shake, or heavy 3D.
- **Format:** 16:9 YouTube layout (1920×1080 master), posted first on Instagram. Keep key text and the phone UI inside a center-safe area so a 9:16 or 4:5 crop still works.

## 8. Tone of voice
- **Adjectives:** calm, fast, local.
- **Do:**
  - Short two-beat lines with full stops.
  - Plain words.
  - Show real shops and real paper.
  - Name the shop.
- **Don't:**
  - Hype ("revolutionary", "AI-powered").
  - "Instant" or "free" claims.
  - Invented numbers.
  - Show kiosk hardware as the product.
- **Sample on-screen lines:**
  1. "No WhatsApp. No waiting."
  2. "Know the price. Then press print."
  3. "From your phone. To the page."

## 9. Mood and references
- Apple "Shot on iPhone" style: real people, real places, clean type over footage.
- Zepto / Blinkit: fast, everyday, Indian-local.
- Arc: problem (crowded counter, WhatsApp chaos) → calm phone flow → paper in hand → shop owner's quiet queue → CTA.

## 10. Music direction
- **Genre:** Warm minimal electronic / lo-fi house, with light percussion and no vocals.
- **BPM:** 100–120.
- **Drop:** On the first printed page sliding out of the printer (around 60–65% of runtime). Keep it quiet and tense during the "problem" opening.

## 11. Asset checklist
**In the repo:**
- Logos and symbols in every color variant, plus brand tokens.
- 30 stills in `launch-video-assets/` (marketing, student flow, vendor dashboard, kiosk). See `ASSET-MANIFEST.md`.

**Still needed:**
- [ ] Screen recordings (not stills) at 2x / 60fps: QR scan → shop opens, print options with price change, pay → "Printing now" → "Printed".
- [ ] Real footage: crowded shop counter, a student on WhatsApp waiting, a phone scanning the shop QR, paper coming out of the printer, a hand picking it up.
- [ ] Shop owner B-roll: the dashboard on the shop PC, a calm counter.
- [ ] Logo exports at 2x (PNG 3840 wide) for the end card.
- [ ] Blur the email and phone on `07-profile.jpg`.
- [ ] Music track license.

## 12. Open questions
1. Audience wording: does "coders / high coders" mean coaching and high-school students?
2. Launch date?
3. Include a shop-owner CTA in this film, or keep it student-only?
4. Real user name ("Pranav") on screens: show it, or blur it? (Shop name "kaka": show, as confirmed.)
5. Video length: 45s, 60s, or 90s?
