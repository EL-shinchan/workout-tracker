# Iron Log User Profiles Design

## Goal
Allow Eddie and Jason to use the same local Iron Log app while keeping workout history, dashboard stats, progress, and new workout entries separated by active profile.

## Users
Initial users:

- Eddie
- Jason

No passwords or login are included in this version. This is a local-family profile switcher, not an authentication system.

## Database changes
Add a `users` table:

- `id`
- `name`
- `created_at`

Add `user_id` to `workouts`.

Migration rules:

- Create Eddie and Jason if missing.
- Existing workouts are assigned to Eddie by default.
- New workouts require/receive active user id.

## Backend API
Add profile endpoints:

- `GET /api/users` — list users and active user
- `PUT /api/users/active` — set active user

Active user can be stored in local config because this is a single local app instance.

Existing workout/dashboard/progress APIs should filter by active user unless a specific user id is provided later.

## Frontend changes
Add a Users page:

- shows Eddie and Jason cards
- lets Eddie switch active profile
- shows current active profile clearly

Update navigation with `Users`.

Update app behavior:

- New Workout saves under active user
- History lists active user's workouts
- Progress shows active user's progress
- Dashboard stats/recent sessions reflect active user

## Non-goals
- Passwords/logins
- Cloud accounts
- Multi-device conflict handling
- Fine-grained privacy/security

## Testing
- Migration preserves existing workout data under Eddie.
- Switching active user changes Dashboard/History/Progress results.
- New workout saves to selected active user.
- Jason starts with empty history/progress until he logs workouts.
