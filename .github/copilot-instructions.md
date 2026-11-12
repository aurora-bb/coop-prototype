# Copilot instructions – Obs checkout prototype

Clickable prototype of a four-step checkout for Obs (Coop): Varer → Opplysninger → Levering → Betaling.
It is used for demos and user tests, not production. Keep it simple, readable and easy to change.

## Stack

- React 18 + TypeScript, built with Vite. No router, no state library, no CSS framework.
- Run with `npm run dev`; check changes with `npm run build` (type-check + build).

## Where things are

- `src/App.tsx` – everything: test data, helpers and components. Keep it in one file unless asked otherwise.
  - Test data at the top: `initialCartItems`, `coupons`, `guestFields`, `paymentOptions`,
    `packages` (with `warehouseDeliveryOptions` for Pakke 1 and `obsStoreDeliveryOptions` for Pakke 2),
    store/pickup-point pickers (`obsStorePicker`, `stovnerPostnordPicker`, `haugenstuaPostnordPicker`,
    `clickAndCollectPicker`), `shipmentFaqs` / `warehouseFaqs`.
  - Steps: `CartStep`, `DetailsStep` (uses `AddressFields`), `DeliveryStep` (uses `PackageCard`,
    `ShipmentSourceModal`), `PaymentStep`. Shared: `CheckoutHeader`, `Stepper`, `CheckoutFooter`,
    `QuantityInput`.
  - `App` holds the shared state (cart, applied coupons, delivery selections, login) and computes totals.
- `src/index.css` – all styles, grouped per step with `/* ---------- Step N ---------- */` comments.
  Shared values are CSS variables on `:root` (`--header-gutter`, `--list-inset`).
- `public/assets/` – icons, logos and product images; `public/fonts/` – Coop Sans (licensed).

## How the data works

- `CartItem` fields: `stock` (going above it shows "Ikke nok på lager" and blocks "Neste"),
  `soldOut` + optional `unavailableLabel` (moves the item to the unavailable section; tag text defaults
  to "Utsolgt"; all unavailable items get a faded image and grey text), `beforePrice` (shown as "Førpris"), `brand` / `category` (used by discount codes).
- `coupons` are keyed by lower-case code. A coupon applies to a `brand` or `category` with either
  `percentOff` or `buyXPayY`. `linePrice()` and `couponSavings()` compute prices; reuse them.
- Sold-out items are excluded from totals, delivery and payment via `inStock()`.
- Validation for address fields lives in `guestFieldError()`; field rules (`digits`, `length`) are set
  in `guestFields`. Postcode `0000` is a special "undeliverable" case shown as a status message.
- URL parameters: `?steg=1..4` opens a step; `?label=0` hides the "PROTOTYPE" ribbon.

## Conventions

- All user-facing text is Norwegian (bokmål). Code, comments and names are English.
- Prices are numbers in NOK and are formatted with `formatPrice()` (nb-NO, two decimals).
- Design values (colours, font sizes, spacing, icons) come from the Figma file
  "✏️ Checkout (Arbeidsfil)". Use the exact values from Figma; download icons into `public/assets/`
  instead of linking to Figma URLs. Reuse existing colours, e.g.:
  - text `#1f1f1f`, subtle text `#5c5c5c`, primary blue `#0059b2`, borders `#9cf` / `#d4d4d4`
  - discount `#ce4812`, danger tag `#fcccca` / `#36020b`, warning `#ffebb9` / `#372901`
- Fonts are referenced as `'Coop Sans:Regular'`, `'Coop Sans:Medium'`, `'Coop Sans:Semibold'`,
  `'Coop Sans:Bold'` (see `@font-face` at the top of `index.css`).
- Keep it accessible: real `<button>`/`<label>`/`<input>` elements, `aria-invalid` +
  `aria-describedby` for field errors, `aria-live` for messages that appear, visible focus styles.
- Mobile breakpoint is `max-width: 620px`; check that new UI works there and does not cause
  horizontal scrolling.
- Match the existing code style: functional components, no semicolons, double quotes, small comments
  only where something is not obvious.

## Don't

- Don't add backend calls, analytics or real payment/login logic.
- Don't publish the project publicly or remove the "PROTOTYPE" ribbon by default; it uses real
  client branding and a licensed font.
- Don't remove the Figma capture script from `index.html` unless asked; it is used to send screens to Figma.
