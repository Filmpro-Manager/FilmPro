// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type UserRole = "OWNER" | "MANAGER" | "EMPLOYEE";

export type AppointmentStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "created";

export type FilmType =
  | "automotive"
  | "architecture"
  | "security"
  | "decorative"
  | "solar";

export type TransactionType = "income" | "expense";

export type QuoteStatus = "draft" | "sent" | "approved" | "converted" | "expired" | "rejected";

export type GoalType =
  | "revenue"
  | "services"
  | "new_clients"
  | "conversion_rate"
  | "ticket_average";

export type AlertType =
  | "low_stock"
  | "overdue_payment"
  | "idle_client"
  | "goal_at_risk"
  | "rework_detected"
  | "cashflow_warning"
  | "quote_expiring";

export type AlertSeverity = "info" | "warning" | "critical";

export type CompanyPlan = "basic" | "pro" | "enterprise";

export type ClientLifecycle = "active" | "at_risk" | "inactive" | "new";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  employeeId?: string;
  active: boolean;
  companyId?: string;
  storeId?: string | null;
  createdAt: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface CompanyAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CompanyModules {
  hasService: boolean;    // agenda, OS, orçamentos operacionais
  hasProducts: boolean;   // estoque, movimentações
  hasWholesale: boolean;  // venda B2B em quantidade
  hasTeam: boolean;       // módulo equipe e comissão
}

export interface CompanySettings {
  name: string;
  tradeName: string;
  cnpj: string;
  phone: string;
  email: string;
  address: CompanyAddress;
  logoUrl?: string;
  plan?: CompanyPlan;
  modules?: CompanyModules;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  color?: string;
  year?: number;
}

export interface ClientAddress {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ServiceRecord {
  id: string;
  date: string;
  service: string;
  value: number;
  technicianName: string;
  status: AppointmentStatus;
}

export interface Client {
  id: string;
  name: string;
  document?: string;
  documentType?: "cpf" | "cnpj";
  phone: string;
  email?: string;
  birthDate?: string;         // para disparos de aniversário
  vehicle?: Vehicle;          // veículo principal (compatibilidade)
  vehicles?: Vehicle[];       // todos os veículos
  address?: ClientAddress;
  serviceHistory: ServiceRecord[];
  notes?: string;
  createdAt: string;
  totalSpent: number;
  lastPurchaseAt?: string;    // para cálculo de ciclo de vida
  lifecycle?: ClientLifecycle; // calculado no frontend
  ltv?: number;               // estimativa calculada
}

// ─── Products / Stock ─────────────────────────────────────────────────────────

export interface Product {
  id: string;
  brand: string;
  model: string;
  type: FilmType;
  transparency: number;
  availableMeters: number;
  costPrice: number;          // custo de aquisição por metro
  pricePerMeter: number;      // preço de venda por metro
  margin?: number;            // calculado: (pricePerMeter - costPrice) / pricePerMeter
  minimumStock: number;
  supplier?: string;
  sku?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: "in" | "out";
  quantity: number;
  reason: string;
  date: string;
  userId: string;
  userName: string;
}

// ─── Employees ───────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  role: string;               // cargo descritivo (ex: "Instalador Sênior")
  phone: string;
  email: string;
  userId?: string;
  userRole: UserRole;
  active: boolean;
  hireDate: string;
  salary?: number;            // salário base mensal
  commissionPct?: number;     // % de comissão (ex: 0.20 = 20%)
  workloadHours?: number;     // carga horária semanal
  servicesCompleted: number;
  revenueGenerated: number;
  specialties?: string[];
  avatar?: string;
}

// ─── Appointments / OS ───────────────────────────────────────────────────────

export interface MaterialUsage {
  productId: string;
  productName: string;
  meters: number;
  costPrice?: number;         // custo por metro no momento da execução
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  vehicle: string;
  serviceType: string;
  employeeId: string;
  employeeName: string;
  quoteId?: string;           // origem: orçamento aprovado
  date: string;               // data de início (YYYY-MM-DD)
  endDate?: string;           // data de término para serviços multi-dia
  startTime?: string;
  endTime?: string;
  status: AppointmentStatus;
  value: number;
  serviceValue?: number;
  paymentMethod?: string;
  paid?: boolean;
  materialCost?: number;      // custo real dos materiais (calculado ao concluir)
  commission?: number;        // comissão do técnico para esta OS
  estimatedMinutes?: number;  // tempo previsto
  actualMinutes?: number;     // tempo real gasto
  isRework?: boolean;         // retrabalho
  reworkReason?: string;
  materialsUsed?: MaterialUsage[];
  notes?: string;
  category?: ServiceCategory;  // automotivo | arquitetura
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;               // data de competência
  dueDate?: string;           // vencimento (contas a pagar/receber)
  paidDate?: string;          // data do pagamento efetivo
  isPaid?: boolean;           // quitado?
  category: string;
  costCenter?: string;        // centro de custo
  paymentMethod?: string;
  isRecurring?: boolean;      // despesa fixa recorrente
  recurrenceDay?: number;     // dia do mês para débito
  installments?: number;      // total de parcelas
  installmentNum?: number;    // número desta parcela
  installmentRef?: string;    // agrupador das parcelas
  clientId?: string;
  clientName?: string;
  appointmentId?: string;
  invoiceId?: string;
}

// ─── Quotes / Orçamentos ─────────────────────────────────────────────────────

export type QuoteItemType = "service" | "product" | "other";
export type QuoteDiscountType = "value" | "percent";

export interface QuoteItem {
  id: string;
  type: QuoteItemType;
  name: string;
  description?: string;
  quantity: number;
  unit: string;               // un, m, m², kg, etc.
  unitPrice: number;
  discount: number;           // desconto no item
  discountType: QuoteDiscountType;
  total: number;
  productId?: string;
  serviceId?: string;
  vehicleId?: string;
}

export type QuoteCategory = "automotive" | "architecture";
export type QuoteSubjectType = "vehicle" | "building" | "other";

export interface QuoteSubject {
  type: QuoteSubjectType;
  // veículo
  brand?: string;
  model?: string;
  year?: string;
  plate?: string;
  color?: string;
  // residência / comercial / outro
  address?: string;       // endereço ou localização
  area?: number;          // m² da superfície
  description?: string;   // descrição livre do objeto
}

export interface QuotePayment {
  method: string;             // PIX, Cartão, Dinheiro, Boleto
  installments: number;
  downPayment?: number;
  notes?: string;
}

export interface Quote {
  id: string;
  number: string;             // ORC-2026-001
  issueDate: string;
  validUntil: string;
  status: QuoteStatus;
  // cliente
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDocument?: string;
  clientDocumentType?: "cpf" | "cnpj";
  category?: QuoteCategory;        // automotive | residential | commercial
  subject?: QuoteSubject;          // veículo, residência, comercial, etc.
  // vendedor
  sellerId?: string;
  sellerName?: string;
  // itens & totais
  items: QuoteItem[];
  subtotal: number;           // soma dos itens antes do desconto global
  discount: number;           // desconto global
  discountType?: QuoteDiscountType;
  taxes?: number;             // % de impostos
  totalValue: number;         // valor final
  // pagamento
  acceptedPaymentMethods?: string[];  // formas aceitas no orçamento
  payment?: QuotePayment;
  // notas
  internalNotes?: string;
  notes?: string;             // observações para o cliente
  // conversão
  convertedAt?: string;
  convertedToAppointmentId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Goals / Metas ───────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  employeeId?: string;        // null = meta da empresa
  employeeName?: string;
  type: GoalType;
  period: string;             // "2026-02"
  target: number;
  achieved: number;
  progressPct?: number;       // calculado: achieved / target * 100
}

// ─── NPS / Avaliações ────────────────────────────────────────────────────────

export interface ClientRating {
  id: string;
  appointmentId: string;
  clientId: string;
  clientName?: string;
  companyId: string;
  score: number;              // 0–10 (NPS)
  comment?: string;
  createdAt: string;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  value: number;
  items: InvoiceItem[];
  fileUrl?: string;
  fileType?: "xml" | "pdf";
  status: "pending" | "paid" | "cancelled" | "issued";
  key?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// ─── Service Catalog ─────────────────────────────────────────────────────────

export type ServiceCategory = "automotive" | "architecture";

export interface ServiceCatalog {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: ServiceCategory;
  estimatedMinutes?: number;  // tempo estimado de execução
  isActive: boolean;
  createdAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  // Financeiro
  monthlyRevenue: number;
  monthlyExpenses: number;
  grossProfit: number;        // receita - custo de materiais
  operationalProfit: number;  // lucro bruto - despesas operacionais
  netProfit: number;          // lucro líquido
  monthlyRevenueGrowth: number;
  ticketAverage: number;
  cashBalance: number;        // saldo atual do caixa (recebido - pago)
  projectedRevenue: number;   // agendamentos futuros do mês

  // Operacional
  servicesCompleted: number;
  servicesGrowth: number;
  reworkRate: number;         // % de retrabalhos

  // Comercial
  quotesCreated: number;
  conversionRate: number;     // orçamentos aprovados / criados

  // Estoque
  lowStockAlerts: number;

  // Agenda
  upcomingAppointments: number;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
