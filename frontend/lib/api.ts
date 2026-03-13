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
