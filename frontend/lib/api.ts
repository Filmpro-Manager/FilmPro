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

