# NOVA café: data policy

Short rules for how orders, photos and test data are handled.

## What is kept

- Orders, order items, payments, tables and the menu are **kept**. Nothing is deleted automatically.
- Reports and History read the full records. They show a short window by default (the live board shows today and open tables only; History shows one business day; Reports up to 92 days at a time). Older days are still in the database and are reached with the calendar.
- Guests' names are stored per table visit. No phone numbers or emails are collected from guests.

## Before a café goes live

1. Look at what would be removed: `select public.reset_test_data('<slug>', now());` (it only counts).
2. If the numbers are what you expect, run it for real: `select public.reset_test_data('<slug>', now(), 'RESET <slug>');`
3. It removes the test orders and visits. It keeps the menu, tables, staff, payment settings and the billing switch.
4. Use it **only before opening to real customers**. After go-live, real orders are records: do not run it for that café.

## Photos

- Run `scripts/clean-unused-photos.mjs <slug>` after big menu changes. It only lists unless you add `--apply`.
- It keeps every photo a menu item or an open bill uses, and every photo younger than 24 hours.

## Deleting old data (not enabled)

- Today: nothing is deleted. The database is small, so there is no reason to.
- If it ever grows too big, the plan is: keep a one-line summary per day for ever, and delete the detailed orders older than a fixed period only after the owner has downloaded the CSV files. Check how long a café must keep its sales records with their accountant first (GST rules apply).

## Removing a café

- Deleting a café row deletes everything of that café (orders, menu, tables, staff profiles). Export the CSV files first. The photo files stay in storage until the photo script is run for it.
