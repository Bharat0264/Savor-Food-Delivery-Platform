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
  id: string;
  productId: string;
  name: string;
  image: string;
  variantId?: string;
  variantName?: string;
  addonIds: string[];
  addonNames: string[];
  unitPricePaise: number;
  addonTotalPaise: number;
  lineTotalPaise: number;
  quantity: number;
  option: string;
};
export type Order = {
  id: string;
  merchantId: string;
  branchId: string;
  customerId: string;
  items: CartItem[];
  status: Status;
  riderId?: string;
  address: string;
  instructions: string;
  payment: string;
  subtotalPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
  paymentStatus: "Simulated paid" | "Simulated pending" | "Simulated failed";
  otp: string;
  createdAt: string;
  rating?: number;
  feedback?: string;
  deliveryState?: "unassigned" | "assigned" | "accepted" | "at_pickup" | "picked_up" | "at_destination" | "failed";
  otpAttempts?: number;
  otpExpiresAt?: string;
  otpConsumed?: boolean;
  cancellationReason?: string;
  refundStatus?: "pending" | "refunded" | "failed";
};
export type OrderEvent = { id: string; orderId: string; actor: "customer" | "merchant" | "rider" | "admin" | "system"; type: string; message: string; createdAt: string; reason?: string };
export type Address = { id: string; label: string; line: string; building?: string; street?: string; locality?: string; city: string; state: string; pin: string; contactName?: string; contactPhone?: string; default?: boolean };
export type Promotion = { code: string; enabled: boolean; type: "fixed" | "percent"; valuePaise?: number; percent?: number; minOrderPaise: number; maxDiscountPaise?: number; merchantId?: string; branchId?: string; kind?: "food" | "grocery"; expiresAt?: string; usageLimit?: number; usedCount: number };
export type PaymentAttempt = { id: string; idempotencyKey: string; orderId?: string; method: string; amountPaise: number; status: "confirmed" | "failed" | "cancelled" | "pending"; createdAt: string };
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
  cart: { merchantId: string; branchId: string; kind?: "food" | "grocery"; items: CartItem[]; createdAt?: string; updatedAt?: string };
  addresses: Address[];
  favorites: string[];
  customer: { id: string; name: string; email: string; phone: string };
  notifications: { id: string; title: string; read: boolean }[];
  support: { id: string; subject: string; status: string }[];
  audit: { id: string; message: string }[];
  promotions: Promotion[];
  paymentAttempts: PaymentAttempt[];
  checkoutKeys: string[];
  orderEvents: OrderEvent[];
  schemaVersion: number;
  settings: { notifications: boolean; storeOpen: boolean };
};
export type Customer = State["customer"];
export type RiderMembership = { riderId: string; merchantId: string };
export type PaymentRecord = {
  id: string;
  orderId: string;
  merchantId: string;
  amountPaise: number;
  method: string;
  status: "Simulated paid" | "Simulated refunded" | "Simulated voided";
};
export type SettlementRecord = {
  id: string;
  orderId: string;
  merchantId: string;
  grossPaise: number;
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
  amountPaise: number;
  status: "Simulated";
  reason: string;
};
