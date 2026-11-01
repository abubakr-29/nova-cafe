# New café checklist

Do these in order. Replace `blue-door` with the café's slug.

1. **Owner login.** Supabase > Authentication > Users > Add user: owner's email and a password, tick Auto Confirm. Send the owner the password privately; they sign in at `/login`.
2. **Create the café.** SQL Editor: run the dry run, read the result, then run it again with `p_confirm => 'CREATE blue-door'` (see `018_create_restaurant.sql`).
3. **Sign in as the owner** (private window) and check Dashboard > Tables shows the starter tables.
4. **UPI.** Settings > Payments: UPI ID and payee name (or upload the UPI QR image). Cash on/off.
5. **Menu.** Menu > Import (CSV or paste) or add items by hand. Prices in ₹.
6. **Photos** (optional). Menu > Photos, bulk by file name.
7. **Tables.** Rename or add tables to match the real floor (Tables page).
8. **QR sheet.** Tables > QR sheet: print one per table; stick them on.
9. **Test order.** Scan one QR on a phone, order, validate on the dashboard, pay. Then wipe the test data: `reset_test_data('blue-door', now())`, then again with `'RESET blue-door'`.
10. **Tell the owner** their business day starts at the time you set (default 05:00) and that reports are owner-only.

To pause a café: set its `restaurant_billing.status` to `suspended`.
