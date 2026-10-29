export type PaymentMethod = "upi" | "cash" | "card";

/** What a customer may see about how this café takes payment. */
export type PaymentOptions = {
  upiId: string | null;
  payeeName: string;
  /** Public URL of the café's own UPI QR picture, if the owner uploaded one. */
  qrUrl: string | null;
  acceptsCash: boolean;
};
