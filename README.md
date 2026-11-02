# Obs checkout – prototype

Clickable prototype of a four-step webshop checkout for Obs: **Varer → Opplysninger → Levering → Betaling**.
Built with React, TypeScript and Vite, based on sketches in the Figma file
[✏️ Checkout (Arbeidsfil)](https://www.figma.com/design/uhSeFc3KfcKPC4ALrZwlw4/).

> This is a prototype. Nothing is ordered, paid or stored, and all data is test data.
> The project contains client material (Coop Sans font, logos, product images).
> Share it only with people on the project, through approved channels.

## Getting started

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install     # first time only
npm run dev     # starts the prototype at http://localhost:5173
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks and builds a static site into `dist/` |
| `npm run preview` | Serves the built site from `dist/` |

## Using the prototype

Reload the page to reset everything (cart, login, discount codes, delivery choices).

| URL parameter | What it does |
| --- | --- |
| `?steg=1` … `?steg=4` | Opens the prototype directly on a step |
| `?label=0` | Hides the pink "PROTOTYPE" ribbon (e.g. for screenshots) |

Example: `http://localhost:5173/?steg=3&label=0`

### What you can try

**Step 1 – Varer**
- Change quantities with +/− or by typing in the number.
- Stock limits: Hot Wheels 2, LEGO 10, Lysslynge 15, Okidoki 20 each. Going above shows "Ikke nok på lager" and blocks "Neste".
- Unavailable products (the sewing machine and the mug) are shown in their own section and block "Neste" until they are removed.
- Discount codes (any casing):
  - `LEGO40` – 40 % off LEGO
  - `HOTWHEELS20` – 20 % off Hot Wheels
  - `JULELYS3FOR2` – 3 for 2 on light strings (needs 3 in the cart)
  - `Bahco99`, `Jotun15`, `Bosch25` – accepted, no price effect
  - Any other code shows "Rabattkoden er ikke gyldig". Max 3 codes.

**Step 2 – Opplysninger**
- "Logg inn" simulates a member login and shows a saved address, or "Annen adresse" with its own form.
- Guest form validation (shown when leaving a field): required fields, 2–50 characters for names and address, 4-digit postcode, 8-digit phone number, valid e-mail.
- Postcode `0000` shows the "Ugyldig postnummer" message.

**Step 3 – Levering**
- The order is split into two packages, each with its own delivery options, prices and store / pickup-point dropdowns.
- The "Fra sentrallager" / "Fra Obs-butikk" tags open a dialog with FAQs.

**Step 4 – Betaling**
- Vipps and Walley are unavailable for split orders.
- "Fullfør bestilling" is enabled once the terms are accepted.

## Project structure

```
index.html          Page shell (also loads the Figma capture script)
src/App.tsx         All components, test data and logic
src/index.css       All styles
src/main.tsx        React entry point
public/assets/      Icons, logos and product images
public/fonts/       Coop Sans (licensed – do not publish)
```

See `.github/copilot-instructions.md` for code conventions.

## Publishing

The prototype is a static site (`npm run build` → `dist/`). It can be hosted on e.g. Vercel, Netlify or
Cloudflare Pages. Because it uses real Obs/Coop branding, always put it behind a login or password and
add `noindex` before sharing a link. The in-app password screen is only a casual-use barrier: its
password is included in the public JavaScript bundle, so it does not protect the site or its assets.
Use hosting-level access control for any restricted deployment.
