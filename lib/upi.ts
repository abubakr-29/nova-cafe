// Same rule as the database check on restaurant_payment_settings.upi_id.
export const UPI_ID_PATTERN =
  /^[A-Za-z0-9._-]{2,100}@[A-Za-z][A-Za-z0-9.]{1,63}$/;

export function isValidUpiId(value: string) {
  return UPI_ID_PATTERN.test(value);
}

/** upi://pay link that opens the customer's UPI app with everything filled in. */
export function buildUpiLink(args: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const enc = encodeURIComponent;

  return (
    `upi://pay?pa=${args.upiId}` +
    `&pn=${enc(args.payeeName.slice(0, 60))}` +
    `&am=${args.amount.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${enc(args.note.slice(0, 40))}`
  );
}
