import { Branch, BusinessHours, Merchant, MerchantManager, State } from "../model";

export type DemoActor = "admin" | "merchant";
export type MerchantRegistration = Pick<Merchant, "name" | "kind" | "category" | "description" | "address" | "image">;
export type BranchInput = Pick<Branch, "name" | "address" | "city" | "acceptingOrders" | "deliveryAvailable">;

const weekdays: BusinessHours["weekday"][] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultHours = (): BusinessHours[] => weekdays.map((weekday) => ({ weekday, open: "09:00", close: "22:30", closed: false }));
const demoId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const audit = (state: State, message: string): State["audit"] => [
  { id: demoId("audit"), message },
  ...state.audit,
];
const requireMerchantScope = (state: State, actor: DemoActor, merchantId: string) => {
  if (actor === "admin") return;
  if (state.selection.merchantId !== merchantId) throw Error("This demo manager can only manage the selected merchant.");
};
const syncMerchantOpen = (merchantId: string, branches: Branch[]) => {
  const eligible = branches.filter((branch) => branch.merchantId === merchantId);
  return eligible.some((branch) => branch.acceptingOrders && branch.deliveryAvailable);
};

export interface MerchantManagementService {
  register(state: State, input: MerchantRegistration): State;
  updateProfile(state: State, actor: DemoActor, merchantId: string, patch: Pick<Merchant, "name" | "category" | "description" | "address">): State;
  review(state: State, merchantId: string, action: "approve" | "reject" | "suspend" | "reactivate"): State;
  addBranch(state: State, actor: DemoActor, merchantId: string, input: BranchInput): State;
  updateBranch(state: State, actor: DemoActor, branchId: string, patch: Partial<BranchInput>): State;
  setBranchHours(state: State, actor: DemoActor, branchId: string, hours: BusinessHours[]): State;
  assignManager(state: State, actor: DemoActor, managerId: string, branchIds: string[]): State;
  setManagerActive(state: State, actor: DemoActor, managerId: string, active: boolean): State;
  addManager(state: State, actor: DemoActor, merchantId: string, name: string, branchIds: string[]): State;
  selectBranch(state: State, branchId: string): State;
}

export const merchantManagement: MerchantManagementService = {
  register(state, input) {
    const id = demoId("merchant");
    const merchant: Merchant = { ...input, id, rating: 0, eta: "Setting up", approved: false, open: false, lifecycle: "pending" };
    const branch: Branch = { id: demoId("branch"), merchantId: id, name: "First branch", address: input.address, city: "Bengaluru", acceptingOrders: false, deliveryAvailable: false, hours: defaultHours() };
    return { ...state, merchants: [...state.merchants, merchant], branches: [...state.branches, branch], audit: audit(state, `${merchant.name}: merchant registration submitted`) };
  },
  updateProfile(state, actor, merchantId, patch) {
    requireMerchantScope(state, actor, merchantId);
    const merchant = state.merchants.find((item) => item.id === merchantId);
    if (!merchant) throw Error("Merchant not found.");
    return { ...state, merchants: state.merchants.map((item) => item.id === merchantId ? { ...item, ...patch } : item), audit: audit(state, `${merchant.name}: business profile updated`) };
  },
  review(state, merchantId, action) {
    const merchant = state.merchants.find((item) => item.id === merchantId);
    if (!merchant) throw Error("Merchant not found.");
    const lifecycle = action === "approve" || action === "reactivate" ? "approved" : action === "suspend" ? "suspended" : "rejected";
    const approved = lifecycle === "approved";
    const branches = state.branches.map((branch) => branch.merchantId === merchantId && !approved ? { ...branch, acceptingOrders: false, deliveryAvailable: false } : branch);
    const actionLabel = { approve: "approved", reject: "rejected", suspend: "suspended", reactivate: "reactivated" }[action];
    return { ...state, branches, merchants: state.merchants.map((item) => item.id === merchantId ? { ...item, lifecycle, approved, open: approved && syncMerchantOpen(merchantId, branches) } : item), audit: audit(state, `${merchant.name}: ${actionLabel} by Super Admin`) };
  },
  addBranch(state, actor, merchantId, input) {
    requireMerchantScope(state, actor, merchantId);
    const merchant = state.merchants.find((item) => item.id === merchantId);
    if (!merchant) throw Error("Merchant not found.");
    const branch: Branch = { ...input, id: demoId("branch"), merchantId, hours: defaultHours() };
    const branches = [...state.branches, branch];
    return { ...state, branches, merchants: state.merchants.map((item) => item.id === merchantId ? { ...item, open: item.approved && syncMerchantOpen(merchantId, branches) } : item), audit: audit(state, `${merchant.name}: ${branch.name} branch created`) };
  },
  updateBranch(state, actor, branchId, patch) {
    const existing = state.branches.find((branch) => branch.id === branchId);
    if (!existing) throw Error("Branch not found.");
    requireMerchantScope(state, actor, existing.merchantId);
    const branches = state.branches.map((branch) => branch.id === branchId ? { ...branch, ...patch } : branch);
    return { ...state, branches, merchants: state.merchants.map((merchant) => merchant.id === existing.merchantId ? { ...merchant, open: merchant.approved && syncMerchantOpen(merchant.id, branches) } : merchant), audit: audit(state, `${existing.name}: branch availability updated`) };
  },
  setBranchHours(state, actor, branchId, hours) {
    const branch = state.branches.find((item) => item.id === branchId);
    if (!branch || hours.length !== 7) throw Error("Provide hours for every day of the week.");
    requireMerchantScope(state, actor, branch.merchantId);
    return { ...state, branches: state.branches.map((item) => item.id === branchId ? { ...item, hours } : item), audit: audit(state, `${branch.name}: business hours updated`) };
  },
  assignManager(state, actor, managerId, branchIds) {
    const manager = state.merchantManagers.find((item) => item.id === managerId);
    if (!manager) throw Error("Manager not found.");
    requireMerchantScope(state, actor, manager.merchantId);
    if (branchIds.some((id) => state.branches.find((branch) => branch.id === id)?.merchantId !== manager.merchantId)) throw Error("Managers can only be assigned to branches of their merchant.");
    return { ...state, merchantManagers: state.merchantManagers.map((item) => item.id === managerId ? { ...item, branchIds } : item), audit: audit(state, `${manager.name}: branch access updated`) };
  },
  setManagerActive(state, actor, managerId, active) {
    const manager = state.merchantManagers.find((item) => item.id === managerId);
    if (!manager) throw Error("Manager not found.");
    requireMerchantScope(state, actor, manager.merchantId);
    return {
      ...state,
      merchantManagers: state.merchantManagers.map((item) => item.id === managerId ? { ...item, active } : item),
      audit: audit(state, `${manager.name}: manager ${active ? "enabled" : "disabled"}`),
    };
  },
  addManager(state, actor, merchantId, name, branchIds) {
    requireMerchantScope(state, actor, merchantId);
    if (name.trim().length < 2) throw Error("Enter a manager name.");
    if (branchIds.some((id) => state.branches.find((branch) => branch.id === id)?.merchantId !== merchantId)) throw Error("Choose branches belonging to this merchant.");
    const manager: MerchantManager = { id: demoId("manager"), name: name.trim(), merchantId, branchIds, active: true };
    return { ...state, merchantManagers: [...state.merchantManagers, manager], audit: audit(state, `${manager.name}: manager access created`) };
  },
  selectBranch(state, branchId) {
    const branch = state.branches.find((item) => item.id === branchId);
    if (!branch) throw Error("Branch not found.");
    return { ...state, selection: { ...state.selection, merchantId: branch.merchantId, branchId } };
  },
};
