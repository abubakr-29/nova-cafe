export type MenuOption = {
  id: string;
  name: string;
  price: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  popular?: boolean;
  vegetarian?: boolean;
  available?: boolean;
  sizes?: MenuOption[];
  addons?: MenuOption[];
};
