import {
  Dispatch,
  FormEvent,
  Fragment,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"

// Prototype of the multistep webshop checkout.
// Steps 1–3 follow the Figma Make prototype ("Checkout - Split order"),
// step 4 follows the payment sketch (node 168:16122).

const steps = ["Varer", "Opplysninger", "Levering", "Betaling"]

const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`

type CheckoutVariant =
  | "guest"
  | "logged-in"
  | "click-and-collect"
  | "click-and-collect-logged-in"
  | "heat-pump"
  | "heat-pump-logged-in"

const isPreLoggedInVariant = (variant: CheckoutVariant) =>
  variant === "logged-in" ||
  variant === "click-and-collect-logged-in" ||
  variant === "heat-pump-logged-in"
const isClickAndCollectVariant = (variant: CheckoutVariant) =>
  variant === "click-and-collect" ||
  variant === "click-and-collect-logged-in"
const isHeatPumpVariant = (variant: CheckoutVariant) =>
  variant === "heat-pump" || variant === "heat-pump-logged-in"

type DeliveryOption = {
  id: string
  title: string
  description: string
  extra?: string
  price: number
  // Dropdown shown under the option while it's selected.
  picker?: DeliveryPicker
}

const heatPumpDeliveryOption: DeliveryOption = {
  id: "installer",
  title: "Leveres av montør",
  description:
    "Du vil bli kontaktet av butikk for å avtale levering og montering",
  price: 0,
}

type GeneralWarningSeverity = "info" | "warning" | "critical"

const generalWarningContent: Record<
  GeneralWarningSeverity,
  { title: string; description: string; icon: string }
> = {
  info: {
    title: "Planlagt vedlikehold",
    description:
      "Vi vedlikeholder våre systemer i kveld mellom kl. 22:00 og 23:00. Forsinkelser kan forekomme.",
    icon: "general-warning-info.svg",
  },
  warning: {
    title: "Planlagt vedlikehold",
    description:
      "Vi vedlikeholder våre systemer i kveld mellom kl. 22:00 og 23:00. Forsinkelser kan forekomme.",
    icon: "general-warning-warning.svg",
  },
  critical: {
    title: "Kortbetaling midlertidig ute av drift",
    description:
      "Betaling med Visa og Mastercard er for øyeblikket utilgjengelig.",
    icon: "general-warning-critical.svg",
  },
}

function GeneralWarning({ severity }: { severity: GeneralWarningSeverity }) {
  const content = generalWarningContent[severity]

  return (
    <div
      className={`status-message-general status-message-general-${severity}`}
      role={severity === "critical" ? "alert" : "status"}
    >
      <img src={assetUrl(`assets/${content.icon}`)} alt="" />
      <div>
        <p className="status-message-general-heading">{content.title}</p>
        <p>{content.description}</p>
      </div>
    </div>
  )
}

type DeliveryPicker = {
  label?: string
  ariaLabel: string
  choices: { value: string; label: string }[]
}

// Package 2: nearby Postnord pickup points, and stores for Klikk og hent.
const haugenstuaPostnordPicker: DeliveryPicker = {
  ariaLabel: "Velg hentested",
  choices: [
    "Nærbutikken Stovner",
    "Pakkeautomat Kiwi Haugenstua",
    "Pakkeautomat Smedstua",
    "Pakkeautomat Maria Dehlisvei 45",
    "Pakkeautomat Tante Ulrikkes V 3",
    "Pakkeautomat Høybråtveien 1",
    "Pakkeautomat Høybråten Stasjon",
    "Pakkeautomat Høybråtenveien 21",
    "Pakkeautomat Hagastubben",
  ].map((label) => ({ value: label, label })),
}

const clickAndCollectPicker: DeliveryPicker = {
  ariaLabel: "Velg butikk",
  choices: ["Obs Haugenstua", "Obs Rygge"].map((label) => ({
    value: label,
    label,
  })),
}

const clickAndCollectDeliveryOption: DeliveryOption = {
  id: "pickup",
  title: "Klikk og hent",
  description:
    "Normalt klar for henting innen 2 timer innenfor butikkens åpningstid.",
  extra: "Du får SMS når varene er klare for henting.",
  price: 0,
  picker: clickAndCollectPicker,
}

// Package 1: Obs stores it can be sent to, and nearby Postnord pickup points.
const obsStorePicker: DeliveryPicker = {
  ariaLabel: "Velg butikk",
  choices: [
    "Obs Haugenstua",
    "Obs Alnabru",
    "Obs Lillestrøm",
    "Obs Vinterbro",
    "Obs Jessheim",
    "Obs Slitu",
    "Obs Buskerud",
    "Obs Rygge",
    "Obs Fredrikstad",
    "Obs Sandefjord",
  ].map((label) => ({ value: label, label })),
}

const stovnerPostnordPicker: DeliveryPicker = {
  ariaLabel: "Velg hentested",
  choices: [
    "Nærbutikken Stovner",
    "Rema 1000 Nedre Rommen",
    "Nærbutikken Grorud",
    "Extra Furuset",
    "Joker Starveien",
    "Rema 1000 Ellingsrud",
    "Coop Extra Grorud",
    "Rema 1000 Karihaugen",
    "Narvesen Ammerud",
  ].map((label) => ({ value: label, label })),
}

// Package 2 is sent from an Obs store.
const obsStoreDeliveryOptions: DeliveryOption[] = [
  {
    id: "postnord",
    title: "Postnord Hentested",
    description: "Normal leveringstid er 3-7 virkedager.",
    extra: "Du vil motta en melding fra Postnord når pakken er klar for henting.",
    price: 89.1,
    picker: haugenstuaPostnordPicker,
  },
  {
    id: "home",
    title: "Hjemlevering",
    description: "Innen 2-7 virkedager",
    extra:
      "Leveres til gateplan. Du vil motta en melding fra Postnord når pakken er klar for levering.",
    price: 122.85,
  },
  clickAndCollectDeliveryOption,
]

// Package 1 is sent from the central warehouse.
const warehouseDeliveryOptions: DeliveryOption[] = [
  {
    id: "store",
    title: "Sendt til Obs Butikk",
    description: "Normalt kan du hente varene etter 2-7 virkedager.",
    extra: "Du får SMS når varene er klare for henting.",
    price: 0,
    picker: obsStorePicker,
  },
  {
    id: "postnord",
    title: "Postnord Hentested",
    description: "Normal leveringstid er 3-7 virkedager.",
    extra: "Du vil motta en melding fra Postnord når pakken er klar for henting.",
    price: 149,
    picker: stovnerPostnordPicker,
  },
]
const clickAndCollectVariantOptions = [
  clickAndCollectDeliveryOption,
  warehouseDeliveryOptions[0],
  warehouseDeliveryOptions[1],
  obsStoreDeliveryOptions[1],
]
const packages = [
  {
    source: "Fra sentrallager",
    productIds: [3, 5, 6],
    options: warehouseDeliveryOptions,
  },
  {
    source: "Fra Obs-butikk",
    productIds: [1, 2, 4],
    options: obsStoreDeliveryOptions,
  },
]
const heatPumpPackages = [
  {
    source: "Fra Obs-butikk",
    productIds: [8],
    options: [heatPumpDeliveryOption],
  },
]

// Pre-selected option for each package.
const defaultDeliverySelections = ["store", "postnord"]
const defaultSelectedStores = ["Obs Alnabru", "Obs Haugenstua"]

type CartItem = {
  id: number
  quantity: number
  name: string
  price: number
  image: string
  url: string
  sku: string
  size?: string
  color?: string
  brand?: string
  category?: string
  memberDeal?: boolean
  memberPrice?: number
  weight?: number
  height?: number
  length?: number
  width?: number
  // Sold-out items stay in the cart with an "Utsolgt" tag, but aren't
  // counted in totals, delivery or payment.
  soldOut?: boolean
  // Tag text for an unavailable item; defaults to "Utsolgt".
  unavailableLabel?: string
  // Units available. Quantity controls stop at this limit; manually entering
  // a higher quantity shows the stock warning and blocks "Neste".
  stock?: number
}

const inStock = (items: CartItem[]) => items.filter((item) => !item.soldOut)
const withMembershipPricing = (items: CartItem[], isLoggedIn: boolean) =>
  items.map((item) =>
    item.memberPrice === undefined
      ? item
      : {
          ...item,
          price: isLoggedIn ? item.memberPrice : item.price,
          memberDeal: isLoggedIn,
        },
  )
const guestUnavailableProductId = 4
const unavailableProductLabel = "Kan ikke leveres"

const overStock = (item: CartItem) =>
  item.stock !== undefined && item.quantity > item.stock
const atStockLimit = (item: CartItem) =>
  item.stock !== undefined && item.quantity >= item.stock

const initialCartItems: CartItem[] = [
  {
    id: 1,
    quantity: 1,
    name: "Okidoki Ullio ulltrøye barn",
    price: 299,
    image: assetUrl("assets/products/okidoki-ullio-ulltroye.jpg"),
    url: "https://www.obs.no/klar/barneklar/ull-barn/ulltroyer-barn/2893465?v=Obs-7025180737136",
    sku: "7025180737136",
    size: "2–3 år",
    color: "Grønn",
    memberPrice: 149.5,
    weight: 0.1,
    height: 16,
    length: 10,
    width: 6,
    stock: 20,
  },
  {
    id: 2,
    quantity: 1,
    name: "Okidoki Ullio ullongs barn",
    price: 299,
    image: assetUrl("assets/products/okidoki-ullio-ullongs.jpg"),
    url: "https://www.obs.no/klar/barneklar/ull-barn/ullongs-og-ullstrompebukser-barn/2893463?v=Obs-7025180737372",
    sku: "7025180737372",
    size: "2–3 år",
    color: "Grønn",
    memberPrice: 149.5,
    weight: 0.12,
    height: 16,
    length: 10,
    width: 6,
    stock: 20,
  },
  {
    id: 3,
    quantity: 1,
    name: "LEGO® Friends Isbilen i Heartlake City 42644",
    price: 279,
    image: assetUrl("assets/products/lego-friends-isbil.jpg"),
    url: "https://www.obs.no/leker/lego/lego-friends/2878262?v=Obs-5702017783734",
    sku: "5702017783734",
    brand: "LEGO",
    weight: 0.3,
    height: 4,
    length: 26,
    width: 19,
    stock: 10,
  },
  {
    id: 4,
    quantity: 1,
    name: "Hot Wheels® julekalender 2026",
    price: 399,
    image: assetUrl("assets/products/hot-wheels-julekalender.jpg"),
    url: "https://www.obs.no/fest-og-hoytid/jul/julekalender/3004575?v=Obs-194735363384",
    sku: "194735363384",
    brand: "Hot Wheels",
    weight: 0.9,
    height: 4,
    length: 45,
    width: 30,
    stock: 2,
  },
  {
    id: 5,
    quantity: 1,
    name: "Lysslynge med LED-lys",
    price: 99.9,
    image: assetUrl("assets/products/lysslynge-led.jpg"),
    url: "https://www.obs.no/fest-og-hoytid/jul/julelys/2804537?v=Obs-8720573808125",
    sku: "8720573808125",
    size: "6 m – 80 lys",
    color: "Varmhvit",
    category: "julelys",
    weight: 0.18,
    height: 17,
    length: 10,
    width: 7,
    stock: 15,
  },
  {
    id: 6,
    quantity: 1,
    name: "Brother CS10S symaskin",
    price: 1953,
    image: assetUrl("assets/products/brother-cs10s-symaskin.jpg"),
    url: "https://www.obs.no/elektronikk/symaskin/2088120?v=Obs-4977766808408",
    sku: "4977766808408",
    color: "Hvit",
    brand: "Brother",
    weight: 6.32,
    height: 22,
    length: 46,
    width: 37,
    soldOut: true,
  },
  {
    id: 7,
    quantity: 1,
    name: "BC Home Krus Lykken Pappa",
    price: 49,
    image: assetUrl("assets/products/bc-home-krus-lykken-pappa.jpg"),
    url: "https://www.obs.no/kjokkenutstyr/borddekking/krus/2810188?v=Obs-7070056142675",
    sku: "7070056142675",
    size: "2,5 dl",
    color: "Beige",
    brand: "BC Home",
    soldOut: true,
    unavailableLabel: unavailableProductLabel,
  },
]

const heatPumpCartItems: CartItem[] = [
  {
    id: 8,
    quantity: 1,
    name: "Mitsubishi Kaiteki 6600 varmepumpe, ferdig montert",
    price: 25549,
    image: assetUrl("assets/products/mitsubishi-kaiteki-6600.jpg"),
    url: "https://www.obsbygg.no/varme/varmepumpe/2246343?v=ObsBygg-95905",
    sku: "95905",
    color: "Hvit",
    brand: "Mitsubishi Electric",
    category: "Varmepumpe",
  },
]

// All guest fields are required. The error text follows the Figma error
// state (node 182:133542): "<Feltnavn> må fylles ut".
const guestFields = [
  { name: "firstName", label: "Fornavn", type: "text", length: [2, 50] },
  { name: "lastName", label: "Etternavn", type: "text", length: [2, 50] },
  { name: "address", label: "Adresse", type: "text", length: [2, 50] },
  { name: "postalCode", label: "Postnummer", type: "text", digits: 4 },
  { name: "city", label: "Poststed", type: "text" },
  {
    name: "phone",
    label: "Telefonnummer",
    type: "tel",
    prefix: "+47",
    digits: 8,
  },
  { name: "email", label: "E-post", type: "email" },
]

type GuestField = (typeof guestFields)[number]

// Something@domain.tld, where the ending (.no, .com …) has at least 2 letters.
const emailPattern = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-zA-Z]{2,}$/

// Error text for a guest field, or "" when the value is valid.
const guestFieldError = (field: GuestField, value = "") => {
  if (!value.trim()) return `${field.label} må fylles ut`
  // Text fields with a length range, e.g. 2–50 characters.
  if (field.length) {
    const [min, max] = field.length
    const length = value.trim().length
    if (length < min || length > max) {
      return `${field.label} må inneholde ${min}-${max} bokstaver`
    }
  }
  // Digit-only fields (postnummer, telefonnummer) need an exact length.
  if (field.digits && value.length !== field.digits) {
    return `${field.label} må inneholde ${field.digits} numre`
  }
  if (field.name === "email" && !emailPattern.test(value.trim())) {
    return "E-post må være et gyldig format. Den må inneholde @ og f.eks. .com eller .no."
  }
  return ""
}

// Order and availability as in the payment sketch: Vipps and Walley can't
// pay for orders that are split into several shipments, and Coopay requires
// a logged-in member.
const paymentOptions = [
  {
    id: "coopay",
    title: "Coopay",
    description: "Betal raskt og enkelt med Coop-appen",
    loggedOutDescription:
      "For å betale med Coopay må du være logget inn som medlem og ha aktivert Coopay i Coop-appen",
  },
  {
    id: "card",
    title: "Kort",
    description: "Betal med Visa, Coop Mastercard eller vanlig Mastercard",
  },
  {
    id: "vipps",
    title: "Vipps",
    description:
      "Vipps støtter foreløpig ikke betaling av ordre som deles opp i flere leveranser",
    unavailable: true,
  },
  {
    id: "walley",
    title: "Walley",
    description:
      "Walley støtter foreløpig ikke betaling av ordre som deles opp i flere leveranser",
    unavailable: true,
  },
]

const formatPrice = (value: number) =>
  new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

// Discount codes are matched case-insensitively by their lower-case key.
// A code applies to products of a brand or a category, either as a
// percentage off or as a "buy X, pay for Y" deal (counted per product line).
// Codes without a rule are accepted but don't change any prices.
type Coupon = {
  code: string
  brand?: string
  category?: string
  percentOff?: number
  buyXPayY?: [number, number]
}

const coupons: Record<string, Coupon> = {
  bahco99: { code: "Bahco99" },
  jotun15: { code: "Jotun15" },
  bosch25: { code: "Bosch25" },
  lego40: { code: "LEGO40", brand: "LEGO", percentOff: 40 },
  hotwheels20: { code: "HOTWHEELS20", brand: "Hot Wheels", percentOff: 20 },
  julelys3for2: { code: "JULELYS3FOR2", category: "julelys", buyXPayY: [3, 2] },
}

const couponLabel = (coupon: Coupon) =>
  coupon.buyXPayY
    ? `${coupon.buyXPayY[0]} for ${coupon.buyXPayY[1]}`
    : `-${coupon.percentOff} %`

const roundPrice = (value: number) => Math.round(value * 100) / 100

// Line price for a cart item after the applied codes. `eligible` is the
// first applied code that covers the product; `coupon` is set only when it
// actually lowers the price (a 3 for 2 needs at least 3 items).
const linePrice = (item: CartItem, appliedCoupons: string[]) => {
  const full = item.price * item.quantity
  const eligible = appliedCoupons
    .map((code) => coupons[code.toLowerCase()])
    .find(
      (c) =>
        c &&
        (c.percentOff || c.buyXPayY) &&
        ((c.brand && c.brand === item.brand) ||
          (c.category && c.category === item.category)),
    )

  let price = full
  if (eligible?.percentOff) {
    price = roundPrice(full * (1 - eligible.percentOff / 100))
  } else if (eligible?.buyXPayY) {
    const [buy, pay] = eligible.buyXPayY
    const freeUnits = Math.floor(item.quantity / buy) * (buy - pay)
    price = roundPrice((item.quantity - freeUnits) * item.price)
  }

  return {
    full,
    price,
    coupon: price < full ? eligible : undefined,
  }
}

// Total saved per applied code, for the price summaries.
const couponSavings = (items: CartItem[], appliedCoupons: string[]) =>
  appliedCoupons
    .map((code) => ({
      code,
      amount: items.reduce((sum, item) => {
        const line = linePrice(item, appliedCoupons)
        return line.coupon?.code === code ? sum + line.full - line.price : sum
      }, 0),
    }))
    .filter(({ amount }) => amount > 0)

function CheckoutHeader() {
  // The USPs scroll away; only the logo bar is sticky (see .checkout-header).
  return (
    <>
      <div className="usp-bar">
        {[
          "Kjøpeutbytte som Coop-medlem",
          "Klikk og hent innen 2 timer",
          "120 dager åpent kjøp",
          "Hent i butikk - gratis og enkelt",
        ].map((usp) => (
          <span key={usp}>
            <img src={assetUrl("assets/usp-check.svg")} alt="" />
            {usp}
          </span>
        ))}
      </div>
      <header className="checkout-header brand-bar">
        <img src={assetUrl("assets/step1/0d88f.svg")} alt="Obs" />
      </header>
    </>
  )
}

function Stepper({
  current,
  highestVisited,
  onStepClick,
}: {
  current: number
  highestVisited: number
  onStepClick: (step: number) => void
}) {
  return (
    <ol className="stepper" aria-label="Steg i kassen">
      {steps.map((step, index) => {
        const number = index + 1
        const isUnlocked = number <= highestVisited
        const content = (
          <>
            <span className="step-number">{number}</span>
            <span className="step-label">{step}</span>
          </>
        )

        return (
          <li
            className={`step ${number < current ? "step-complete" : ""} ${
              number === current ? "step-current" : ""
            } ${isUnlocked && number !== current ? "step-unlocked" : ""}`}
            key={step}
            aria-current={number === current ? "step" : undefined}
          >
            {isUnlocked && number !== current ? (
              <button
                className="step-link"
                type="button"
                onClick={() => onStepClick(number)}
                aria-label={`Gå til steg ${number}: ${step}`}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ol>
  )
}

function CheckoutFooter() {
  return (
    <footer className="checkout-footer">
      <div className="footer-logos">
        <img
          className="coop-logo"
          src={assetUrl("assets/step1/f171b.svg")}
          alt="Coop litt ditt"
        />
        <img
          className="obs-white-logo"
          src={assetUrl("assets/step1/03639.svg")}
          alt="Obs"
        />
      </div>
      <div className="footer-main">
        <div className="footer-links">
          <div>
            <h2>Kontakt</h2>
            <p>Østre Aker vei 264</p>
            <p>0977 Oslo</p>
            <p>Postboks 21 Haugenstua</p>
            <p>Org. nr. 936 560 288</p>
          </div>
          <div>
            <h2>Obs</h2>
          </div>
          <div>
            <h2>Våre kjeder</h2>
          </div>
          <div>
            <h2>Kundeservice</h2>
            <p>Hjelp og kontakt</p>
            <p>Om netthandel</p>
            <p>Presse og pressekontakter</p>
          </div>
        </div>
        <form
          className="newsletter"
          onSubmit={(event) => event.preventDefault()}
        >
          <h2>Meld deg på vårt nyhetsbrev</h2>
          <label htmlFor="newsletter-email">Din e-post</label>
          <input id="newsletter-email" type="email" />
          <label className="footer-checkbox">
            <input type="checkbox" />
            <span>
              Ja, takk! Send meg månedlige oppdateringer fra Coop og Coops
              kjeder. Jeg godtar e-poster fra Coop og vilkårene i
              personvernerklæringen.
            </span>
          </label>
          <button type="submit">Meld meg på</button>
        </form>
      </div>
      <div className="footer-options">
        <div>
          <h3>Betalingsalternativer</h3>
          <div className="option-tiles">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index}>
                <img src={assetUrl("assets/step1/268b2.png")} alt="" />
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3>Leveringsalternativer</h3>
          <div className="option-tiles">
            {Array.from({ length: 2 }, (_, index) => (
              <span key={index}>
                <img src={assetUrl("assets/step1/268b2.png")} alt="" />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-badges">
        <span>
          <img src={assetUrl("assets/step1/a1c58.png")} alt="" /> Garantert fornøyd
        </span>
        <span>
          <img src={assetUrl("assets/step1/4dfae.png")} alt="" /> Trygg E-Handel
        </span>
      </div>
    </footer>
  )
}

const maxQuantity = 99

// Heart button for unavailable products. Shows a spinner while the
// (pretend) backend saves the favorite.
function FavoriteButton({
  name,
  favorite,
  onToggle,
}: {
  name: string
  favorite: boolean
  onToggle: () => void
}) {
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return (
    <button
      className="sold-out-favorite"
      type="button"
      aria-label={
        favorite ? `Fjern ${name} fra favoritter` : `Legg ${name} til favoritter`
      }
      aria-pressed={favorite}
      aria-busy={loading}
      disabled={loading}
      onClick={() => {
        setLoading(true)
        timer.current = setTimeout(() => {
          onToggle()
          setLoading(false)
        }, 500)
      }}
    >
      {loading ? (
        <span className="quantity-spinner" aria-hidden="true" />
      ) : (
        <img
          src={assetUrl(
            favorite
              ? "assets/sold-out-heart-filled.svg"
              : "assets/sold-out-heart.svg",
          )}
          alt=""
        />
      )}
    </button>
  )
}

// Editable number in the quantity stepper. Digits only; the value is applied
// on Enter or when the field loses focus. Empty or 0 falls back to 1. Typing
// more than the stock is allowed and shows the stock warning.
function QuantityInput({
  quantity,
  label,
  onCommit,
}: {
  quantity: number
  label: string
  onCommit: (quantity: number) => void
}) {
  const [draft, setDraft] = useState(String(quantity))

  // Keep in sync when +/− change the quantity.
  useEffect(() => setDraft(String(quantity)), [quantity])

  const commit = () => {
    const value = Math.min(Math.max(Number(draft) || 1, 1), maxQuantity)
    setDraft(String(value))
    if (value !== quantity) onCommit(value)
  }

  return (
    <input
      className="quantity-input"
      type="text"
      inputMode="numeric"
      aria-label={label}
      maxLength={String(maxQuantity).length}
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
      }}
      onFocus={(event) => event.currentTarget.select()}
    />
  )
}

function CartStep({
  items,
  showUnavailableItems,
  storeHeading,
  appliedCoupons,
  onAppliedCouponsChange,
  onQuantityChange,
  onSetQuantity,
  onRemove,
  favoriteItems,
  onToggleFavorite,
  onNext,
}: {
  items: CartItem[]
  showUnavailableItems: boolean
  storeHeading?: { label: string; store: string }
  appliedCoupons: string[]
  onAppliedCouponsChange: (codes: string[]) => void
  onQuantityChange: (id: number, change: number) => void
  onSetQuantity: (id: number, quantity: number) => void
  onRemove: (id: number) => void
  favoriteItems: Record<number, boolean>
  onToggleFavorite: (id: number) => void
  onNext: () => void
}) {
  const [couponOpen, setCouponOpen] = useState(appliedCoupons.length > 0)
  const [coupon, setCoupon] = useState("")
  const [couponError, setCouponError] = useState("")
  const [unavailableInfoModalOpen, setUnavailableInfoModalOpen] = useState(false)
  const [showStockError, setShowStockError] = useState(false)
  const [quantityActions, setQuantityActions] = useState<
    Record<number, -1 | 1>
  >({})
  const quantityActionTimers = useRef(
    new Map<number, ReturnType<typeof setTimeout>>(),
  )
  const [quantityLimitTooltip, setQuantityLimitTooltip] = useState<{
    itemId: number
    limit: "minimum" | "maximum"
  } | null>(null)
  const stockLimitTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const visibleItems = items.filter(
    (item) => showUnavailableItems || !item.unavailableLabel,
  )
  const availableItems = inStock(visibleItems)
  const productTotal = availableItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  )
  const savings = couponSavings(availableItems, appliedCoupons)
  const total =
    productTotal - savings.reduce((sum, { amount }) => sum + amount, 0)
  const vat = total / 5

  const applyCoupon = (event: FormEvent) => {
    event.preventDefault()
    const validCoupon = coupons[coupon.trim().toLowerCase()]?.code

    if (!validCoupon) {
      setCouponError("Rabattkoden er ikke gyldig")
      return
    }

    if (appliedCoupons.includes(validCoupon)) {
      setCouponError("Rabattkoden er allerede aktiv")
      return
    }

    onAppliedCouponsChange([...appliedCoupons, validCoupon])
    setCoupon("")
    setCouponError("")
  }

  const couponLimitReached = appliedCoupons.length === 3

  const soldOutItems = visibleItems.filter((item) => item.soldOut)
  const overStockCount = visibleItems.filter(overStock).length

  useEffect(() => {
    return () => {
      quantityActionTimers.current.forEach(clearTimeout)
      quantityActionTimers.current.clear()
      if (stockLimitTooltipTimer.current) {
        clearTimeout(stockLimitTooltipTimer.current)
      }
    }
  }, [])

  const handleQuantityChange = (itemId: number, change: -1 | 1) => {
    if (quantityActions[itemId]) return

    setQuantityActions((current) => ({
      ...current,
      [itemId]: change,
    }))

    const loadingTimer = setTimeout(() => {
      onQuantityChange(itemId, change)
      setQuantityActions((current) => {
        const next = { ...current }
        delete next[itemId]
        return next
      })
      quantityActionTimers.current.delete(itemId)
    }, 650)

    quantityActionTimers.current.set(itemId, loadingTimer)
  }

  const showQuantityLimitTooltip = (
    itemId: number,
    limit: "minimum" | "maximum",
  ) => {
    setQuantityLimitTooltip({ itemId, limit })
    if (stockLimitTooltipTimer.current) {
      clearTimeout(stockLimitTooltipTimer.current)
    }
    stockLimitTooltipTimer.current = setTimeout(
      () => setQuantityLimitTooltip(null),
      2500,
    )
  }

  // One product card; used for both the regular list and the sold-out
  // section below it.
  const renderCard = (item: CartItem) => {
            const line = linePrice(item, appliedCoupons)
            return (
            <article
              // Only "Utsolgt" items are toned down; "Utilgjengelig akkurat nå"
              // items keep the regular product styling.
              className={`cart-card ${
                item.soldOut && !item.unavailableLabel ? "is-sold-out" : ""
              }`}
              key={item.id}
            >
              <img
                className="cart-product-image"
                src={item.image}
                alt={item.name}
              />
              <div className="cart-product-info">
                <div className="cart-product-copy">
                  <h2>{item.name}</h2>
                  {item.size && <p>Størrelse: {item.size}</p>}
                  {item.color && <p>Farge: {item.color}</p>}
                  {item.memberDeal && (
                    <p className="member-price-label">Medlemspris</p>
                  )}
                  <div aria-live="polite">
                    {line.coupon && !item.soldOut && (
                      <p className="discount-code">
                        Rabattkode {line.coupon.code}:{" "}
                        {couponLabel(line.coupon)}
                      </p>
                    )}
                  </div>
                </div>
                {item.soldOut && (
                  <span className="sold-out-tag">
                  <img src={assetUrl("assets/out-of-stock-x-circle.svg")} alt="" />
                    {item.unavailableLabel ?? "Utsolgt"}
                  </span>
                )}
                <div className="stock-info" aria-live="polite">
                  {overStock(item) && (
                    <>
                      <span className="stock-tag">
                        <img
                          src={assetUrl("assets/stock-warning-triangle.svg")}
                          alt=""
                        />
                        Ikke nok på lager. Reduser antallet.
                      </span>
                    </>
                  )}
                </div>
                <div className="cart-card-bottom">
                  <div>
                    {item.soldOut ? (
                      <strong>{formatPrice(line.full)}</strong>
                    ) : line.coupon ? (
                      <strong
                        className={
                          item.memberDeal ? "discounted-price" : undefined
                        }
                      >
                        {formatPrice(line.price)}
                      </strong>
                    ) : (
                      <strong
                        className={
                          item.memberDeal ? "discounted-price" : undefined
                        }
                      >
                        {formatPrice(line.full)}
                      </strong>
                    )}
                  </div>
                  <div className="quantity-actions">
                    {!item.soldOut && (
                    <div className="quantity-stepper">
                      <span
                        className="quantity-decrease-control"
                        onPointerDownCapture={(event) => {
                          if (item.quantity === 1) {
                            event.preventDefault()
                            showQuantityLimitTooltip(item.id, "minimum")
                          }
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Reduser antall"
                          aria-busy={quantityActions[item.id] === -1}
                          aria-describedby={
                            quantityLimitTooltip?.itemId === item.id
                              ? `quantity-limit-tooltip-${item.id}`
                              : undefined
                          }
                          disabled={
                            item.quantity === 1 || Boolean(quantityActions[item.id])
                          }
                          onClick={() => handleQuantityChange(item.id, -1)}
                        >
                          {quantityActions[item.id] === -1 ? (
                            <span className="quantity-spinner" aria-hidden="true" />
                          ) : (
                            <img
                              src={
                                item.quantity === 1
                                  ? assetUrl("assets/667d5.svg")
                                  : assetUrl("assets/7efcd.svg")
                              }
                              alt=""
                            />
                          )}
                        </button>
                      </span>
                      <QuantityInput
                        quantity={item.quantity}
                        label={`Antall ${item.name}`}
                        onCommit={(quantity) =>
                          onSetQuantity(item.id, quantity)
                        }
                      />
                      <span
                        className="quantity-increase-control"
                        onPointerDownCapture={(event) => {
                          if (atStockLimit(item)) {
                            event.preventDefault()
                            showQuantityLimitTooltip(item.id, "maximum")
                          }
                        }}
                      >
                        <button
                          type="button"
                          aria-label="Øk antall"
                          aria-busy={quantityActions[item.id] === 1}
                          aria-describedby={
                            quantityLimitTooltip?.itemId === item.id
                              ? `quantity-limit-tooltip-${item.id}`
                              : undefined
                          }
                          disabled={
                            atStockLimit(item) || Boolean(quantityActions[item.id])
                          }
                          onClick={() => handleQuantityChange(item.id, 1)}
                        >
                          {quantityActions[item.id] === 1 ? (
                            <span className="quantity-spinner" aria-hidden="true" />
                          ) : (
                            <img
                              src={
                                atStockLimit(item)
                                  ? assetUrl("assets/814c4.svg")
                                  : assetUrl("assets/3e3c3.svg")
                              }
                              alt=""
                            />
                          )}
                        </button>
                      </span>
                      {quantityLimitTooltip?.itemId === item.id && (
                        <span
                          className="stock-limit-tooltip"
                          id={`quantity-limit-tooltip-${item.id}`}
                          role="tooltip"
                        >
                          <span className="stock-limit-tooltip-content">
                            {quantityLimitTooltip.limit === "minimum"
                              ? "Fjern varen ved å klikke på søppelbøtta"
                              : "Maksimalt antall nådd"}
                          </span>
                          <span className="stock-limit-tooltip-arrow">
                            <img
                              src={assetUrl("assets/stock-tooltip-arrow.svg")}
                              alt=""
                            />
                          </span>
                        </span>
                      )}
                    </div>
                    )}
                    {item.soldOut ? (
                      <FavoriteButton
                        name={item.name}
                        favorite={Boolean(favoriteItems[item.id])}
                        onToggle={() => onToggleFavorite(item.id)}
                      />
                    ) : (
                      <button
                        className="remove-item"
                        type="button"
                        aria-label={`Fjern ${item.name}`}
                        onClick={() => onRemove(item.id)}
                      >
                        <img
                          src={assetUrl("assets/product-card/28688.svg")}
                          alt=""
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
            )
  }


  return (
    <>
      <h1>Dine varer</h1>
      {storeHeading && (
        <ClickAndCollectHeading
          label={storeHeading.label}
          store={storeHeading.store}
        />
      )}
      {visibleItems.length === 0 ? (
        <p className="cart-empty">Handlekurven din er tom.</p>
      ) : (
        <>
          {availableItems.length > 0 && (
            <div className="cart-list">{availableItems.map(renderCard)}</div>
          )}
          {soldOutItems.length > 0 && (
            <section className="unavailable-section">
              <div className="unavailable-intro">
                <UnavailableSummary
                  onMoreInfo={() => setUnavailableInfoModalOpen(true)}
                />
              </div>
              <div className="cart-list">
                {soldOutItems.map(renderCard)}
              </div>
            </section>
          )}
        </>
      )}

      <div className={`coupon-card ${couponOpen ? "is-open" : ""}`}>
        <button
          className="accordion-button"
          type="button"
          onClick={() => setCouponOpen((open) => !open)}
          aria-expanded={couponOpen}
        >
          <span>
            <img src={assetUrl("assets/42e03.svg")} alt="" /> Rabattkode
          </span>
          <img src={assetUrl("assets/e83ab.svg")} alt="" />
        </button>
        {couponOpen && (
          <form className="coupon-form" onSubmit={applyCoupon}>
            <div className="coupon-field">
              <label htmlFor="coupon">Rabattkode</label>
              <div className="coupon-entry-row">
                <div
                  className={`coupon-input-wrap ${
                    couponError ? "has-error" : ""
                  }`}
                >
                  <input
                    id="coupon"
                    value={coupon}
                    disabled={couponLimitReached}
                    aria-invalid={Boolean(couponError)}
                    aria-describedby={
                      couponError
                        ? "coupon-error"
                        : couponLimitReached
                          ? "coupon-limit"
                          : undefined
                    }
                    onChange={(event) => {
                      setCoupon(event.target.value)
                      setCouponError("")
                    }}
                  />
                  {couponError && (
                    <button
                      className="coupon-clear"
                      type="button"
                      aria-label="Tøm rabattkode"
                      onClick={() => {
                        setCoupon("")
                        setCouponError("")
                      }}
                    >
                      <img src={assetUrl("assets/fb6a1.svg")} alt="" />
                    </button>
                  )}
                </div>
                <button
                  className="coupon-activate"
                  type="submit"
                  disabled={couponLimitReached}
                >
                  Aktiver
                </button>
              </div>
              {couponError && (
                <p className="coupon-error" id="coupon-error" role="alert">
                  {couponError}
                </p>
              )}
              {couponLimitReached && (
                <p className="coupon-limit" id="coupon-limit">
                  Maks 3 rabattkoder. Fjern en kode for å legge til en ny.
                </p>
              )}
            </div>
            {appliedCoupons.length > 0 && (
              <div className="coupon-list" aria-live="polite">
                {appliedCoupons.map((appliedCoupon) => (
                  <div className="coupon-item" key={appliedCoupon}>
                    <img src={assetUrl("assets/d64ef.svg")} alt="" />
                    <span>Rabattkode: {appliedCoupon}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onAppliedCouponsChange(
                          appliedCoupons.filter(
                            (code) => code !== appliedCoupon,
                          ),
                        )
                      }
                    >
                      Fjern
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}
      </div>

      <div className="price-summary">
        <div>
          <span>Varer</span>
          <strong>{formatPrice(productTotal)}</strong>
        </div>
        {savings.map(({ code, amount }) => (
          <div key={code}>
            <span>Rabattkode: {code}</span>
            <strong className="discount-value">-{formatPrice(amount)}</strong>
          </div>
        ))}
        <div className="delivery-summary">
          <span>Levering</span>
          <strong>Velges senere</strong>
        </div>
        <div className="total-row">
          <span>
            <strong>Sum</strong>
            <small>(Herav mva.: {formatPrice(vat)})</small>
          </span>
          <strong>{formatPrice(total)}</strong>
        </div>
      </div>

      <div className="checkout-actions single-action">
        <button
          className="button-next"
          type="button"
          onClick={() => {
            if (overStockCount > 0) {
              setShowStockError(true)
              return
            }
            onNext()
          }}
          disabled={!availableItems.length}
          aria-disabled={overStockCount > 0 || undefined}
        >
          Neste
        </button>
        {showStockError && overStockCount > 0 && (
          <p className="unavailable-button-message" role="status">
            {overStockCount === 1
              ? "Én vare i handlekurven har høyere antall enn vi har på lager."
              : "Flere varer i handlekurven har høyere antall enn vi har på lager."}
          </p>
        )}
      </div>
      {unavailableInfoModalOpen && (
        <ShipmentSourceModal
          source="Info om levering"
          onClose={() => setUnavailableInfoModalOpen(false)}
        />
      )}
    </>
  )
}

function UnavailableSummary({ onMoreInfo }: { onMoreInfo: () => void }) {
  return (
    <>
      <div className="unavailable-heading">
        <h2>Varer som ikke kan leveres</h2>
        <button
          className="package-info-link"
          type="button"
          aria-haspopup="dialog"
          aria-label="Mer info om levering"
          onClick={onMoreInfo}
        >
          <img src={assetUrl("assets/delivery-info-circle.svg")} alt="" />
          Mer info
        </button>
      </div>
    </>
  )
}

// Logged-in members only enter the delivery address for "Annen adresse";
// phone and e-mail come from their profile.
const otherAddressFields = guestFields.filter(
  (field) => field.name !== "phone" && field.name !== "email",
)

const isAddressComplete = (
  fields: GuestField[],
  values: Record<string, string>,
) =>
  fields.every((field) => !guestFieldError(field, values[field.name])) &&
  values.postalCode !== "0000"

// Text fields with labels, validation and error states, shared by the guest
// form and the logged-in "Annen adresse" form.
function AddressFields({
  idPrefix,
  fields,
  values,
  touched,
  disabled,
  onValuesChange,
  onTouchedChange,
}: {
  idPrefix: string
  fields: GuestField[]
  values: Record<string, string>
  touched: Record<string, boolean>
  disabled?: boolean
  onValuesChange: Dispatch<SetStateAction<Record<string, string>>>
  onTouchedChange: Dispatch<SetStateAction<Record<string, boolean>>>
}) {
  return (
    <div className="guest-fields">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.name}`
        const error = touched[field.name]
          ? guestFieldError(field, values[field.name])
          : ""
        const hasError = Boolean(error)

        return (
          <div
            className={`form-field field-${field.name} ${
              hasError ? "has-error" : ""
            }`}
            key={field.name}
          >
            <label htmlFor={id}>{field.label} *</label>
            <span className="input-with-prefix">
              {field.prefix && <span>{field.prefix}</span>}
              <input
                id={id}
                required
                disabled={disabled}
                type={field.type}
                value={values[field.name] || ""}
                aria-invalid={hasError}
                aria-describedby={hasError ? `${id}-error` : undefined}
                // Digit-only fields strip everything else; all fields stop
                // at their max length.
                {...(field.digits && { inputMode: "numeric" as const })}
                maxLength={field.digits ?? field.length?.[1]}
                onChange={(event) => {
                  const value = field.digits
                    ? event.target.value.replace(/\D/g, "").slice(0, field.digits)
                    : event.target.value
                  onValuesChange((current) => ({
                    ...current,
                    [field.name]: value,
                  }))
                }}
                onBlur={() =>
                  onTouchedChange((current) => ({
                    ...current,
                    [field.name]: true,
                  }))
                }
              />
            </span>
            {hasError && (
              <p className="field-error" id={`${id}-error`}>
                {error}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DetailsStep({
  onBack,
  onNext,
  isLoggedIn,
  onLoggedIn,
}: {
  onBack: () => void
  onNext: () => void
  isLoggedIn: boolean
  onLoggedIn: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  // Fields the user has left at least once; only these show errors.
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loginState, setLoginState] = useState<
    "guest" | "loading" | "logged-in"
  >(isLoggedIn ? "logged-in" : "guest")
  const [address, setAddress] = useState("registered")
  const [otherValues, setOtherValues] = useState<Record<string, string>>({})
  const [otherTouched, setOtherTouched] = useState<Record<string, boolean>>(
    {},
  )
  const loginTimer = useRef<number | null>(null)
  const isGuest = loginState !== "logged-in"
  const usesOtherAddress = !isGuest && address === "other"
  const complete = isAddressComplete(guestFields, values)
  const otherComplete = isAddressComplete(otherAddressFields, otherValues)
  const canContinue =
    loginState === "logged-in"
      ? address === "registered" || otherComplete
      : loginState === "guest" && complete
  const [showContinueError, setShowContinueError] = useState(false)
  // 0000 has the right format but isn't a postcode we can deliver to; it
  // gets a status message at the bottom instead of a field error.
  const undeliverablePostcode = isGuest
    ? touched.postalCode && values.postalCode === "0000"
    : usesOtherAddress &&
      otherTouched.postalCode &&
      otherValues.postalCode === "0000"

  useEffect(
    () => () => {
      if (loginTimer.current) window.clearTimeout(loginTimer.current)
    },
    [],
  )

  const logIn = () => {
    setLoginState("loading")
    loginTimer.current = window.setTimeout(() => {
      setLoginState("logged-in")
      onLoggedIn()
      loginTimer.current = null
    }, 1400)
  }

  return (
    <>
      <h1>Dine opplysninger</h1>
      {loginState === "logged-in" ? (
        <section className="logged-in-address">
          <h2>Velg leveringsadresse</h2>
          <div className="address-options">
            <label
              className={`registered-address ${
                address === "registered" ? "address-selected" : ""
              }`}
            >
              <input
                type="radio"
                name="address"
                value="registered"
                checked={address === "registered"}
                onChange={(event) => setAddress(event.target.value)}
              />
              {address === "registered" ? (
                <img
                  className="address-radio-image"
                  src={assetUrl("assets/step2-logged/4f45e.svg")}
                  alt=""
                />
              ) : (
                <span className="address-radio" />
              )}
              <span className="address-content">
                <strong>Din registrerte adresse</strong>
                <span>
                  <b>Adresse</b>
                  Navn Navnesen
                  <br />
                  Østre Akers vei 264,
                  <br />
                  0977 Oslo
                </span>
                <span>
                  <b>E-post</b>
                  navn.navnesen@epost.no
                </span>
                <span>
                  <b>Telefonnummer</b>
                  +47 99 88 77 66
                </span>
              </span>
            </label>
            <div
              className={`other-address ${
                address === "other" ? "address-selected" : ""
              }`}
            >
              <label className="other-address-option">
                <input
                  type="radio"
                  name="address"
                  value="other"
                  checked={address === "other"}
                  onChange={(event) => setAddress(event.target.value)}
                />
                {address === "other" ? (
                  <img
                    className="address-radio-image"
                    src={assetUrl("assets/step2-logged/4f45e.svg")}
                    alt=""
                  />
                ) : (
                  <span className="address-radio" />
                )}
                <strong>Annen adresse</strong>
              </label>
              {/* The form only shows when "Annen adresse" is selected
                  (Figma: Logged in_Other address). */}
              {address === "other" && (
                <AddressFields
                  idPrefix="other"
                  fields={otherAddressFields}
                  values={otherValues}
                  touched={otherTouched}
                  onValuesChange={setOtherValues}
                  onTouchedChange={setOtherTouched}
                />
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="member-login">
            <h2>Logg inn som Coop-medlem</h2>
            <div className="member-benefits">
              <strong>Som innlogget får du:</strong>
              {[
                "Medlemskupp",
                "Minimum 1% kjøpeutbytte",
                "Rask og enkel betaling med Coopay",
              ].map((benefit) => (
                <span key={benefit}>
                  <img src={assetUrl("assets/step2/003e4.svg")} alt="" /> {benefit}
                </span>
              ))}
            </div>
            <button
              className="wide-primary login-button"
              type="button"
              onClick={logIn}
              disabled={loginState === "loading"}
              aria-busy={loginState === "loading"}
            >
              {loginState === "loading" && (
                <span className="login-spinner" aria-hidden="true" />
              )}
              {loginState === "loading" ? "Logger inn …" : "Logg inn"}
            </button>
            {loginState === "loading" && (
              <span className="sr-only" role="status" aria-live="polite">
                Logger inn. Vennligst vent.
              </span>
            )}
          </section>

          <form
            className={`guest-form ${
              loginState === "loading" ? "guest-form-loading" : ""
            }`}
            onSubmit={(event) => {
              event.preventDefault()
              if (complete) onNext()
            }}
          >
            <div>
              <h2>Fortsett som gjest</h2>
              <p>
                Handler du uten å logge inn vil du ikke få medlemskupp eller
                kjøpeutbytte.
              </p>
            </div>
            <AddressFields
              idPrefix="guest"
              fields={guestFields}
              values={values}
              touched={touched}
              disabled={loginState === "loading"}
              onValuesChange={setValues}
              onTouchedChange={setTouched}
            />
          </form>
        </>
      )}

      <div aria-live="assertive">
        {undeliverablePostcode && (
          <div className="status-message status-message-danger" role="alert">
            <p className="status-message-heading">
              <img src={assetUrl("assets/59fc8.svg")} alt="" />
              Ugyldig postnummer
            </p>
            <p>
              Vi kan ikke levere til dette postnummeret. Vennligst ta kontakt
              med <a href="mailto:netthandel@coop.no">netthandel@coop.no</a>.
            </p>
          </div>
        )}
      </div>

      <div className="checkout-actions">
        <button className="button-back" type="button" onClick={onBack}>
          Tilbake
        </button>
        <div className="checkout-next-wrap">
          <button
            className="button-next"
            type="button"
            disabled={loginState === "loading"}
            aria-disabled={!canContinue}
            onClick={() => {
              if (!canContinue) {
                setShowContinueError(true)
                return
              }
              onNext()
            }}
          >
            Neste
          </button>
          {showContinueError && !canContinue && (
            <p className="unavailable-button-message" role="status">
              Logg inn eller fyll ut skjemaet for å gå videre til levering.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

function DeliveryProduct({
  item,
  appliedCoupons,
  last,
  favorite,
  onToggleFavorite,
}: {
  item: CartItem
  appliedCoupons: string[]
  last: boolean
  favorite?: boolean
  onToggleFavorite?: (id: number) => void
}) {
  const line = linePrice(item, appliedCoupons)
  return (
    <div
      className={`product-card ${
        last ? "product-card-last" : ""
      } ${item.unavailableLabel ? "product-card-unavailable" : ""}`}
    >
      <img className="product-image" src={item.image} alt={item.name} />
      <div className="product-details">
        <p className="product-name">{item.name}</p>
        {(item.size || item.color) && (
          <p className="product-muted">
            {[
              item.size && `Størrelse: ${item.size}`,
              item.color && `Farge: ${item.color}`,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        {item.unavailableLabel && (
          <span className="sold-out-tag delivery-unavailable-tag">
            <img src={assetUrl("assets/out-of-stock-x-circle.svg")} alt="" />
            {item.unavailableLabel}
          </span>
        )}
        <p className="product-price">
          {line.coupon ? (
            <span className="discounted-price">
              {formatPrice(line.price)}
            </span>
          ) : (
            formatPrice(line.full)
          )}
        </p>
        <div className="product-meta">
          <p>Antall: {item.quantity}</p>
          {!item.unavailableLabel &&
            item.weight !== undefined &&
            item.height !== undefined &&
            item.length !== undefined &&
            item.width !== undefined && (
              <p>
                Vekt: {item.weight.toFixed(2)} kg, H: {item.height} cm, L:{" "}
                {item.length} cm, B: {item.width} cm
              </p>
            )}
        </div>
      </div>
      {onToggleFavorite && (
        <FavoriteButton
          name={item.name}
          favorite={Boolean(favorite)}
          onToggle={() => onToggleFavorite(item.id)}
        />
      )}
    </div>
  )
}

function ClickAndCollectHeading({
  label = "Klikk og hent:",
  store,
}: {
  label?: string
  store: string
}) {
  return (
    <div className="click-and-collect-heading">
      <span className="click-and-collect-heading-icon">
        <img src={assetUrl("assets/click-and-collect-store.svg")} alt="" />
      </span>
      <p>
        <strong>{label}</strong> {store}
      </p>
    </div>
  )
}

type PackageCardProps = {
  packageIndex: number
  packageCount: number
  source: string
  productItems: CartItem[]
  appliedCoupons: string[]
  selected: string
  selectedStore: string
  isClickAndCollect: boolean
  showPackageHeading: boolean
  onSelect: (value: string) => void
  onStoreSelect: (value: string) => void
  onSourceClick: (source: string) => void
  options: DeliveryOption[]
  featuredOptionId?: string
}

function PackageCard({
  packageIndex,
  packageCount,
  source,
  productItems,
  appliedCoupons,
  selected,
  selectedStore,
  isClickAndCollect,
  showPackageHeading,
  onSelect,
  onStoreSelect,
  onSourceClick,
  options,
  featuredOptionId,
}: PackageCardProps) {
  const [moreOptionsExpanded, setMoreOptionsExpanded] = useState(false)
  const visibleOptions =
    featuredOptionId && !moreOptionsExpanded
      ? options.filter(
          (option) =>
            option.id === featuredOptionId || option.id === selected,
        )
      : options

  return (
    <section
      className={`package-card ${
        packageCount === 1 ? "package-card-single" : ""
      }`}
      aria-labelledby={showPackageHeading ? `package-${packageIndex}` : undefined}
      aria-label={showPackageHeading ? undefined : "Pakkeinnhold og levering"}
    >
      {showPackageHeading && (
        <div className="package-heading">
          <div className="package-title-wrap">
            <h2 id={`package-${packageIndex}`}>
              Pakke {packageIndex} av {packageCount}
            </h2>
            <span className="package-source-tag">{source}</span>
          </div>
          <button
            className="package-info-link"
            type="button"
            onClick={() => onSourceClick(source)}
            aria-haspopup="dialog"
          >
            <img src={assetUrl("assets/delivery-info-circle.svg")} alt="" />
            Mer info
          </button>
        </div>
      )}

      <div className="section-block">
        <div className="product-list">
          {productItems.map((item, index) => (
            <DeliveryProduct
              item={item}
              appliedCoupons={appliedCoupons}
              key={item.id}
              last={index === productItems.length - 1}
            />
          ))}
        </div>
      </div>

      <fieldset className="section-block delivery-fieldset">
        <legend>Velg levering for pakke {packageIndex}</legend>
        <div className="delivery-list">
          <div
            className="delivery-options"
            id={`delivery-options-${packageIndex}`}
          >
            {visibleOptions.map((option) => {
              const active = selected === option.id
              return (
                <label
                  className={`delivery-option ${
                    active ? "delivery-option-selected" : ""
                  }`}
                  key={option.id}
                >
                  <input
                    type="radio"
                    name={`delivery-${packageIndex}`}
                    value={option.id}
                    checked={active}
                    onChange={(event) => onSelect(event.target.value)}
                  />
                  <span className="radio-mark" aria-hidden="true" />
                  <span className="delivery-copy">
                    <span className="delivery-title">{option.title}</span>
                    <span className="delivery-description">
                      {option.description}
                    </span>
                    {/* Extra info only shows for the selected option. */}
                    {option.extra && active && (
                      <span className="delivery-description">
                        {option.extra}
                      </span>
                    )}
                    {option.picker &&
                      active &&
                      !(isClickAndCollect && option.id === "pickup") && (
                        <span className="store-picker">
                          {option.picker.label && (
                            <span className="store-label">
                              {option.picker.label}
                            </span>
                          )}
                          <span className="select-wrap">
                            <select
                              // Falls back to the first choice when the stored
                              // value belongs to another option's list.
                              value={
                                option.picker.choices.some(
                                  (choice) => choice.value === selectedStore,
                                )
                                  ? selectedStore
                                  : option.picker.choices[0].value
                              }
                              onChange={(event) =>
                                onStoreSelect(event.target.value)
                              }
                              aria-label={`${option.picker.ariaLabel} for pakke ${packageIndex}`}
                            >
                              {option.picker.choices.map((choice) => (
                                <option
                                  value={choice.value}
                                  key={choice.value}
                                >
                                  {choice.label}
                                </option>
                              ))}
                            </select>
                          </span>
                        </span>
                      )}
                  </span>
                  <span className="delivery-price">
                    {formatPrice(option.price)}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
        {featuredOptionId && (
          <button
            className="delivery-more-options"
            type="button"
            aria-expanded={moreOptionsExpanded}
            aria-controls={`delivery-options-${packageIndex}`}
            onClick={() => setMoreOptionsExpanded((expanded) => !expanded)}
          >
            {moreOptionsExpanded
              ? "Vis færre leveringsalternativer"
              : "Vis flere leveringsalternativer"}
          </button>
        )}
      </fieldset>
    </section>
  )
}

const shipmentFaqs = [
  {
    question: "Hva betyr det at varen sendes fra butikk?",
    answer: (
      <>
        Når en vare sendes fra butikk, plukkes og pakkes den av ansatte i en
        Obs-butikk i stedet for på sentrallageret vårt.
        <br />
        <br />
        Dette gjør at vi kan tilby varer som ellers ikke ville vært
        tilgjengelige for netthandel. Siden varen sendes fra en fysisk butikk,
        kan tilgjengelige leveringsalternativer og leveringstid variere noe.
      </>
    ),
  },
  {
    question: "Hvordan returnerer jeg varen?",
    answer:
      "Du har samme returrett som ved andre kjøp i nettbutikken. Retur kan registreres og håndteres gjennom våre ordinære returprosesser.",
  },
  {
    question: "Må jeg dra til den butikken for å returnere varen?",
    answer:
      "Nei. Du trenger ikke å returnere varen til den spesifikke butikken som sendte den. Følg de vanlige returinstruksjonene som gjelder for netthandel.",
  },
  {
    question: "Hva skjer hvis det er noe feil med varen?",
    answer:
      "Hvis varen er skadet, mangler deler eller har en feil, kan du kontakte kundeservice. Vi hjelper deg med reklamasjon, retur eller bytte på samme måte som ved andre netthandelskjøp.",
  },
  {
    question:
      "Hvorfor er det færre leveringsalternativer for varer som sendes fra butikk?",
    answer:
      "Varer som sendes fra en av våre Obs-butikker håndteres lokalt, og kan derfor ikke alltid benytte alle leveringsmetodene som er tilgjengelige fra sentrallageret. Utvalget av leveringsalternativer kan derfor være mer begrenset for enkelte varer.",
  },
]

const warehouseFaqs = [
  {
    question: "Hva betyr det at varen sendes fra sentrallager?",
    answer:
      "Når en vare sendes fra sentrallager, plukkes og pakkes den på sentrallageret vårt i Langhus før den sendes til deg. Dette er den vanligste leveringsmåten for varer kjøpt på nett.",
  },
  {
    question: "Hvordan returnerer jeg varen?",
    answer:
      "Du har samme returrett som ved andre kjøp i nettbutikken. Følg de vanlige returinstruksjonene som gjelder for netthandel.",
  },
  {
    question: "Må jeg sende varen tilbake til sentrallageret?",
    answer:
      "Nei. Du trenger ikke å forholde deg til hvor varen ble sendt fra. Følg de ordinære returinstruksjonene som gjelder for produktet.",
  },
  {
    question: "Hva skjer hvis det er noe feil med varen?",
    answer:
      "Hvis varen er skadet, mangler deler eller har en feil, kan du kontakte kundeservice. Vi hjelper deg med reklamasjon, retur eller bytte på samme måte som ved andre netthandelskjøp.",
  },
  {
    question: "Hvorfor har varer fra sentrallager flere leveringsalternativer?",
    answer:
      "Sentrallageret er tilpasset netthandel og kan håndtere flere transportører og leveringsmetoder. Derfor vil varer som sendes fra sentrallager ofte kunne tilbys med flere leveringsalternativer.",
  },
]

const unavailableDeliveryFaqs = [
  {
    question: "Hvorfor er varen utilgjengelig?",
    answer:
      "Varen er enten utsolgt, eller så finner vi ingen leveringsmåte som passer for den til adressen din. Det kan ha flere årsaker, for eksempel varens størrelse, hvor du bor eller hvilke leveringsmetoder som er tilgjengelige akkurat nå. Dette kan være midlertidig.",
  },
  {
    question: "Kan jeg hente varen i butikk i stedet?",
    answer:
      "Mange varer er tilgjengelige i butikk, også når de ikke kan sendes hjem til deg. Gå til produktsiden og trykk «Klikk og hent». Gå til kassen og fullfør kjøpet som en Klikk og hent-bestilling.",
  },
  {
    question: "Kan jeg lagre varen til senere?",
    answer:
      "Ja, trykk på hjertet ved varen for å lagre den i favorittene dine. Da finner du den raskt igjen og kan kjøpe den når den er tilgjengelig.",
  },
  {
    question: "Kommer varen tilbake på lager?",
    answer:
      "Mange varer kommer tilbake, men vi kan ikke alltid si når. Gå til produktsiden og trykk «Overvåk», så får du en e-post når varen er tilbake på nettlageret. Sesong- og kampanjevarer blir ofte ikke tatt inn igjen.",
  },
]

const sourceModalContent = {
  "Fra sentrallager": {
    title: "Sendes fra sentrallager",
    message:
      "Disse varene sendes direkte til deg fra sentrallageret vårt på Langhus.",
    faqs: warehouseFaqs,
  },
  "Fra Obs-butikk": {
    title: "Sendes fra Obs-butikk",
    message:
      "Disse varene har vi ikke på sentrallageret, men de finnes i en av Obs-butikkene våre. Derfor sender vi dem direkte fra butikken, som en egen pakke. Slik gjør vi flere av varene våre tilgjengelige for deg i nettbutikken.",
    faqs: shipmentFaqs,
  },
  "Info om levering": {
    title: "Varer som ikke kan leveres",
    message:
      "Varer merket med «Utsolgt» eller «Kan ikke leveres» er dessverre utilgjengelige for kjøp i nettbutikken. De blir ikke med i bestillingen, og du betaler ikke for dem. Du kan fullføre resten av kjøpet som vanlig.",
    faqs: unavailableDeliveryFaqs,
  },
} as const

type SourceModalType = keyof typeof sourceModalContent

function ShipmentSourceModal({
  source,
  onClose,
}: {
  source: SourceModalType
  onClose: () => void
}) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const content = sourceModalContent[source]

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = "hidden"
    closeButton.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      className="shipment-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="shipment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-modal-title"
      >
        <header>
          <h2 id="shipment-modal-title">{content.title}</h2>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Lukk"
          >
            <img src={assetUrl("assets/shipment-modal/43127.svg")} alt="" />
          </button>
        </header>
        <div className="shipment-modal-content">
          <div className="shipment-message">{content.message}</div>
          <div className="shipment-faq">
            <h3>Ofte stilte spørsmål</h3>
            <div className="shipment-faq-list">
              {content.faqs.map((item) => (
                <details key={item.question} name="shipment-faq">
                  <summary>
                    <span>{item.question}</span>
                    <img src={assetUrl("assets/57c77.svg")} alt="" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function DeliveryStep({
  items,
  unavailableItems,
  isClickAndCollect,
  isHeatPump,
  appliedCoupons,
  selections,
  selectedStores,
  clickAndCollectStore,
  onSelectionChange,
  onStoreChange,
  onClickAndCollectStoreChange,
  favoriteItems,
  onToggleFavorite,
  onBack,
  onNext,
}: {
  items: CartItem[]
  unavailableItems: CartItem[]
  isClickAndCollect: boolean
  isHeatPump: boolean
  appliedCoupons: string[]
  selections: string[]
  selectedStores: string[]
  clickAndCollectStore: string
  onSelectionChange: (packageIndex: number, value: string) => void
  onStoreChange: (packageIndex: number, value: string) => void
  onClickAndCollectStoreChange: (value: string) => void
  favoriteItems: Record<number, boolean>
  onToggleFavorite: (id: number) => void
  onBack: () => void
  onNext: () => void
}) {
  const [sourceModal, setSourceModal] = useState<SourceModalType | null>(null)
  const deliverableItems = items.filter(
    (item) => !unavailableItems.some(({ id }) => id === item.id),
  )
  const packageDefinitions = isHeatPump ? heatPumpPackages : packages
  const visiblePackages = isClickAndCollect
    ? [
        {
          source: "Fra Obs-butikk",
          index: 0,
          products: deliverableItems,
          options: clickAndCollectVariantOptions,
        },
      ].filter((item) => item.products.length > 0)
    : packageDefinitions
        .map((item, index) => ({
          ...item,
          index,
          products: deliverableItems.filter((product) =>
            item.productIds.includes(product.id),
          ),
        }))
        .filter((item) => item.products.length > 0)

  return (
    <>
      <h1>Leveringsalternativer</h1>
      {unavailableItems.length > 0 && (
        <section
          className={`unavailable-section ${
            visiblePackages.length > 0 ? "has-delivery-divider" : ""
          }`}
        >
          <div className="unavailable-intro">
            <UnavailableSummary
              onMoreInfo={() => setSourceModal("Info om levering")}
            />
          </div>
          <div className="product-list">
            {unavailableItems.map((item, index) => (
              <DeliveryProduct
                item={item}
                appliedCoupons={appliedCoupons}
                key={item.id}
                last={index === unavailableItems.length - 1}
                favorite={Boolean(favoriteItems[item.id])}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}
      {unavailableItems.length > 0 && visiblePackages.length > 0 && (
        <div
          className="package-divider unavailable-delivery-divider"
          role="separator"
          aria-orientation="horizontal"
        />
      )}
      {visiblePackages.length > 1 && (
        <div className="split-notice" role="status">
          <img src={assetUrl("assets/step3-obs/48d56.svg")} alt="" />
          <span>Ordren din sendes som flere pakker.</span>
        </div>
      )}
      {(isClickAndCollect || isHeatPump) && (
        <ClickAndCollectHeading
          label={isHeatPump ? "Valgt butikk:" : undefined}
          store={isHeatPump ? selectedStores[0] : clickAndCollectStore}
        />
      )}
      <div className="package-list">
        {visiblePackages.map((item, position) => (
          <Fragment key={item.source}>
            <PackageCard
              packageIndex={position + 1}
              packageCount={visiblePackages.length}
              source={item.source}
              productItems={item.products}
              appliedCoupons={appliedCoupons}
              selected={selections[item.index]}
              selectedStore={
                isClickAndCollect && selections[item.index] === "pickup"
                  ? clickAndCollectStore
                  : selectedStores[item.index]
              }
              isClickAndCollect={isClickAndCollect}
              showPackageHeading={!isClickAndCollect && !isHeatPump}
              options={item.options}
              featuredOptionId={isClickAndCollect ? "pickup" : undefined}
              onSelect={(value) => onSelectionChange(item.index, value)}
              onStoreSelect={(value) => {
                if (isClickAndCollect && selections[item.index] === "pickup") {
                  onClickAndCollectStoreChange(value)
                  return
                }
                onStoreChange(item.index, value)
              }}
              onSourceClick={(source) =>
                setSourceModal(source as SourceModalType)
              }
            />
            {position < visiblePackages.length - 1 && (
              <div
                className="package-divider"
                key={`${item.source}-divider`}
                role="separator"
                aria-orientation="horizontal"
              />
            )}
          </Fragment>
        ))}
      </div>
      <div className="checkout-actions">
        <button className="button-back" type="button" onClick={onBack}>
          Tilbake
        </button>
        <button className="button-next" type="button" onClick={onNext}>
          Neste
        </button>
      </div>
      {sourceModal && (
        <ShipmentSourceModal
          source={sourceModal}
          onClose={() => setSourceModal(null)}
        />
      )}
    </>
  )
}

// Logos from Figma (List/Radio, node 182:31290).
function PaymentLogo({ method }: { method: string }) {
  if (method === "card") {
    return (
      <img
        className="payment-logo card-logos"
        src={assetUrl("assets/card-logos.svg")}
        alt="Visa og Mastercard"
      />
    )
  }
  if (method === "vipps" || method === "walley") {
    return (
      <img className="payment-logo" src={assetUrl(`assets/${method}-logo.svg`)} alt="" />
    )
  }
  if (method === "coopay") {
    return (
      <img className="payment-logo" src={assetUrl("assets/coopay-logo.svg")} alt="" />
    )
  }
  return (
    <span className={`payment-wordmark ${method}`} aria-hidden="true">
      {method}
    </span>
  )
}

function PaymentStep({
  productTotal,
  discount,
  deliveryTotal,
  isClickAndCollect,
  isHeatPump,
  isLoggedIn,
  onBack,
  onRestart,
}: {
  productTotal: number
  discount: number
  deliveryTotal: number
  isClickAndCollect: boolean
  isHeatPump: boolean
  isLoggedIn: boolean
  onBack: () => void
  onRestart: () => void
}) {
  const [selectedPayment, setPayment] = useState("coopay")
  const [accepted, setAccepted] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [completed, setCompleted] = useState(false)
  const total = productTotal - discount + deliveryTotal
  const requiresLogin = (option: (typeof paymentOptions)[number]) =>
    Boolean(option.loggedOutDescription && !isLoggedIn)
  const isPaymentOptionUnavailable = (
    option: (typeof paymentOptions)[number],
  ) =>
    requiresLogin(option) ||
    Boolean(
      option.unavailable &&
        !(
          isClickAndCollect ||
          (isHeatPump && option.id === "walley")
        ),
    )
  const orderedPaymentOptions = [
    ...paymentOptions.filter((option) => !isPaymentOptionUnavailable(option)),
    ...paymentOptions.filter(isPaymentOptionUnavailable),
  ]
  // A disabled option can't stay selected, e.g. Coopay after logging out.
  const payment = orderedPaymentOptions.some(
    (option) =>
      option.id === selectedPayment && !isPaymentOptionUnavailable(option),
  )
    ? selectedPayment
    : orderedPaymentOptions[0].id

  if (completed) {
    return (
      <section className="order-complete" role="status">
        <div className="order-complete-icon">
          <img src={assetUrl("assets/d64ef.svg")} alt="" />
        </div>
        <h1>Takk for bestillingen!</h1>
        <p>
          Ordren din er mottatt. En bekreftelse sendes til e-postadressen din.
        </p>
        <button className="wide-primary" type="button" onClick={onRestart}>
          Start på nytt
        </button>
      </section>
    )
  }

  return (
    <>
      <h1>Betalingsalternativer</h1>
      <fieldset className="payment-list">
        <legend className="sr-only">Velg betalingsmåte</legend>
        {orderedPaymentOptions.map((option) => {
          const selected = payment === option.id
          const unavailable = isPaymentOptionUnavailable(option)
          return (
            <label
              key={option.id}
              className={`payment-option ${
                selected ? "payment-option-selected" : ""
              } ${unavailable ? "payment-option-disabled" : ""}`}
            >
              <input
                type="radio"
                name="payment"
                value={option.id}
                checked={selected}
                disabled={unavailable}
                onChange={() => setPayment(option.id)}
              />
              <span className="radio-mark" />
              <span className="payment-copy">
                <span className="payment-title">
                  <strong>{option.title}</strong>
                  {unavailable && (
                    <span className="unavailable-tag">
                      <img src={assetUrl("assets/step3-obs/48d56.svg")} alt="" />
                      Ikke tilgjengelig
                    </span>
                  )}
                </span>
                <small>
                  {requiresLogin(option)
                    ? option.loggedOutDescription
                    : option.unavailable && !unavailable
                      ? `Betal med ${option.title}`
                      : option.description}
                </small>
              </span>
              <PaymentLogo method={option.id} />
            </label>
          )
        })}
      </fieldset>

      <section className="payment-summary">
        <div className="payment-total">
          <span>
            <strong>Totalt å betale</strong>
            <small>(Herav mva.: {formatPrice(total / 5)})</small>
          </span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <div className="payment-details-wrap">
          <button
            className="payment-details-button"
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            aria-controls="payment-details"
          >
            <span>{detailsOpen ? "Skjul detaljer" : "Vis detaljer"}</span>
            <img src={assetUrl("assets/step4/99c63.svg")} alt="" />
          </button>
          {detailsOpen && (
            <div className="payment-details" id="payment-details">
              <span>Varer</span>
              <strong>{formatPrice(productTotal)}</strong>
              {discount > 0 && (
                <>
                  <span>Rabatt</span>
                  <strong>-{formatPrice(discount)}</strong>
                </>
              )}
              <span>Levering</span>
              <strong>{formatPrice(deliveryTotal)}</strong>
            </div>
          )}
        </div>
        <label className="terms-checkbox">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked)
              if (event.target.checked) setShowTermsError(false)
            }}
          />
          <span>
            Jeg har lest og akseptert{" "}
            <a href="#vilkar" onClick={(event) => event.preventDefault()}>
              Coop sine kjøpsvilkår og vilkår for personopplysninger
            </a>
          </span>
        </label>
        <div className="complete-order-wrap">
          <button
            className="complete-order"
            type="button"
            disabled={!payment}
            aria-disabled={!payment || !accepted}
            onClick={() => {
              if (!accepted) {
                setShowTermsError(true)
                return
              }
              setCompleted(true)
            }}
          >
            Fullfør bestilling
          </button>
          {showTermsError && !accepted && (
            <p className="unavailable-button-message" role="status">
              For å fullføre bestillingen må du godta kjøpsvilkårene.
            </p>
          )}
        </div>
      </section>

      <div className="checkout-actions payment-back">
        <button className="button-back" type="button" onClick={onBack}>
          Tilbake
        </button>
      </div>
    </>
  )
}

// ?steg=3 opens the prototype directly on a step, handy when demoing.
const initialStep = Math.min(
  Math.max(Number(new URLSearchParams(window.location.search).get("steg")) || 1, 1),
  steps.length,
)

const showPrototypeLabel =
  new URLSearchParams(window.location.search).get("label") !== "0"
const initialVariant = new URLSearchParams(window.location.search).get("variant")
const initialCheckoutVariant: CheckoutVariant =
  initialVariant === "click-and-collect" ||
  initialVariant === "logged-in" ||
  initialVariant === "click-and-collect-logged-in" ||
  initialVariant === "heat-pump" ||
  initialVariant === "heat-pump-logged-in"
    ? initialVariant
    : "guest"
const isPasswordProtectionEnabled = false

export default function App() {
  const [isPasswordAccepted, setIsPasswordAccepted] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState(false)
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [highestVisitedStep, setHighestVisitedStep] = useState(initialStep)
  const [isVariantPanelVisible, setIsVariantPanelVisible] = useState(true)
  const [isVariantPanelOpen, setIsVariantPanelOpen] = useState(true)
  const [isGeneralWarningEnabled, setIsGeneralWarningEnabled] = useState(false)
  const [generalWarningSeverity, setGeneralWarningSeverity] =
    useState<GeneralWarningSeverity>("info")
  const [cartItems, setCartItems] = useState<CartItem[]>(
    isHeatPumpVariant(initialCheckoutVariant)
      ? heatPumpCartItems
      : initialCartItems,
  )
  const [deliverySelections, setDeliverySelections] = useState(
    isClickAndCollectVariant(initialCheckoutVariant)
      ? ["pickup"]
      : isHeatPumpVariant(initialCheckoutVariant)
      ? ["installer"]
      : defaultDeliverySelections,
  )
  const [selectedStores, setSelectedStores] = useState(defaultSelectedStores)
  const [clickAndCollectStore, setClickAndCollectStore] =
    useState("Obs Haugenstua")
  const [checkoutVariant, setCheckoutVariant] = useState<CheckoutVariant>(
    initialCheckoutVariant,
  )
  const [isLoggedIn, setIsLoggedIn] = useState(
    isPreLoggedInVariant(initialCheckoutVariant),
  )
  const [appliedCoupons, setAppliedCoupons] = useState<string[]>([])
  const [favoriteItems, setFavoriteItems] = useState<Record<number, boolean>>(
    {},
  )
  const toggleFavorite = (id: number) =>
    setFavoriteItems((current) => ({ ...current, [id]: !current[id] }))

  const goToStep = (step: number) => {
    setHighestVisitedStep((current) => Math.max(current, step))
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const resetCheckout = (
    variant: CheckoutVariant,
    { keepStep = false }: { keepStep?: boolean } = {},
  ) => {
    setCartItems(
      isHeatPumpVariant(variant) ? heatPumpCartItems : initialCartItems,
    )
    setDeliverySelections(
      isClickAndCollectVariant(variant)
        ? ["pickup"]
        : isHeatPumpVariant(variant)
        ? ["installer"]
        : defaultDeliverySelections,
    )
    setSelectedStores(defaultSelectedStores)
    setClickAndCollectStore("Obs Haugenstua")
    setCheckoutVariant(variant)
    setIsLoggedIn(isPreLoggedInVariant(variant))
    setAppliedCoupons([])
    // Prototype settings keep the current step; restarting goes back to step 1.
    if (keepStep) {
      setHighestVisitedStep(currentStep)
      return
    }
    setHighestVisitedStep(1)
    setCurrentStep(1)
  }

  const restart = () => resetCheckout(checkoutVariant)

  const pricedCartItems = withMembershipPricing(cartItems, isLoggedIn)
  const checkoutCartItems = isClickAndCollectVariant(checkoutVariant)
    ? pricedCartItems.filter((item) => !item.unavailableLabel)
    : pricedCartItems
  const availableItems = inStock(pricedCartItems)
  const productTotal = availableItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  )
  const deliveryPackages = isClickAndCollectVariant(checkoutVariant)
    ? [
        {
          productIds: availableItems.map((item) => item.id),
          options: clickAndCollectVariantOptions,
        },
      ]
    : isHeatPumpVariant(checkoutVariant)
      ? heatPumpPackages
      : packages
  const deliveryTotal = deliveryPackages.reduce((sum, item, index) => {
    const hasItems = availableItems.some((product) =>
      item.productIds.includes(product.id),
    )
    const option = item.options.find(
      ({ id }) => id === deliverySelections[index],
    )
    return hasItems && option ? sum + option.price : sum
  }, 0)

  const updateAt = <T,>(list: T[], index: number, value: T) =>
    list.map((current, position) => (position === index ? value : current))

  if (isPasswordProtectionEnabled && !isPasswordAccepted) {
    const checkPassword = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (password === "1405") {
        setIsPasswordAccepted(true)
        setPasswordError(false)
        return
      }

      setPasswordError(true)
    }

    return (
      <main className="password-gate">
        <form className="password-card" onSubmit={checkPassword}>
          <h1>Passordbeskyttet prototype</h1>
          <p>Skriv inn passordet for å åpne prototypen.</p>
          <label htmlFor="prototype-password">Passord</label>
          <input
            autoComplete="current-password"
            autoFocus
            id="prototype-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setPasswordError(false)
            }}
            aria-invalid={passwordError}
            aria-describedby={passwordError ? "password-error" : undefined}
          />
          {passwordError && (
            <p className="password-error" id="password-error" role="alert">
              Feil passord. Prøv igjen.
            </p>
          )}
          <button className="password-submit" type="submit">
            Åpne prototype
          </button>
        </form>
      </main>
    )
  }

  return (
    <div className="checkout-page">
      {/* Tells test participants that nothing is really ordered or paid.
          Hidden with ?label=0, e.g. for Figma captures. */}
      {showPrototypeLabel && (
        <p className="prototype-label" role="note">
          Prototype
        </p>
      )}
      {isVariantPanelVisible && (
        <div className="prototype-variant">
          <div className="prototype-variant-header">
            <button
              className="prototype-variant-toggle"
              type="button"
              aria-expanded={isVariantPanelOpen}
              aria-controls="prototype-variant-controls"
              onClick={() => setIsVariantPanelOpen((open) => !open)}
            >
              <span>Prototypeinnstillinger</span>
              <span className="prototype-variant-chevron" aria-hidden="true" />
            </button>
            <button
              className="prototype-variant-close"
              type="button"
              aria-label="Lukk prototypeinnstillinger"
              onClick={() => setIsVariantPanelVisible(false)}
            >
              ×
            </button>
          </div>
          {isVariantPanelOpen && (
            <div className="prototype-variant-controls" id="prototype-variant-controls">
              <label htmlFor="prototype-checkout-mode">Kjøpsmåte</label>
              <select
                id="prototype-checkout-mode"
                aria-label="Velg kjøpsmåte"
                value={
                  isHeatPumpVariant(checkoutVariant)
                    ? "heat-pump"
                    : isClickAndCollectVariant(checkoutVariant)
                    ? "click-and-collect"
                    : "online"
                }
                onChange={(event) => {
                  const selectedMode = event.target.value
                  const isPreLoggedIn = isPreLoggedInVariant(checkoutVariant)
                  const nextVariant: CheckoutVariant =
                    selectedMode === "click-and-collect"
                      ? isPreLoggedIn
                        ? "click-and-collect-logged-in"
                        : "click-and-collect"
                      : selectedMode === "heat-pump"
                        ? isPreLoggedIn
                          ? "heat-pump-logged-in"
                          : "heat-pump"
                        : isPreLoggedIn
                          ? "logged-in"
                          : "guest"
                  resetCheckout(nextVariant, { keepStep: true })
                }}
              >
                <option value="online">Kjøp på nett</option>
                <option value="click-and-collect">Klikk og hent</option>
                <option value="heat-pump">Bestilling (varmepumpe)</option>
              </select>
              <h2 className="prototype-scenario-heading">Gå til steg</h2>
              <div className="prototype-step-shortcuts">
                {steps.map((step, index) => (
                  <button
                    key={step}
                    type="button"
                    aria-label={`Gå til steg ${index + 1}: ${step}`}
                    aria-current={currentStep === index + 1 ? "step" : undefined}
                    onClick={() => goToStep(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <h2 className="prototype-scenario-heading">Ulike scenarioer</h2>
              <button
                className="prototype-login-setting"
                type="button"
                role="switch"
                aria-checked={isPreLoggedInVariant(checkoutVariant)}
                onClick={() => {
                  const wasLoggedIn = isPreLoggedInVariant(checkoutVariant)
                  const nextVariant: CheckoutVariant = isHeatPumpVariant(
                    checkoutVariant,
                  )
                    ? wasLoggedIn
                      ? "heat-pump"
                      : "heat-pump-logged-in"
                    : isClickAndCollectVariant(checkoutVariant)
                      ? wasLoggedIn
                        ? "click-and-collect"
                        : "click-and-collect-logged-in"
                      : wasLoggedIn
                        ? "guest"
                        : "logged-in"
                  resetCheckout(nextVariant, { keepStep: true })
                }}
              >
                <span className="prototype-login-label">Logget inn</span>
                <span className="prototype-login-toggle" aria-hidden="true">
                  <span />
                </span>
              </button>
              <button
                className="prototype-login-setting"
                type="button"
                role="switch"
                aria-checked={isGeneralWarningEnabled}
                onClick={() =>
                  setIsGeneralWarningEnabled((enabled) => !enabled)
                }
              >
                <span className="prototype-login-label">Generelt varsel</span>
                <span className="prototype-login-toggle" aria-hidden="true">
                  <span aria-hidden="true" />
                </span>
              </button>
              {isGeneralWarningEnabled && (
                <label className="prototype-warning-severity">
                  <span>Type varsel</span>
                  <select
                    aria-label="Velg type varsel"
                    value={generalWarningSeverity}
                    onChange={(event) => {
                      const severity = event.target.value
                      if (
                        severity === "info" ||
                        severity === "warning" ||
                        severity === "critical"
                      ) {
                        setGeneralWarningSeverity(severity)
                      }
                    }}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              )}
            </div>
          )}
        </div>
      )}
      <CheckoutHeader />
      <main className="checkout-content">
        {isGeneralWarningEnabled && (
          <GeneralWarning severity={generalWarningSeverity} />
        )}
        <Stepper
          current={currentStep}
          highestVisited={highestVisitedStep}
          onStepClick={goToStep}
        />
        <div className="checkout-main">
          {currentStep === 1 && (
            <CartStep
              items={checkoutCartItems}
              showUnavailableItems={isPreLoggedInVariant(checkoutVariant)}
              storeHeading={
                isClickAndCollectVariant(checkoutVariant)
                  ? { label: "Klikk og hent:", store: clickAndCollectStore }
                  : isHeatPumpVariant(checkoutVariant)
                    ? { label: "Valgt butikk:", store: selectedStores[0] }
                    : undefined
              }
              appliedCoupons={appliedCoupons}
              onAppliedCouponsChange={setAppliedCoupons}
              onQuantityChange={(id, change) =>
                setCartItems((current) =>
                  current.map((item) =>
                    item.id === id
                      ? {
                          ...item,
                          // The stepper cannot exceed available stock; manual
                          // quantity entry still exposes the stock warning.
                          quantity:
                            change > 0
                              ? Math.min(
                                  item.quantity + change,
                                  item.stock ?? Infinity,
                                )
                              : Math.max(1, item.quantity + change),
                        }
                      : item,
                  ),
                )
              }
              onSetQuantity={(id, quantity) =>
                setCartItems((current) =>
                  current.map((item) =>
                    item.id === id ? { ...item, quantity } : item,
                  ),
                )
              }
              onRemove={(id) =>
                setCartItems((current) =>
                  current.filter((item) => item.id !== id),
                )
              }
              favoriteItems={favoriteItems}
              onToggleFavorite={toggleFavorite}
              onNext={() => goToStep(2)}
            />
          )}
          {currentStep === 2 && (
            <DetailsStep
              key={isLoggedIn ? "logged-in" : "guest"}
              onBack={() => goToStep(1)}
              onNext={() => goToStep(3)}
              isLoggedIn={isLoggedIn}
              onLoggedIn={() => setIsLoggedIn(true)}
            />
          )}
          {currentStep === 3 && (
            <DeliveryStep
              items={availableItems}
              isClickAndCollect={isClickAndCollectVariant(checkoutVariant)}
              isHeatPump={isHeatPumpVariant(checkoutVariant)}
              unavailableItems={
                isPreLoggedInVariant(checkoutVariant) ||
                isClickAndCollectVariant(checkoutVariant)
                  ? []
                  : cartItems
                      .filter((item) => item.id === guestUnavailableProductId)
                      .map((item) => ({
                        ...item,
                        soldOut: true,
                        unavailableLabel: unavailableProductLabel,
                      }))
              }
              appliedCoupons={appliedCoupons}
              selections={deliverySelections}
              selectedStores={selectedStores}
              clickAndCollectStore={clickAndCollectStore}
              onSelectionChange={(index, value) =>
                setDeliverySelections((current) =>
                  updateAt(current, index, value),
                )
              }
              onClickAndCollectStoreChange={setClickAndCollectStore}
              onStoreChange={(index, value) =>
                setSelectedStores((current) => updateAt(current, index, value))
              }
              favoriteItems={favoriteItems}
              onToggleFavorite={toggleFavorite}
              onBack={() => goToStep(2)}
              onNext={() => goToStep(4)}
            />
          )}
          {currentStep === 4 && (
            <PaymentStep
              productTotal={productTotal}
              discount={couponSavings(availableItems, appliedCoupons).reduce(
                (sum, { amount }) => sum + amount,
                0,
              )}
              deliveryTotal={deliveryTotal}
              isClickAndCollect={isClickAndCollectVariant(checkoutVariant)}
              isHeatPump={isHeatPumpVariant(checkoutVariant)}
              isLoggedIn={isLoggedIn}
              onBack={() => goToStep(3)}
              onRestart={restart}
            />
          )}
        </div>
      </main>
      <CheckoutFooter />
    </div>
  )
}
