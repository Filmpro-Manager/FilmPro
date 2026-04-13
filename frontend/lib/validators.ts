import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token obrigatório"),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirmação obrigatória"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
    phone: z.string().min(10, "Telefone inválido"),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.newPassword && !d.currentPassword) return false;
      return true;
    },
    { message: "Informe a senha atual para alterar a senha", path: ["currentPassword"] }
  )
  .refine(
    (d) => {
      if (d.newPassword && d.newPassword !== d.confirmNewPassword) return false;
      return true;
    },
    { message: "As senhas não coincidem", path: ["confirmNewPassword"] }
  );

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const clientSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
  // documento
  documentType: z.enum(["none", "cpf", "cnpj"], { error: "Selecione o tipo de documento" }),
  document: z.string().optional(),
  // endereço (todos opcionais — mas se CEP for preenchido, os demais se tornam obrigatórios)
  addressZipCode: z.string().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  // veículo (marca e modelo obrigatórios quando informados; placa, ano e cor opcionais)
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleColor: z.string().optional(),
  vehicleYear: z.number().optional(),
}).superRefine((data, ctx) => {
  // Se CEP foi preenchido, os demais campos de endereço são obrigatórios
  const hasCep = data.addressZipCode && data.addressZipCode.replace(/\D/g, "").length === 8;
  if (hasCep) {
    if (!data.addressStreet?.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rua obrigatória", path: ["addressStreet"] });
    if (!data.addressNumber?.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número obrigatório", path: ["addressNumber"] });
    if (!data.addressNeighborhood?.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bairro obrigatório", path: ["addressNeighborhood"] });
    if (!data.addressCity?.trim())
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cidade obrigatória", path: ["addressCity"] });
    if (!data.addressState || data.addressState.length < 2)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Estado obrigatório", path: ["addressState"] });
  }

  // Se qualquer campo do veículo foi preenchido, marca e modelo são obrigatórios
  const hasAnyVehicleField = data.vehicleBrand || data.vehicleModel || data.vehiclePlate;
  if (hasAnyVehicleField) {
    if (!data.vehicleBrand)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Marca obrigatória", path: ["vehicleBrand"] });
    if (!data.vehicleModel)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Modelo obrigatório", path: ["vehicleModel"] });
  }
});

export const productSchema = z.object({
  brand: z.string().min(1, "Marca obrigatória"),
  model: z.string().min(1, "Modelo obrigatório"),
  type: z.enum(["adesivo", "pelicula", "ppf"], {
    error: "Selecione um tipo",
  }),
  transparency: z
    .number()
    .min(1, "Transparência mínima 1%")
    .max(100, "Transparência máxima 100%")
    .optional(),
  availableMeters: z
    .number({ error: "Quantidade obrigatória" })
    .min(0, "Valor não pode ser negativo"),
  costPrice: z
    .number({ error: "Custo obrigatório" })
    .min(0.01, "Custo inválido"),
  pricePerMeter: z
    .number({ error: "Preço de venda obrigatório" })
    .min(0.01, "Preço de venda inválido"),
  minimumStock: z
    .number({ error: "Estoque mínimo obrigatório" })
    .min(0, "Valor não pode ser negativo"),
  supplier: z.string().optional(),
  sku: z.string().optional(),
  rollWidth: z.number().positive("Largura deve ser maior que zero").optional(),
  color: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((data.type === "pelicula" || data.type === "ppf") && (data.transparency === undefined || data.transparency === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Transparência obrigatória",
      path: ["transparency"],
    });
  }
  if (data.type === "adesivo" && !data.color) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cor obrigatória para adesivo",
      path: ["color"],
    });
  }
});

export const appointmentSchema = z
  .object({
    clientId: z.string().min(1, "Selecione um cliente"),
    serviceType: z.string().min(1, "Tipo de serviço obrigatório"),
    employeeId: z.string().min(1, "Selecione um responsável"),
    quoteId: z.string().optional(),
    date: z.string().min(1, "Data de início obrigatória"),
    endDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    multiDay: z.boolean().optional(),
    value: z.number().min(0, "Valor inválido"),
    paymentMethod: z.string().optional(),
    paid: z.boolean().optional(),
    estimatedMinutes: z.number().min(1).optional(),
    actualMinutes: z.number().min(0).optional(),
    isRework: z.boolean().optional(),
    reworkReason: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["draft", "scheduled", "in_progress", "completed", "cancelled", "created"]),
  })
  .refine(
    (d) => {
      if (d.multiDay && d.endDate) {
        return d.endDate >= d.date;
      }
      return true;
    },
    { message: "Data de término deve ser igual ou posterior à data de início", path: ["endDate"] }
  );

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.number().min(0.01, "Valor inválido"),
  date: z.string().min(1, "Data de compêttência obrigatória"),
  dueDate: z.string().optional(),                     // vencimento
  isPaid: z.boolean().default(true),                  // quitado?
  category: z.string().min(1, "Categoria obrigatória"),
  costCenter: z.string().optional(),                  // centro de custo
  paymentMethod: z.string().optional(),
  clientId: z.string().optional(),
  isRecurring: z.boolean().default(false),            // despesa fixa recorrente
  recurrenceDay: z.number().min(1).max(31).optional(),
  installments: z.number().min(1).max(60).optional(), // parcelamento
});

export const employeeSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional().or(z.literal("")),
  role: z.enum(["manager", "employee"]),
  specialties: z.array(z.string()).optional(),
  salary: z.number().min(0, "Salário inválido").optional(),
  commissionPct: z.number().min(0).max(100, "Máximo 100%").optional(), // ex: 20 = 20%
  workloadHours: z.number().min(1).max(168).optional(),
});

export const userSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional().or(z.literal("")),
  role: z.enum(["OWNER", "MANAGER", "EMPLOYEE"]),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  isActive: z.boolean(),
  companyId: z.string().optional().or(z.literal("")),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type UserInput = z.infer<typeof userSchema>;

// Aliases usados nos form dialogs
export type EmployeeFormData = EmployeeInput;
export type UserFormData = UserInput;

// ─── Company Settings ─────────────────────────────────────────────────────────

export const companyModulesSchema = z.object({
  hasService: z.boolean(),
  hasProducts: z.boolean(),
  hasWholesale: z.boolean(),
  hasTeam: z.boolean(),
});

export const companySettingsSchema = z.object({
  name: z.string().min(2, "Razão social obrigatória"),
  tradeName: z.string().min(1, "Nome fantasia obrigatório"),
  cnpj: z.string().min(18, "CNPJ inválido"),
  phone: z.string().min(13, "Telefone inválido"),
  email: z.string().email("E-mail inválido"),
  address: z.object({
    street: z.string().min(1, "Rua obrigatória"),
    number: z.string().min(1, "Número obrigatório"),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, "Bairro obrigatório"),
    city: z.string().min(1, "Cidade obrigatória"),
    state: z.string().length(2, "Selecione um estado"),
    zipCode: z.string().min(9, "CEP inválido"),
  }),
  logoUrl: z.string().optional(),
  modules: companyModulesSchema.optional(),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
export type CompanyModulesInput = z.infer<typeof companyModulesSchema>;

// ─── Lançamento Rápido de Serviço ─────────────────────────────────────────────

export const quickServiceSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente"),
  category: z.enum(["automotive", "architecture"]).optional(),
  serviceType: z.string().min(1, "Tipo de serviço obrigatório"),
  employeeId: z.string().min(1, "Selecione o responsável"),
  date: z.string().min(1, "Data obrigatória"),
  value: z.number().min(0, "Valor inválido"),
  paymentMethod: z.string().min(1, "Selecione o método de pagamento"),
  paid: z.boolean(),
  notes: z.string().optional(),
});

export type QuickServiceInput = z.infer<typeof quickServiceSchema>;

// ─── Catálogo de Serviços ──────────────────────────────────────────────────────

export const serviceCatalogSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  price: z.number().min(0).default(0),
  category: z.enum(["automotive", "architecture", "general"]),
  isActive: z.boolean(),
});

export type ServiceCatalogInput = z.infer<typeof serviceCatalogSchema>;

// ─── Orçamentos (Quotes) ───────────────────────────────────────────────────────

export const quoteItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["service", "product", "other"]).default("service"),
  name: z.string().min(1, "Nome do item obrigatório"),
  description: z.string().optional(),
  quantity: z.number().min(0.01, "Quantidade inválida"),
  unit: z.string().default("un"),
  unitPrice: z.number().min(0, "Preço unitário inválido"),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["value", "percent"]).default("value"),
  total: z.number().min(0),
  productId: z.string().optional(),
  serviceId: z.string().optional(),
  vehicleId: z.string().optional(),
});

export const quotePaymentSchema = z.object({
  method: z.string().min(1, "Forma de pagamento obrigatória"),
  installments: z.number().min(1).default(1),
  downPayment: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const quoteSchema = z.object({
  // categoria
  category: z.enum(["automotive", "architecture"]).optional(),
  // datas (geradas automaticamente)
  issueDate: z.string().optional(),
  validUntil: z.string().optional(),
  // cliente
  clientId: z.string().min(1, "Selecione um cliente"),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  subject: z
    .object({
      type: z.enum(["vehicle", "building", "other"]).default("vehicle"),
      // veículo
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.string().optional(),
      plate: z.string().optional(),
      color: z.string().optional(),
      // residência / comercial / outro
      address: z.string().optional(),
      area: z.number().min(0.01).optional(),
      description: z.string().optional(),
    })
    .optional(),
  // itens
  items: z.array(quoteItemSchema).min(1, "Adicione ao menos um item"),
  // descontos & impostos
  discount: z.number().min(0).default(0),
  discountType: z.enum(["value", "percent"]).default("value"),
  taxes: z.number().min(0).max(100).optional(),
  // formas de pagamento aceitas (orçamento não confirma método, apenas lista opções)
  acceptedPaymentMethods: z.array(z.string()).optional(),
  payment: quotePaymentSchema.optional(),
  // observações
  internalNotes: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent"]).default("draft").optional(),
});

export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuotePaymentInput = z.infer<typeof quotePaymentSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;

// ─── Metas (Goals) ───────────────────────────────────────────────────────────

export const goalSchema = z.object({
  type: z.enum(["revenue", "services", "new_clients", "conversion_rate", "ticket_average"]),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido (aaaa-mm)"),
  target: z.number().min(0.01, "Meta deve ser maior que zero"),
  employeeId: z.string().optional(), // null = meta da empresa
});

export type GoalInput = z.infer<typeof goalSchema>;

// ─── Avaliação / NPS ─────────────────────────────────────────────────────────

export const clientRatingSchema = z.object({
  appointmentId: z.string().min(1, "OS obrigatória"),
  score: z.number().int().min(0, "Mínimo 0").max(10, "Máximo 10"),
  comment: z.string().optional(),
});

export type ClientRatingInput = z.infer<typeof clientRatingSchema>;
