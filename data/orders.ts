import type { Order } from "@/types/order";

export const orders: Order[] = [
  {
    id: "order-1045",
    orderNumber: "1045",
    validationCode: "7734",
    restaurantId: "nova-cafe",
    tableId: "table-02",
    tableName: "Table 02",

    status: "served",

    items: [
      {
        orderItemId: "order-item-1045-1",
        menuItemId: "iced-spanish-latte",
        name: "Iced Spanish Latte",
        image:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=300&q=80",
        basePrice: 219,
        quantity: 2,
        addons: [],
        unitPrice: 219,
        totalPrice: 438,
      },
      {
        orderItemId: "order-item-1045-2",
        menuItemId: "classic-croissant",
        name: "Classic Croissant",
        image:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80",
        basePrice: 149,
        quantity: 1,
        addons: [],
        unitPrice: 149,
        totalPrice: 149,
      },
    ],

    subtotal: 587,
    tax: 0,
    total: 587,

    createdAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
  },
  {
    id: "order-1052",
    orderNumber: "1052",
    validationCode: "4821",
    restaurantId: "nova-cafe",
    tableId: "table-07",
    tableName: "Table 07",

    status: "pending",

    items: [
      {
        orderItemId: "order-item-1052-1",
        menuItemId: "iced-spanish-latte",
        name: "Iced Spanish Latte",
        image:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=300&q=80",
        basePrice: 219,
        quantity: 2,
        size: {
          id: "large",
          name: "Large",
          price: 40,
        },
        addons: [
          {
            id: "extra-espresso",
            name: "Extra Espresso Shot",
            price: 10,
          },
        ],
        unitPrice: 269,
        totalPrice: 538,
      },
      {
        orderItemId: "order-item-1052-2",
        menuItemId: "chocolate-sea-salt-cake",
        name: "Chocolate Sea Salt Cake",
        image:
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80",
        basePrice: 229,
        quantity: 1,
        addons: [],
        unitPrice: 229,
        totalPrice: 229,
      },
    ],

    subtotal: 767,
    tax: 0,
    total: 767,

    createdAt: new Date(Date.now() - 60 * 1000).toISOString(),
  },

  {
    id: "order-1049",
    orderNumber: "1049",
    validationCode: "3067",
    restaurantId: "nova-cafe",
    tableId: "table-07",
    tableName: "Table 07",

    status: "preparing",

    items: [
      {
        orderItemId: "order-item-1049-1",
        menuItemId: "iced-spanish-latte",
        name: "Iced Spanish Latte",
        image:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=300&q=80",
        basePrice: 219,
        quantity: 2,
        size: {
          id: "large",
          name: "Large",
          price: 40,
        },
        addons: [],
        unitPrice: 259,
        totalPrice: 518,
      },
      {
        orderItemId: "order-item-1049-2",
        menuItemId: "truffle-fries",
        name: "Truffle Fries",
        image:
          "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80",
        basePrice: 249,
        quantity: 1,
        addons: [],
        unitPrice: 249,
        totalPrice: 249,
      },
    ],

    subtotal: 767,
    tax: 0,
    total: 767,

    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },

  {
    id: "order-1050",
    orderNumber: "1050",
    validationCode: "5194",
    restaurantId: "nova-cafe",
    tableId: "table-05",
    tableName: "Table 05",

    status: "ready",

    items: [
      {
        orderItemId: "order-item-1050-1",
        menuItemId: "chicken-pesto-sandwich",
        name: "Chicken Pesto Sandwich",
        image:
          "https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=300&q=80",
        basePrice: 289,
        quantity: 1,
        addons: [],
        unitPrice: 289,
        totalPrice: 289,
      },
      {
        orderItemId: "order-item-1050-2",
        menuItemId: "truffle-fries",
        name: "Truffle Fries",
        image:
          "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80",
        basePrice: 249,
        quantity: 1,
        addons: [],
        unitPrice: 249,
        totalPrice: 249,
      },
    ],

    subtotal: 538,
    tax: 0,
    total: 538,

    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },

  {
    id: "order-1051",
    orderNumber: "1051",
    validationCode: "2758",
    restaurantId: "nova-cafe",
    tableId: "table-08",
    tableName: "Table 08",

    status: "pending",

    items: [
      {
        orderItemId: "order-item-1051-1",
        menuItemId: "matcha-cloud",
        name: "Matcha Cloud",
        image:
          "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=300&q=80",
        basePrice: 239,
        quantity: 1,
        addons: [],
        unitPrice: 239,
        totalPrice: 239,
      },
      {
        orderItemId: "order-item-1051-2",
        menuItemId: "classic-croissant",
        name: "Classic Croissant",
        image:
          "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80",
        basePrice: 149,
        quantity: 1,
        addons: [],
        unitPrice: 149,
        totalPrice: 149,
      },
    ],

    subtotal: 388,
    tax: 0,
    total: 388,

    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },

  {
    id: "order-1048",
    orderNumber: "1048",
    validationCode: "9042",
    restaurantId: "nova-cafe",
    tableId: "table-06",
    tableName: "Table 06",

    status: "preparing",

    items: [
      {
        orderItemId: "order-item-1048-1",
        menuItemId: "chicken-pesto-sandwich",
        name: "Chicken Pesto Sandwich",
        image:
          "https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=300&q=80",
        basePrice: 289,
        quantity: 2,
        addons: [],
        unitPrice: 289,
        totalPrice: 578,
      },
    ],

    subtotal: 578,
    tax: 0,
    total: 578,

    createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
  },

  {
    id: "order-1047",
    orderNumber: "1047",
    validationCode: "6613",
    restaurantId: "nova-cafe",
    tableId: "table-06",
    tableName: "Table 06",

    status: "ready",

    items: [
      {
        orderItemId: "order-item-1047-1",
        menuItemId: "iced-spanish-latte",
        name: "Iced Spanish Latte",
        image:
          "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=300&q=80",
        basePrice: 219,
        quantity: 2,
        addons: [],
        unitPrice: 219,
        totalPrice: 438,
      },
    ],

    subtotal: 438,
    tax: 0,
    total: 438,

    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
];
