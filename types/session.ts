import { PaymentMethod } from "@/types/payment";

export type TableGuest = {
  id: string;
  name: string;
};

export type TableSession = {
  id: string;

  restaurantId: string;
  tableId: string;
  tableName: string;

  guests: TableGuest[];

  orderIds: string[];

  startedAt: string;
  status: "open" | "billing" | "closed";

  billRequested: boolean;
  paymentStatus: "unpaid" | "claimed" | "paid";
  paymentMethod: PaymentMethod | null;
};
