# Privacy (Data Privacy Act of 2012, RA 10173)

PondoPal holds personal financial data, so it follows RA 10173. This page lists what the app stores and how users exercise their rights. It is an engineering summary, not legal advice; have a privacy notice reviewed before launch.

## What is stored
- **Account:** email or mobile number (Supabase Auth), display name, avatar, language, Expo push token.
- **Money data:** transactions (amount, date, note, category, payment source, receipt photo), budgets, bills, goals, challenge entries.
- **Notifications:** reminder history in the in-app inbox.

Access is limited by RLS: people see only spaces they belong to (ADR 0004). The service-role key exists only on the backend.

## Rights
| Right | How |
|---|---|
| Access and portability | Profile → **Download my data**, which calls `GET /v1/me/export` and shares a JSON file. It holds everything the user entered: profile, memberships, payment sources, transactions, split shares, settlements, goal contributions, challenge entries, paluwagan contributions and notifications. |
| Erasure | Profile → **Delete my account**, which calls `DELETE /v1/me`. |
| Correction | Users edit or delete their own entries in the app. |

## What account deletion does
In one database transaction (`backend/app/repositories/account.py`):
1. Each shared space the user owns passes to another member: an admin first, then a member, then a viewer, earliest joined first.
2. Shared spaces the user owns with nobody else in them are deleted.
3. The auth user is deleted. That removes the profile, payment sources, memberships, challenge entries and notifications, and (by trigger) the personal space with everything in it.

Transactions and goal contributions the user logged in **shared** spaces stay, with `user_id` set to null. The other members' budgets still add up, and nothing in those rows points back to the person.

After the database commits, the backend deletes the user's files from Storage: `avatars/<user_id>/` and `receipts/<personal_space_id>/`. This needs `SUPABASE_SERVICE_ROLE_KEY`. If it fails, the error is logged and the files stay unreachable (their owner and space are gone) until removed.

Receipts the user attached in shared spaces stay with those transactions.

## Logs
Logs carry request IDs, route templates, status codes and counts. They never include tokens, request bodies, names, amounts or raw paths. Sentry runs with `send_default_pii=False`.
