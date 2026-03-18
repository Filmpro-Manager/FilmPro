const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
    storeId: string | null;
    avatarUrl: string | null;
  };
}

export interface StoreOption {
  id: string;
  name: string;
  nomeFantasia: string;
  addressCity: string;
  addressState: string;
  status: string;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? 'Erro ao autenticar');
  }

  return data as LoginResponse;
}

export async function apiSelectStore(storeId: string, token: string): Promise<{ token: string }> {
  const res = await fetch(`${BASE_URL}/auth/select-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ storeId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? 'Erro ao selecionar loja');
  }

  return data as { token: string };
}

export async function apiGetStores(companyId: string, token: string): Promise<StoreOption[]> {
  const res = await fetch(`${BASE_URL}/stores?companyId=${companyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? 'Erro ao buscar lojas');
  }

  return data as StoreOption[];
}

// ─── Store details (used in company settings) ────────────────────────────────

export interface StoreDetails {
  id: string;
  name: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string | null;
  addressDistrict: string;
  addressZipcode: string;
  addressCity: string;
  addressState: string;
}

export type UpdateStoreData = Partial<{
  name: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressDistrict: string;
  addressZipcode: string;
  addressCity: string;
  addressState: string;
}>;

export async function apiGetStore(storeId: string, token: string): Promise<StoreDetails> {
  const res = await fetch(`${BASE_URL}/stores/${storeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar dados da loja');
  return data as StoreDetails;
}

export async function apiUpdateStore(
  storeId: string,
  data: UpdateStoreData,
  token: string,
): Promise<StoreDetails> {
  const res = await fetch(`${BASE_URL}/stores/${storeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao salvar dados da loja');
  return json as StoreDetails;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export interface ApiVehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string | null;
  color: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ApiClient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicles: ApiVehicle[];
}

export interface CreateClientData {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  notes?: string;
}

export interface CreateVehicleData {
  brand: string;
  model: string;
  year?: number;
  plate?: string;
  color?: string;
  notes?: string;
}

export async function apiGetClients(token: string): Promise<ApiClient[]> {
  const res = await fetch(`${BASE_URL}/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar clientes');
  return data as ApiClient[];
}

export async function apiCreateClient(data: CreateClientData, token: string): Promise<ApiClient> {
  const res = await fetch(`${BASE_URL}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao criar cliente');
  return json as ApiClient;
}

export async function apiUpdateClient(
  id: string,
  data: Partial<CreateClientData>,
  token: string,
): Promise<ApiClient> {
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao atualizar cliente');
  return json as ApiClient;
}

export async function apiDeleteClient(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/clients/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao excluir cliente');
  }
}

export async function apiCreateVehicle(
  clientId: string,
  data: CreateVehicleData,
  token: string,
): Promise<ApiVehicle> {
  const res = await fetch(`${BASE_URL}/clients/${clientId}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao criar veículo');
  return json as ApiVehicle;
}

export async function apiDeleteVehicle(
  clientId: string,
  vehicleId: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/clients/${clientId}/vehicles/${vehicleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao excluir veículo');
  }
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface ApiInventoryItem {
  id: string;
  name: string;
  brand: string;
  type: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  pricePerUnit: number;
  transparency: number;
  sku: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string } | null;
}

export interface ApiInventoryMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  inventoryItem: { id: string; name: string; brand: string };
  user: { id: string; name: string };
}

export interface CreateInventoryItemData {
  name: string;
  brand: string;
  type: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  costPrice?: number;
  pricePerUnit?: number;
  transparency?: number;
  sku?: string;
}

export interface CreateMovementData {
  inventoryItemId: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  reason?: string;
}

export async function apiGetInventoryItems(token: string): Promise<ApiInventoryItem[]> {
  const res = await fetch(`${BASE_URL}/inventory/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar estoque');
  return data as ApiInventoryItem[];
}

export async function apiCreateInventoryItem(
  data: CreateInventoryItemData,
  token: string,
): Promise<ApiInventoryItem> {
  const res = await fetch(`${BASE_URL}/inventory/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao criar item');
  return json as ApiInventoryItem;
}

export async function apiUpdateInventoryItem(
  id: string,
  data: Partial<CreateInventoryItemData>,
  token: string,
): Promise<ApiInventoryItem> {
  const res = await fetch(`${BASE_URL}/inventory/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao atualizar item');
  return json as ApiInventoryItem;
}

export async function apiDeleteInventoryItem(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/inventory/items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao excluir item');
  }
}

export async function apiGetInventoryMovements(token: string, itemId?: string): Promise<ApiInventoryMovement[]> {
  const url = itemId
    ? `${BASE_URL}/inventory/movements?itemId=${itemId}`
    : `${BASE_URL}/inventory/movements`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar movimentações');
  return data as ApiInventoryMovement[];
}

export async function apiCreateMovement(
  data: CreateMovementData,
  token: string,
): Promise<ApiInventoryMovement> {
  const res = await fetch(`${BASE_URL}/inventory/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao registrar movimentação');
  return json as ApiInventoryMovement;
}

// ─── Autenticação: Esqueci a Senha ────────────────────────────────────────────

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao solicitar redefinição de senha');
  return data;
}

export async function apiVerifyResetCode(code: string): Promise<{ valid: boolean }> {
  const res = await fetch(`${BASE_URL}/auth/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Código inválido ou expirado');
  return data;
}

export async function apiResetPassword(token: string, password: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao redefinir senha');
  return data;
}

// ─── Perfil do usuário ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
  store: { id: string; name: string } | null;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

export async function apiGetProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao carregar perfil');
  return data as UserProfile;
}

export async function apiUpdateProfile(data: UpdateProfileData, token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao atualizar perfil');
  return json as UserProfile;
}

// ─── Gestão de usuários (owner) ───────────────────────────────────────────────

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  role: 'manager' | 'employee';
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  role?: 'manager' | 'employee';
}

export async function apiGetUsers(token: string): Promise<UserProfile[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar usuários');
  return data as UserProfile[];
}

export async function apiCreateUser(data: CreateUserData, token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao criar usuário');
  return json as UserProfile;
}

export async function apiUpdateUser(id: string, data: UpdateUserData, token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao atualizar usuário');
  return json as UserProfile;
}

export async function apiSetUserActive(id: string, active: boolean, token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE_URL}/users/${id}/${active ? 'activate' : 'deactivate'}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao atualizar status do usuário');
  return json as UserProfile;
}

export async function apiDeleteUser(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao excluir usuário');
  }
}

// ─── Service Catalog ─────────────────────────────────────────────────────────

export interface ServiceCatalogDto {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  estimatedMinutes?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceData {
  name: string;
  description?: string;
  category: string;
  price: number;
  estimatedMinutes?: number;
  isActive?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  estimatedMinutes?: number;
  isActive?: boolean;
}

export async function apiGetServices(token: string, onlyActive = false): Promise<ServiceCatalogDto[]> {
  const res = await fetch(`${BASE_URL}/services${onlyActive ? '?active=true' : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar serviços');
  return data as ServiceCatalogDto[];
}

export async function apiCreateService(data: CreateServiceData, token: string): Promise<ServiceCatalogDto> {
  const res = await fetch(`${BASE_URL}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao criar serviço');
  return json as ServiceCatalogDto;
}

export async function apiUpdateService(id: string, data: UpdateServiceData, token: string): Promise<ServiceCatalogDto> {
  const res = await fetch(`${BASE_URL}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao atualizar serviço');
  return json as ServiceCatalogDto;
}

export async function apiToggleService(id: string, token: string): Promise<ServiceCatalogDto> {
  const res = await fetch(`${BASE_URL}/services/${id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao alterar serviço');
  return json as ServiceCatalogDto;
}

export async function apiDeleteService(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/services/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao excluir serviço');
  }
}

// ─── QUOTES (Orçamentos) ──────────────────────────────────────────────────────

export interface ApiQuoteItem {
  id: string;
  type: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType: string;
  total: number;
  productId?: string;
  serviceId?: string;
  vehicleId?: string;
}

export interface ApiQuote {
  id: string;
  storeId: string;
  number: string;
  status: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDocument?: string;
  clientDocumentType?: string;
  category?: string;
  subject?: unknown;
  sellerId?: string;
  sellerName?: string;
  createdById?: string;
  createdByName?: string;
  subtotal: number;
  discount: number;
  discountType?: string;
  taxes?: number;
  totalValue: number;
  acceptedPaymentMethods: string[];
  payment?: unknown;
  notes?: string;
  internalNotes?: string;
  issueDate: string;
  validUntil?: string;
  convertedAt?: string;
  convertedToAppointmentId?: string;
  createdAt: string;
  updatedAt: string;
  items: ApiQuoteItem[];
}

export interface CreateQuoteData {
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDocument?: string;
  clientDocumentType?: string;
  category?: string;
  subject?: unknown;
  sellerId?: string;
  sellerName?: string;
  subtotal: number;
  discount?: number;
  discountType?: string;
  taxes?: number;
  totalValue: number;
  acceptedPaymentMethods?: string[];
  payment?: unknown;
  notes?: string;
  internalNotes?: string;
  issueDate?: string;
  validUntil?: string;
  items: Omit<ApiQuoteItem, 'id'>[];
}

export async function apiGetQuotes(token: string): Promise<ApiQuote[]> {
  const res = await fetch(`${BASE_URL}/quotes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Erro ao buscar orçamentos');
  return res.json();
}

export async function apiCreateQuote(data: CreateQuoteData, token: string): Promise<ApiQuote> {
  const res = await fetch(`${BASE_URL}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao criar orçamento');
  }
  return res.json();
}

export async function apiUpdateQuote(
  id: string,
  data: Partial<CreateQuoteData>,
  token: string,
): Promise<ApiQuote> {
  const res = await fetch(`${BASE_URL}/quotes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao atualizar orçamento');
  }
  return res.json();
}

export async function apiUpdateQuoteStatus(
  id: string,
  status: string,
  token: string,
): Promise<ApiQuote> {
  const res = await fetch(`${BASE_URL}/quotes/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao atualizar status do orçamento');
  }
  return res.json();
}

export async function apiConvertQuote(
  id: string,
  appointmentId: string,
  token: string,
): Promise<ApiQuote> {
  const res = await fetch(`${BASE_URL}/quotes/${id}/convert`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ appointmentId }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao converter orçamento');
  }
  return res.json();
}

export async function apiDeleteQuote(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/quotes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao excluir orçamento');
  }
}

// ─── Service Orders (Ordens de Serviço) ──────────────────────────────────────

export interface ApiServiceOrder {
  id: string;
  storeId: string;
  number: string;
  quoteId: string | null;
  clientId: string | null;
  clientName: string;
  vehicle: string | null;
  subject: unknown;
  serviceType: string;
  employeeId: string | null;
  employeeName: string | null;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  value: number;
  items: unknown;
  notes: string | null;
  internalNotes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceOrderData {
  quoteId?: string;
  clientId?: string;
  clientName: string;
  vehicle?: string;
  subject?: unknown;
  serviceType?: string;
  employeeId?: string;
  employeeName?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  value?: number;
  items?: unknown;
  notes?: string;
  internalNotes?: string;
}

export async function apiGetServiceOrders(token: string): Promise<ApiServiceOrder[]> {
  const res = await fetch(`${BASE_URL}/service-orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Erro ao buscar ordens de serviço');
  return data as ApiServiceOrder[];
}

export async function apiCreateServiceOrder(
  data: CreateServiceOrderData,
  token: string,
): Promise<ApiServiceOrder> {
  const res = await fetch(`${BASE_URL}/service-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao criar ordem de serviço');
  return json as ApiServiceOrder;
}

export async function apiUpdateServiceOrderStatus(
  id: string,
  status: string,
  token: string,
): Promise<ApiServiceOrder> {
  const res = await fetch(`${BASE_URL}/service-orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Erro ao atualizar status da OS');
  return json as ApiServiceOrder;
}

export async function apiDeleteServiceOrder(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/service-orders/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? 'Erro ao excluir ordem de serviço');
  }
}

