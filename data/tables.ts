import type { RestaurantTable } from "@/types/table";

export const tables: RestaurantTable[] = [
  {
    id: "table-01",
    name: "Table 01",
    seats: 2,
    status: "available",
    shape: "round",
    position: {
      x: 12,
      y: 18,
      width: 11,
      height: 11,
    },
  },

  {
    id: "table-02",
    name: "Table 02",
    seats: 2,
    status: "occupied",
    shape: "round",
    position: {
      x: 32,
      y: 18,
      width: 11,
      height: 11,
    },
    sessionId: "session-102",
    guestCount: 2,
    currentTotal: 638,
    orders: [
      {
        id: "order-1045",
        orderNumber: "1045",
        status: "preparing",
        total: 638,
        itemCount: 3,
      },
    ],
  },

  {
    id: "table-03",
    name: "Table 03",
    seats: 4,
    status: "available",
    shape: "round",
    position: {
      x: 52,
      y: 18,
      width: 13,
      height: 13,
    },
  },

  {
    id: "table-04",
    name: "Table 04",
    seats: 4,
    status: "reserved",
    shape: "rectangle",
    position: {
      x: 20,
      y: 40,
      width: 17,
      height: 12,
    },
  },

  {
    id: "table-05",
    name: "Table 05",
    seats: 4,
    status: "occupied",
    shape: "rectangle",
    position: {
      x: 46,
      y: 40,
      width: 17,
      height: 12,
    },
    sessionId: "session-105",
    guestCount: 3,
    currentTotal: 927,
    orders: [
      {
        id: "order-1046",
        orderNumber: "1046",
        status: "ready",
        total: 927,
        itemCount: 4,
      },
    ],
  },

  {
    id: "table-06",
    name: "Table 06",
    seats: 6,
    status: "occupied",
    shape: "rectangle",
    position: {
      x: 35,
      y: 61,
      width: 24,
      height: 14,
    },
    sessionId: "session-106",
    guestCount: 5,
    currentTotal: 1486,
    orders: [
      {
        id: "order-1047",
        orderNumber: "1047",
        status: "preparing",
        total: 812,
        itemCount: 4,
      },
      {
        id: "order-1048",
        orderNumber: "1048",
        status: "ready",
        total: 674,
        itemCount: 3,
      },
    ],
  },

  {
    id: "table-07",
    name: "Table 07",
    seats: 4,
    status: "occupied",
    shape: "round",
    position: {
      x: 12,
      y: 70,
      width: 13,
      height: 13,
    },
    sessionId: "session-107",
    guestCount: 3,
    currentTotal: 1247,
    orders: [
      {
        id: "order-1049",
        orderNumber: "1049",
        status: "preparing",
        total: 767,
        itemCount: 3,
      },
      {
        id: "order-1052",
        orderNumber: "1052",
        status: "pending",
        total: 767,
        itemCount: 3,
      },
    ],
  },

  {
    id: "table-08",
    name: "Table 08",
    seats: 2,
    status: "attention",
    shape: "round",
    position: {
      x: 72,
      y: 72,
      width: 11,
      height: 11,
    },
    sessionId: "session-108",
    guestCount: 2,
    currentTotal: 438,
    orders: [
      {
        id: "order-1051",
        orderNumber: "1051",
        status: "served",
        total: 438,
        itemCount: 2,
      },
    ],
  },
];
