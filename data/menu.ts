import type { MenuItem } from "@/types/menu";

export const menuItems: MenuItem[] = [
  {
    id: "iced-spanish-latte",
    name: "Iced Spanish Latte",
    description: "Espresso, condensed milk and silky cold milk.",
    price: 219,
    category: "Coffee",
    image:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=85",
    popular: true,
    vegetarian: true,

    sizes: [
      {
        id: "regular",
        name: "Regular",
        price: 0,
      },
      {
        id: "large",
        name: "Large",
        price: 40,
      },
    ],

    addons: [
      {
        id: "extra-shot",
        name: "Extra Espresso Shot",
        price: 50,
      },
      {
        id: "vanilla",
        name: "Vanilla",
        price: 30,
      },
    ],
  },

  {
    id: "chicken-pesto-sandwich",
    name: "Chicken Pesto Sandwich",
    description: "Grilled chicken, basil pesto, mozzarella and sourdough.",
    price: 289,
    category: "Sandwiches",
    image:
      "https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=900&q=85",
    popular: true,

    addons: [
      {
        id: "extra-cheese",
        name: "Extra Cheese",
        price: 40,
      },
      {
        id: "extra-chicken",
        name: "Extra Chicken",
        price: 80,
      },
    ],
  },

  {
    id: "truffle-fries",
    name: "Truffle Fries",
    description: "Crispy fries, parmesan and aromatic truffle oil.",
    price: 249,
    category: "Sides",
    image:
      "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85",
    vegetarian: true,
  },

  {
    id: "classic-croissant",
    name: "Classic Croissant",
    description: "Buttery, flaky and baked fresh every morning.",
    price: 149,
    category: "Bakery",
    image:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=85",
    vegetarian: true,
  },

  {
    id: "chocolate-sea-salt-cake",
    name: "Chocolate Sea Salt Cake",
    description: "Dark chocolate cake with sea salt caramel.",
    price: 229,
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85",
    vegetarian: true,
  },

  {
    id: "matcha-cloud",
    name: "Matcha Cloud",
    description: "Ceremonial matcha, cold milk and vanilla foam.",
    price: 239,
    category: "Coffee",
    image:
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=85",
    vegetarian: true,
  },
];
