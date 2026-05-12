# Coach Fox Plan Context Fix

## Goal

Fix Coach Fox workout-plan requests that fall through to generic Gemini answers when the user uses natural follow-up wording.

Reported examples:

- `upperbody workout plan` did not produce the structured local plan.
- After asking for a plan, `how about lower body` produced an explanation instead of another structured plan.

## Scope

- Add aliases:
  - `upperbody`, `upper body` → upper body plan
  - `lowerbody`, `lower body` → lower body / legs plan
- Add short browser-local chat context:
  - remember when the last successful local action was a workout plan
  - if the next message says `how about <target>` or just names a target, treat it as another workout plan request
- Add an upper body plan template.
- Keep lower body mapped to the existing legs plan.
- Keep medical safety first.
- Keep `Start this workout` button and draft transfer unchanged.

## Validation

- `node --check public/scripts/chat.js`
- Source checks for upper/lower aliases and last plan context.
- Manual app check should try:
  - `upperbody workout plan`
  - `create me a chest workout plan` then `how about lower body`
  - `my chest hurts during bench press`
