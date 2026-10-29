export type Status =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Out for delivery"
  | "Delivered"
  | "Cancelled";
export type Merchant = {
  id: string;
  name: string;
  kind: "food" | "grocery";
  category: string;
  description: string;
  rating: number;
  eta: string;
  image: string;
  approved: boolean;
  open: boolean;
  address: string;
  lifecycle: "draft" | "pending" | "approved" | "suspended" | "rejected";
};
export type BusinessHours = {
  weekday: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  open: string;
  close: string;
  closed: boolean;
};
export type Branch = {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  city: string;
  acceptingOrders: boolean;
  deliveryAvailable: boolean;
  hours: BusinessHours[];
};
export type MerchantManager = {
  id: string;
  name: string;
  merchantId: string;
  branchIds: string[];
  active: boolean;
};
export type Product = {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  vegetarian: boolean;
  /** Catalog authority is paise; `price` remains a temporary cart-compatible rupee projection. */
  pricePaise: number;
  mrpPaise?: number;
  archived: boolean;
  available: boolean;
  preparationMinutes?: number;
  variants: ProductVariant[];
  customizationGroups: ProductCustomizationGroup[];
  mediaId?: string;
};
export type CatalogCategory = {
  id: string;
  merchantId: string;
  kind: "food" | "grocery";
  name: string;
  department?: string;
  sortOrder: number;
  archived: boolean;
};
export type ProductVariant = {
  id: string;
  name: string;
  pricePaise: number;
  mrpPaise?: number;
  unit?: string;
  active: boolean;
};
export type CatalogAddon = {
  id: string;
  name: string;
  pricePaise: number;
  active: boolean;
};
export type ProductCustomizationGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  addons: CatalogAddon[];
};
export type BranchCatalogOverride = {
  id: string;
  merchantId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  available: boolean;
  pricePaise?: number;
};
export type InventoryRecord = {
  id: string;
  merchantId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  lowStockThreshold: number;
  enabled: boolean;
};
export type StockAdjustment = {
  id: string;
  inventoryId: string;
  delta: number;
  reason: string;
  createdAt: string;
};
export type CatalogMedia = {
  id: string;
  merchantId: string;
  filename: string;
  url: string;
  sizeBytes: number;
  contentType: string;
};
export type CatalogAuditEvent = {
  id: string;
  merchantId: string;
  branchId?: string;
  action: string;
  entityId: string;
  message: string;
  createdAt: string;
};
export type Rider = {
  id: string;
  name: string;
  merchantIds: string[];
  availability: "Available" | "Busy" | "Offline";
  enabled: boolean;
};
export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  option: string;
};
export type Order = {
  id: string;
  merchantId: string;
  customerId: string;
  items: CartItem[];
  status: Status;
  riderId?: string;
  address: string;
  instructions: string;
  payment: string;
  total: number;
  discount: number;
  otp: string;
  createdAt: string;
  rating?: number;
  feedback?: string;
};
export type Address = { id: string; label: string; line: string };
export type State = {
  refunds: RefundRecord[];
  deductionNotes: string;
  selection: { merchantId: string; branchId: string; riderId: string };
  merchants: Merchant[];
  branches: Branch[];
  merchantManagers: MerchantManager[];
  catalogCategories: CatalogCategory[];
  branchCatalog: BranchCatalogOverride[];
  inventory: InventoryRecord[];
  stockAdjustments: StockAdjustment[];
  catalogMedia: CatalogMedia[];
  catalogAudit: CatalogAuditEvent[];
  products: Product[];
  riders: Rider[];
  orders: Order[];
  cart: { merchantId: string; items: CartItem[] };
  addresses: Address[];
  favorites: string[];
  customer: { id: string; name: string; email: string; phone: string };
  notifications: { id: string; title: string; read: boolean }[];
  support: { id: string; subject: string; status: string }[];
  audit: { id: string; message: string }[];
  promotions: { code: string; enabled: boolean }[];
  settings: { notifications: boolean; storeOpen: boolean };
};
export type Customer = State["customer"];
export type RiderMembership = { riderId: string; merchantId: string };
export type PaymentRecord = {
  id: string;
  orderId: string;
  merchantId: string;
  amount: number;
  method: string;
  status: "Simulated paid" | "Simulated refunded" | "Simulated voided";
};
export type SettlementRecord = {
  id: string;
  orderId: string;
  merchantId: string;
  gross: number;
  deductions: null;
  net: null;
  scheduledAt: string;
  status: "Awaiting delivery" | "Illustrative T+2 eligible" | "Excluded";
};
export type Review = {
  orderId: string;
  merchantId: string;
  customerId: string;
  rating: number;
  feedback: string;
};
export type RefundRecord = {
  id: string;
  orderId: string;
  amount: number;
  status: "Simulated";
  reason: string;
};
