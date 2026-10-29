import { State, Product, BusinessHours } from "./model";
const food = "/images/food.jpg",
  pizza = "/images/pizza.jpg",
  salad = "/images/salad.jpg",
  grocery = "/images/grocery.jpg";
const catalogPrice = (kind: "food" | "grocery", index: number) =>
  (kind === "grocery" ? [149, 89, 65, 180, 72, 120] : [289, 329, 349, 179, 129, 199])[index];
export const seed: State = {
  refunds: [],
  deductionNotes: "",
  selection: { merchantId: "m1", branchId: "b1", riderId: "r1" },
  merchants: [
    {
      id: "m1",
      name: "The Good Bowl",
      kind: "food",
      category: "Bowls · Healthy · Asian",
      description:
        "A little colour. A lot of goodness. Thoughtfully made bowls, from our kitchen to your everyday.",
      rating: 4.8,
      eta: "20–30 min",
      image: food,
      approved: true,
      open: true,
      lifecycle: "approved",
      address: "12, 5th Block, Koramangala",
    },
    {
      id: "m2",
      name: "Napoli & Co.",
      kind: "food",
      category: "Italian · Wood-fired pizza",
      description: "Slow dough. Fast love. Authentic wood-fired favourites.",
      rating: 4.9,
      eta: "30–40 min",
      image: pizza,
      approved: true,
      open: true,
      lifecycle: "approved",
      address: "80 Feet Road, Indiranagar",
    },
    {
      id: "m3",
      name: "Green Theory",
      kind: "food",
      category: "Plant-based · Salads",
      description: "Seasonal, vibrant and always delicious.",
      rating: 4.7,
      eta: "25–35 min",
      image: salad,
      approved: true,
      open: true,
      lifecycle: "approved",
      address: "Lavelle Road, Bengaluru",
    },
    {
      id: "m4",
      name: "Fresh Field",
      kind: "grocery",
      category: "Farm fresh · Daily essentials",
      description:
        "Fresh from the farm, closer to home. Your everyday essentials, thoughtfully sourced.",
      rating: 4.8,
      eta: "15–25 min",
      image: grocery,
      approved: true,
      open: true,
      lifecycle: "approved",
      address: "6th Main, Koramangala",
    },
    {
      id: "m5",
      name: "The Pantry Project",
      kind: "grocery",
      category: "Organic · Pantry · Bakery",
      description: "Good ingredients for very good days.",
      rating: 4.6,
      eta: "20–30 min",
      image: salad,
      approved: true,
      open: true,
      lifecycle: "approved",
      address: "HSR Layout, Sector 2",
    },
    {
      id: "m6",
      name: "Spice Route",
      kind: "food",
      category: "Indian · Comfort food",
      description: "Comfort, crafted with a little spice.",
      rating: 4.7,
      eta: "25–35 min",
      image: food,
      approved: false,
      open: true,
      lifecycle: "pending",
      address: "JP Nagar, Bengaluru",
    },
  ],
  branches: [],
  catalogCategories: [],
  branchCatalog: [],
  inventory: [],
  stockAdjustments: [],
  catalogMedia: [],
  catalogAudit: [],
  merchantManagers: [
    { id: "manager-m1", name: "Meera Rao", merchantId: "m1", branchIds: ["b1"], active: true },
    { id: "manager-m2", name: "Dev Kapoor", merchantId: "m2", branchIds: ["b2"], active: true },
    { id: "manager-m3", name: "Riya Nair", merchantId: "m3", branchIds: ["b3"], active: true },
    { id: "manager-m4", name: "Kavya Reddy", merchantId: "m4", branchIds: ["b4"], active: true },
    { id: "manager-m5", name: "Aarav Patel", merchantId: "m5", branchIds: ["b5"], active: true },
    { id: "manager-m6", name: "Nisha Jain", merchantId: "m6", branchIds: ["b6"], active: true },
  ],
  products: [],
  riders: [
    {
      id: "r1",
      name: "Arjun Kumar",
      merchantIds: ["m1", "m4"],
      availability: "Available",
      enabled: true,
    },
    {
      id: "r2",
      name: "Priya Nair",
      merchantIds: ["m1", "m2", "m5"],
      availability: "Available",
      enabled: true,
    },
    {
      id: "r3",
      name: "Rohit Sharma",
      merchantIds: ["m3", "m6"],
      availability: "Offline",
      enabled: true,
    },
  ],
  orders: [],
  cart: { merchantId: "", items: [] },
  addresses: [
    {
      id: "a1",
      label: "Home",
      line: "24, 5th Cross, Koramangala, Bengaluru 560095",
    },
    {
      id: "a2",
      label: "Work",
      line: "WeWork, Embassy GolfLinks, Bengaluru 560071",
    },
  ],
  favorites: ["m1"],
  customer: {
    id: "c1",
    name: "Ananya Rao",
    email: "ananya@example.test",
    phone: "98765 43210",
  },
  notifications: [
    {
      id: "n1",
      title: "Your neighbourhood favourites are ready for you.",
      read: false,
    },
  ],
  support: [],
  audit: [],
  promotions: [{ code: "FIRSTBITE", enabled: true }],
  settings: { notifications: true, storeOpen: true },
};
const everydayHours = (): BusinessHours[] =>
  (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((weekday) => ({
    weekday,
    open: "09:00",
    close: "22:30",
    closed: false,
  }));
seed.branches = seed.merchants.map((merchant, index) => ({
  id: `b${index + 1}`,
  merchantId: merchant.id,
  name: index === 3 ? "Koramangala market" : "Main kitchen",
  address: merchant.address,
  city: "Bengaluru",
  acceptingOrders: merchant.open,
  deliveryAvailable: merchant.approved,
  hours: everydayHours(),
}));
const menus = [
  [
    "Sesame sunshine bowl",
    "Miso mushroom bowl",
    "Korean gochujang bowl",
    "Crispy tofu bites",
    "Yuzu iced tea",
    "Dark chocolate brownie",
  ],
  [
    "Margherita originale",
    "Burrata & basil",
    "Wild mushroom pizza",
    "Garlic sourdough",
    "Peach iced tea",
    "Tiramisu",
  ],
  [
    "Green goddess bowl",
    "Avocado toast",
    "Roasted beet salad",
    "Hummus & pita",
    "Matcha latte",
    "Banana bread",
  ],
  [
    "Farm-fresh avocados",
    "Sweet cherry tomatoes",
    "Baby spinach",
    "Sourdough loaf",
    "Organic whole milk",
    "Free-range eggs",
  ],
  [
    "Almond butter",
    "Rolled oats",
    "Greek yoghurt",
    "Seasonal fruit box",
    "Cold-pressed juice",
    "Multigrain bread",
  ],
  [
    "Paneer makhani",
    "Dal tadka",
    "Vegetable biryani",
    "Garlic naan",
    "Mango lassi",
    "Gulab jamun",
  ],
];
seed.products = seed.merchants.flatMap((m, mi) =>
  menus[mi].map((name, i): Product => ({
    id: `p${mi}${i}`,
    merchantId: m.id,
    name,
    description: [
      [
        "Roasted vegetables, fragrant rice and sesame dressing.",
        "Miso-glazed mushrooms, rice and crunchy greens.",
        "Gochujang vegetables with rice and sesame.",
        "Golden tofu bites with a tangy dipping sauce.",
        "Brewed tea with bright yuzu citrus, served chilled.",
        "Rich dark chocolate brownie with a soft centre.",
      ],
      [
        "Tomato, mozzarella and fresh basil on slow-fermented dough.",
        "Creamy burrata, tomato and fragrant basil.",
        "Roasted mushrooms, mozzarella and herbs.",
        "Toasted sourdough with garlic butter.",
        "Peach-infused black tea, served over ice.",
        "Coffee-soaked sponge layered with mascarpone.",
      ],
      [
        "Seasonal greens, grains and a fresh herb dressing.",
        "Smashed avocado on toasted sourdough.",
        "Roasted beetroot, greens and a citrus dressing.",
        "Creamy chickpea hummus with warm pita.",
        "Smooth green tea with oat milk.",
        "Freshly baked banana loaf with toasted walnuts.",
      ],
      [
        "Perfectly ripe · 2 pieces",
        "Locally grown · 250 g",
        "Freshly picked · 200 g",
        "Made fresh · 400 g",
        "Responsibly sourced · 1 L",
        "Farm selection · 6 pieces",
      ],
      [
        "Roasted almond spread · 200 g",
        "Wholegrain rolled oats · 500 g",
        "Thick natural yoghurt · 400 g",
        "Seasonal selection · 1 kg",
        "Fresh fruit blend · 250 ml",
        "Seeded multigrain loaf · 400 g",
      ],
      [
        "Soft paneer in a creamy tomato gravy.",
        "Yellow lentils tempered with cumin and garlic.",
        "Aromatic basmati rice with vegetables and spices.",
        "Tandoor-baked bread brushed with garlic butter.",
        "Chilled mango and yoghurt drink.",
        "Soft milk dumplings in fragrant sugar syrup.",
      ],
    ][mi][i],
    price: catalogPrice(m.kind, i),
    pricePaise: catalogPrice(m.kind, i) * 100,
    stock: i === 5 ? 0 : 24,
    category:
      m.kind === "grocery"
        ? (mi === 4
            ? ["Pantry", "Pantry", "Dairy", "Produce", "Drinks", "Bakery"]
            : ["Produce", "Produce", "Produce", "Bakery", "Dairy", "Dairy"])[i]
        : [
            ...[0, 1, 2].map(() =>
              mi === 1
                ? "Wood-fired pizzas"
                : mi === 2
                  ? "Plant-based plates"
                  : mi === 5
                    ? "Indian classics"
                    : "Signature bowls",
            ),
            "Sides",
            "Drinks",
            "Desserts",
          ][i],
    image:
      mi === 3
        ? ["avocado", "tomatoes", "spinach", "bread", "milk", "eggs"].map(
            (name) => `/images/${name}.jpg`,
          )[i]
        : m.image,
    vegetarian: true,
    archived: false,
    available: i !== 5,
    preparationMinutes: m.kind === "food" ? 18 + i * 2 : undefined,
    variants:
      i === 0
        ? m.kind === "food"
          ? [
              { id: `v${mi}${i}-regular`, name: "Regular", pricePaise: catalogPrice(m.kind, i) * 100, active: true },
              { id: `v${mi}${i}-large`, name: "Large", pricePaise: (catalogPrice(m.kind, i) + 70) * 100, active: true },
            ]
          : [
              { id: `v${mi}${i}-standard`, name: "Standard", pricePaise: catalogPrice(m.kind, i) * 100, active: true, unit: "1 pack" },
              { id: `v${mi}${i}-family`, name: "Family pack", pricePaise: (catalogPrice(m.kind, i) + 70) * 100, active: true, unit: "2 packs" },
            ]
        : [],
    customizationGroups:
      m.kind === "food" && i === 0
        ? [
            {
              id: `cg${mi}${i}`,
              name: "Finish it your way",
              required: false,
              minSelections: 0,
              maxSelections: 2,
              addons: [
                { id: `a${mi}${i}-avocado`, name: "Extra avocado", pricePaise: 4000, active: true },
                { id: `a${mi}${i}-raita`, name: "Cooling raita", pricePaise: 2000, active: true },
              ],
            },
          ]
        : [],
  })),
);
seed.catalogCategories = seed.merchants.flatMap((merchant) =>
  [...new Set(seed.products.filter((product) => product.merchantId === merchant.id).map((product) => product.category))].map(
    (name, sortOrder) => ({
      id: `category-${merchant.id}-${sortOrder}`,
      merchantId: merchant.id,
      kind: merchant.kind,
      name,
      department: merchant.kind === "grocery" ? name : undefined,
      sortOrder,
      archived: false,
    }),
  ),
);
seed.inventory = seed.branches.flatMap((branch) =>
  seed.products
    .filter((product) => product.merchantId === branch.merchantId)
    .map((product) => ({
      id: `inventory-${branch.id}-${product.id}`,
      merchantId: branch.merchantId,
      branchId: branch.id,
      productId: product.id,
      quantity: product.stock,
      lowStockThreshold: 5,
      enabled: product.available,
    })),
);
seed.orders = [
  {
    id: "SV1042",
    merchantId: "m1",
    customerId: "c1",
    items: [
      {
        productId: "p00",
        name: "Sesame sunshine bowl",
        price: 289,
        quantity: 2,
        option: "Regular",
      },
    ],
    status: "Pending",
    address: seed.addresses[0].line,
    instructions: "Ring the doorbell",
    payment: "Demo UPI",
    total: 618,
    discount: 0,
    otp: "4826",
    createdAt: "2026-10-28T12:10:00.000Z",
  },
  {
    id: "SV1041",
    merchantId: "m4",
    customerId: "c2",
    items: [
      {
        productId: "p30",
        name: "Farm-fresh avocados",
        price: 149,
        quantity: 2,
        option: "Standard",
      },
    ],
    status: "Delivered",
    riderId: "r1",
    address: "18, HSR Layout, Bengaluru",
    instructions: "",
    payment: "Demo card",
    total: 338,
    discount: 0,
    otp: "5271",
    createdAt: "2026-10-26T10:00:00.000Z",
  },
];
export const freshSeed = (): State => structuredClone(seed);
