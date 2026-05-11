# Iron Log Subscription Roadmap

## Position

Do not add real paid subscriptions to the current local Mac mini version yet.

Iron Log currently works as a local/private app. Real paid subscriptions require production hosting, secure account infrastructure, legal pages, billing webhooks, support flows, and reliable backups. Adding payments before those foundations would make the app risky and messy.

## Goal

Prepare Iron Log for future real paid subscriptions without rushing money handling too early.

The target future state is:

- public web app
- real user accounts
- secure hosted database
- Stripe checkout
- subscription status per user
- Pro feature gating
- customer portal for cancellations/payment updates

## Recommended Roadmap

### Phase 1 — Product Strength First

Finish making Iron Log useful enough that someone would actually pay for it.

Core features to polish:

- workout logging
- history/progress graphs
- Coach Fox AI chat
- nutrition tracker
- macro goals
- food estimate helper
- mobile/PWA polish
- bug fixes and reliability

Success condition:

- one user can use it daily for at least 1-2 weeks without the app feeling broken or annoying.

### Phase 2 — Production Foundation

Move from local app thinking to real hosted app thinking.

Needed:

- hosted server
- real domain
- HTTPS
- production database, likely Postgres
- migration away from local SQLite for public users
- secure auth sessions
- password reset / account recovery
- backups
- deployment process
- environment variables/secrets management

Success condition:

- a new user can sign up from the internet and safely use their own private data.

### Phase 3 — Legal and Trust Basics

Before charging money, add basic trust/legal pages.

Needed pages:

- Privacy Policy
- Terms of Service
- Refund/Cancellation Policy
- Contact/Support page

Important topics:

- what data is stored
- AI limitations
- no medical advice disclaimer
- cancellation/refund process
- under-18 usage / parent involvement if relevant

Success condition:

- app is not pretending to be a medical/diet professional, and users understand what they are paying for.

### Phase 4 — Subscription Design

Decide plans and feature gates before coding Stripe.

Suggested simple plans:

#### Free

- manual workout logging
- basic history
- manual nutrition logging
- limited Coach Fox/local answers

#### Pro

- Gemini/AI Coach Fox
- nutrition macro estimate
- photo/video workout import
- advanced progress summaries
- weekly reports later

Avoid too many tiers. Start with Free + Pro.

Success condition:

- there is a clear reason to upgrade, but the free app still feels useful.

### Phase 5 — Stripe Integration

Only after the above foundations exist.

Backend pieces:

- Stripe customer id per user
- subscription status per user
- Stripe Checkout session creation
- Stripe customer portal session creation
- webhook endpoint for subscription updates
- plan/product IDs stored in env/config
- feature gate helper on backend

Frontend pieces:

- Plans/Pricing page
- Upgrade button
- Manage billing button
- Pro badge/status in Settings
- clear locked-feature messages

Stripe events to handle:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Success condition:

- payment status comes from Stripe webhooks, not just browser redirects.

### Phase 6 — Pro Feature Gates

Gate expensive or premium features.

Good first gates:

- AI Coach Fox messages beyond local basics
- nutrition estimate endpoint
- photo/video import processing
- future weekly reports

Do not gate basic manual logging. Manual logging should keep the app useful.

Success condition:

- unpaid users can still use Iron Log; paid users get high-value smart features.

## Technical Architecture for Future Stripe

Likely future tables:

### `billing_customers`

- `user_id`
- `stripe_customer_id`
- `created_at`

### `subscriptions`

- `user_id`
- `stripe_subscription_id`
- `status`
- `price_id`
- `current_period_end`
- `cancel_at_period_end`
- `updated_at`

### `feature_usage`

Optional later.

- `user_id`
- `feature_key`
- `usage_date`
- `count`

## Environment Variables Later

```text
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRO_PRICE_ID=...
APP_PUBLIC_URL=https://ironlog.example.com
```

Never expose `STRIPE_SECRET_KEY` or webhook secret to the browser.

## What Not To Do Now

- Do not add fake payment buttons that look real.
- Do not collect card details manually.
- Do not store payment information in Iron Log.
- Do not use Stripe before production auth/hosting is ready.
- Do not promise medical or diet outcomes as paid features.

## Near-Term Alternative

Before real payments, build a non-payment `Plans` page later.

Purpose:

- make the app feel product-ready
- clarify Free vs Pro features
- prepare copy/design for Stripe later
- no real money handling

This is safe to build before production hosting.

## Recommendation

Next best work is not Stripe. Next best work is:

1. polish Nutrition and Coach Fox
2. improve Dashboard with workout + nutrition summary
3. add a non-payment Plans page only when the product feels stable
4. revisit real Stripe after hosting/auth/database are production-ready
