# Iron Log Plans Page Design

## Goal

Add a non-payment Plans page to Iron Log as the first safe step toward future paid subscriptions.

This page should make the product direction clear without handling real payments yet.

## Position

Do **not** add Stripe or real paid checkout in this step.

The current app is still local/private. Real subscriptions require production hosting, legal pages, public auth, secure database, and Stripe webhooks. The Plans page is a product/design layer only.

## Scope

### Included

- New `Plans` page in app navigation.
- Free vs Pro feature cards.
- Current plan badge.
- Disabled/fake upgrade button labeled `Coming soon`.
- Short explanation that payments are not live yet.
- Clear list of what would become Pro later.
- Styling matches Iron Log light colorful theme.

### Not Included

- No Stripe.
- No real checkout.
- No card collection.
- No subscription database tables.
- No feature locking yet.
- No legal pages yet.

## User Experience

Add nav item:

```text
Plans
```

Page layout:

1. Hero section
2. Current plan status
3. Free plan card
4. Pro plan card
5. Future billing note

### Hero

Title:

```text
Choose how Iron Log grows with you
```

Copy:

```text
Manual tracking stays useful. Pro will later unlock smarter AI and automation once Iron Log is ready for public launch.
```

### Current Plan

For now, every user is on:

```text
Free — local preview
```

Show a badge:

```text
Current plan
```

### Free Card

Features:

- workout logging
- workout history
- progress basics
- manual nutrition tracking
- local Coach Fox basics
- dashboard command center

Button:

```text
Current plan
```

Disabled or non-clicky.

### Pro Card

Features planned for future:

- Gemini Coach Fox AI
- nutrition macro estimates
- photo/video workout import
- advanced dashboard insights
- weekly reports later
- priority future features

Button:

```text
Coming soon
```

Click behavior:

- either disabled, or shows friendly message:

```text
Payments are not live yet. Build the product first, then Stripe.
```

Recommended: use disabled-looking button plus small note, no modal needed.

## Tone

Keep language honest and not scammy.

Good:

- `Coming soon`
- `Not charging yet`
- `Build value before payments`

Avoid:

- fake urgency
- fake discounts
- fake checkout buttons
- pretending payment works

## Frontend Architecture

Files:

- `public/plans.html`
- optional `public/scripts/plans.js` if needed for tiny status message
- `public/styles/main.css`
- nav updates in app pages
- `public/sw.js` cache update

No backend required for V1.

## Future Stripe Path

When production foundation is ready, this page can later connect to:

- `POST /api/billing/create-checkout-session`
- `POST /api/billing/create-portal-session`
- Stripe webhook endpoint
- subscription status API

But this is explicitly future work.

## Validation

Minimum checks:

- `plans.html` serves after login.
- nav link appears on main app pages.
- page clearly says payments are not live.
- no real payment forms or checkout links exist.
- service worker cache includes plans page if needed.
- styling works on mobile.
