# Sarman Luxury — Fix Notes

This document explains everything that was changed in this pass, why it was broken, and what (if anything) you still need to decide or follow up on. It only touches the **frontend** (`SarmanLuxury/`); the `backend/` folder is unchanged.

All fixes were verified with `npm run build` (clean) and `npx eslint .` (no new errors introduced — see "Lint" section at the bottom). I don't have network access to the live API in this environment, so these are verified by code review + build, not by clicking through against your real database — test the flows below once you deploy.

---

## 1. Cart page crashed on load (`/cart`)

**File:** `src/pages/Cart.jsx` (rewritten)

The page was destructuring `cartItems`, `increaseQuantity`, `decreaseQuantity` from `useCart()`, but `CartContext` actually exports `cart`, `increaseQty`, `decreaseQty`. Since `cartItems` was `undefined`, the very first line — `cartItems.reduce(...)` — threw a `TypeError` during render. Anyone who navigated straight to `/cart` got a blank crashed page. (The cart *slide-out* sidebar was unaffected — it used the correct field names all along, which is why this one was easy to miss.)

The page also assumed a flat item shape (`item.id`, `item.name`, `item.image`, `item.price`) that never matched what the backend actually returns (`item.product.name`, `item.product.images`, `item.product.price`, `item.quantity`). Rewrote the page to match the real `CartContext`/backend shape, added a loading state, and hid the checkout button when the cart is empty. Also fixed a stray `$` that showed up instead of `₹` for the subtotal/total (everywhere else in the app uses ₹).

## 2. "Add to Cart" / "Buy Now" silently failed on the product page

**File:** `src/pages/Product.jsx`

This was the most serious bug found in the whole audit, and it affected **every** user, not just guests. `handleAddToCart` and `handleBuyNow` called:

```js
addToCart({ ...product, size: selectedSize })
```

`addToCart(productId, quantity)` expects a product ID string as the first argument — this was passing the *entire product object* instead. The backend would receive a complex object where it expected a Mongo ObjectId, which fails. Meanwhile the code showed `toast.success("Added to cart")` unconditionally right after, so the failure was completely invisible. Fixed to call `addToCart(product._id, 1)`, and wrapped in a try/catch so the success toast only fires on an actual successful response.

One related thing to flag rather than silently fix: the size selector on shoe products has never actually been wired to anything persisted — the `Cart` schema in the backend has no `size` field, so even now that `addToCart` works correctly, the chosen size isn't stored anywhere. If size-per-cart-item matters to you, that needs a small schema change (`Cart.items[].size`) plus updating the cart UI to display it — out of scope for a "fix the broken stuff" pass, but worth knowing about.

## 3. Guests got a fake "Added to Cart" success message, then got silently bounced to login

**Files:** `src/context/CartContext.jsx`, `src/context/WishlistContext.jsx`, `src/api/axios.js`

`/cart` and `/wishlist` endpoints require a logged-in user on the backend. When a guest clicked "Add to Cart," the request failed with a 401, but the context swallowed the error (`console.log` only) and the calling component showed a success toast regardless. Then the global axios interceptor caught the 401, cleared `localStorage`, and hard-redirected to `/login` with zero explanation — so a guest would see "Added to cart," then get unexpectedly kicked to the login page.

Fixed by:
- Adding an explicit guest check in `addToCart` and `addToWishlist` that shows `toast.error("Please login to add items to your cart/wishlist")` and throws *before* ever hitting the API.
- Making every cart/wishlist context function rethrow real errors instead of swallowing them, so the calling button can decide whether to show a success or error toast.
- Updating the axios 401 interceptor to only force-redirect when the user actually *had* a session that just expired (not for guests who never had one), and to show a clear "Your session has expired. Please log in again." toast when it does happen.

## 4. Wishlist "add" button didn't exist anywhere in the app

**Files:** `src/components/Products/ProductCard.jsx`, `src/pages/Product.jsx`, `src/context/WishlistContext.jsx`

The only place in the entire codebase that called `addToWishlist` was `ProductModal.jsx` — a "quick view" component that's never imported or rendered anywhere. The Wishlist page, context, and backend all worked fine; there was just no live button to actually use them. Rather than wire up the orphaned modal (which has its own bugs — it still uses `product.id`/`product.image` instead of `product._id`/`product.images`), I added a heart-shaped wishlist toggle directly to the product card (top-right of the image) and the product detail page (next to Add to Cart / Buy Now), which is simpler and consistent with how the existing buttons already work. `ProductModal.jsx` itself was left in place but is still unused — let me know if you want it wired up as an actual quick-view popup instead.

Added an `isInWishlist(productId)` helper to `WishlistContext` so the heart icon can show filled/active state correctly.

## 5. Wishlist page showed broken images

**File:** `src/pages/Wishlist.jsx`

Was reading `item.image?.[0]`, but the Product schema's field is `images` (plural). Every wishlist thumbnail rendered blank/broken. Fixed to `item.images?.[0]`, with a placeholder fallback for products with no images at all.

## 6. Homepage category cards and Hero button did nothing

**Files:** `src/components/Categories/Categories.jsx`, `src/components/Hero/Hero.jsx`, `src/pages/Collections.jsx`

The four "Shop by Category" cards and their "EXPLORE →" buttons had no `onClick` at all — just styled, cursor-pointer divs that didn't navigate. Same with the Hero section's "EXPLORE COLLECTION" button. Fixed both to navigate to `/collections`, and for the category cards specifically, to `/collections?category=Watches` (or Shoes/Bags/Sunglasses) so the right filter is pre-applied. That required teaching `Collections.jsx` to read a `category` query param via `useSearchParams()` and apply it as the initial product-category filter — previously that filter only existed as local dropdown state with no way to deep-link into it.

## 7. Footer links and social icons did nothing

**File:** `src/components/Footer/Footer.jsx` (+ `Footer.css` for style resets)

The "SHOP" category list (Watches/Shoes/Bags/Sunglasses) and "Contact Us" under SUPPORT were plain `<li>` text, not links. The four social icons (Facebook/Instagram/Twitter/YouTube) weren't wrapped in anchors either. Fixed the shop links to point to `/collections?category=X` (same mechanism as #6), "Contact Us" to `/contact`, and the email/phone in the CONTACT column to real `mailto:`/`tel:` links.

**The social icons need your attention:** I wrapped them in real `<a target="_blank">` tags so they're clickable, but I don't know your actual Facebook/Instagram/Twitter/YouTube URLs, so they currently point to the generic `facebook.com` / `instagram.com` / etc. homepages as placeholders. Search for `TODO: replace with your real social profile URLs` in `Footer.jsx` and swap in your real profile links.

## 8. Contact info didn't match between pages

**Files:** `src/pages/Contact.jsx`, `src/components/Footer/Footer.jsx`

The Contact page listed "Bhopal, Madhya Pradesh" and `+91 9876543210`; the footer (and the WhatsApp chat bubble) listed "Indore, India" and `+91 89894 88886`. I aligned `Contact.jsx` to match the footer/WhatsApp number, since that one is independently verified by the working WhatsApp link elsewhere in the app. **Double-check this is actually correct for your business** — I picked the version that was already proven "live" elsewhere, but I'm guessing at which one was the typo.

## 9. Analysis page (superadmin) showed fabricated numbers and an inert filter

**File:** `src/pages/Analysis.jsx`

Two separate problems here:
- The WEEK/MONTH/YEAR toggle visually highlighted the selected button but never actually changed any of the data shown below it.
- The "Monthly Revenue" and "User Growth" charts weren't using your real `orders`/`users` data at all — they were generated from a seeded pseudo-random number function, sitting right next to other charts on the same page built from real data. Anyone using this page for actual business decisions would be looking at invented numbers without any indication they weren't real.

Replaced both fake generators with real computations from the orders/users your backend already returns, and made the period toggle genuinely filter the date window: "week" buckets the last 7 days, "month" the last 30 days, "year" the last 12 months — driving the revenue trend chart, user growth chart, top products, order status breakdown, average order value, and cancellation rate. The top-line "Total Revenue / Total Orders" cards stay all-time on purpose (they're already labeled "All-time gross"), everything else now responds to the toggle.

## 10. Dead placeholder image service

**Files:** `src/components/Products/ProductCard.jsx`, `src/pages/Cart.jsx`, `src/pages/Wishlist.jsx`

Image fallbacks pointed to `via.placeholder.com`, which has become unreliable (intermittent outages/SSL errors). Switched all fallbacks to `placehold.co`, which is the actively maintained replacement.

## 11. Misplaced/dead files removed

- `src/data/products.js` — this wasn't frontend data at all, it was a stray copy of the backend's Mongoose `Product`/review schema (`require("mongoose")`, etc.) sitting in the frontend source tree. It wasn't imported anywhere, but it broke linting and had no business being there. Deleted.
- `src/components/Features/` — an empty folder, never populated, never imported. Deleted.

---

## What I deliberately did NOT change

- **The backend** (`backend/`) is untouched. Everything above was fixable on the frontend.
- **`ProductModal.jsx`** is still unused/orphaned (see #4) — left in place rather than deleted, in case you want it built into an actual quick-view popup later.
- **Lint warnings about `useEffect` + `setState`**: this project's ESLint config (`eslint-plugin-react-hooks` v7) flags the standard "fetch data in an effect, then call setState" pattern as an error. That pattern is used throughout the existing codebase (cart fetching, products fetching, admin dashboards, etc.) and is one of the most common, well-documented patterns in React — I followed the same existing style rather than rewriting the app's data-fetching architecture to satisfy one strict lint rule. None of these affect runtime behavior; `npm run build` is clean.
- A few pre-existing lint issues inside `Analysis.jsx`'s SVG chart helpers (an unused `useRef` import, an unused `PIE_COLORS` constant, a `let angle` reassignment inside the donut-chart math) were already there before this pass and aren't related to anything reported — left alone to keep this changeset focused.

## Quick test checklist once deployed

1. Log out, click any "Add to Cart" button → should see "Please login to add items to your cart" instead of a false success message.
2. Log in, add something to cart, go to `/cart` directly (typed URL, not via the cart icon) → page should render normally instead of crashing.
3. From the product detail page, add to cart / buy now → item should actually appear in your cart (this was completely broken before, for all users).
4. Click the heart icon on a product card or product page → item should appear on `/wishlist`.
5. From the homepage, click a category card or "EXPLORE COLLECTION" → should land on `/collections` with the right filter applied.
6. Check the footer shop links, "Contact Us," and the social icons (after you swap in your real URLs).
7. As superadmin, visit `/analysis` and toggle WEEK/MONTH/YEAR → the numbers and charts should visibly change.
