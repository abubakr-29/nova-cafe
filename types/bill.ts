export type BillPaymentStatus = "unpaid" | "partially_paid" | "paid";

export type Bill = {
  id: string;
  sessionId: string;

  subtotal: number;
  tax: number;
  total: number;

  paymentStatus: BillPaymentStatus;
};
