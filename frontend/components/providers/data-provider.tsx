"use client";

/**
 * DataProvider — carrega todos os dados do servidor assim que o usuário
 * entra no dashboard. Dessa forma, qualquer tela ou modal já encontra os
 * dados pré-carregados nos stores Zustand, sem precisar esperar o modal
 * abrir para buscar.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useClientsStore } from "@/store/clients-store";
import { useProductsStore, mapApiItemToProduct } from "@/store/products-store";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useServicesStore } from "@/store/services-store";
import { useQuotesStore } from "@/store/quotes-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import { useRatingsStore } from "@/store/ratings-store";
import { useUsersStore } from "@/store/users-store";
import {
  apiGetClients,
  apiGetInventoryItems,
  apiGetServices,
  apiGetUsers,
  apiGetServiceOrders,
  apiGetQuotes,
  apiGetTransactions,
  apiGetGoals,
  apiGetRatings,
  type ApiClient,
  type ApiQuote,
  type ApiServiceOrder,
  type ApiTransaction,
  type ApiGoal,
  type ApiRating,
  type UserProfile,
} from "@/lib/api";
import type {
  Client,
  Employee,
  ServiceCategory,
  Appointment,
  Quote,
  QuoteStatus,
  QuotePayment,
  QuoteSubject,
  Transaction,
  Goal,
  ClientRating,
  User,
} from "@/types";

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapApiClient(api: ApiClient): Client {
  const firstVehicle = api.vehicles[0];
  return {
    id: api.id,
    name: api.name,
    phone: api.phone ?? "",
    email: api.email ?? undefined,
    document: api.document ?? undefined,
    notes: api.notes ?? undefined,
    address:
      api.addressStreet && api.addressCity
        ? {
            zipCode: api.addressZipcode ?? "",
            street: api.addressStreet ?? "",
            number: api.addressNumber ?? "",
            complement: api.addressComplement ?? undefined,
            neighborhood: api.addressDistrict ?? "",
            city: api.addressCity ?? "",
            state: api.addressState ?? "",
          }
        : undefined,
    vehicles: api.vehicles.map((v) => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year ?? undefined,
      plate: v.plate ?? "",
      color: v.color ?? undefined,
    })),
    vehicle: firstVehicle
      ? {
          id: firstVehicle.id,
          brand: firstVehicle.brand,
          model: firstVehicle.model,
          year: firstVehicle.year ?? undefined,
          plate: firstVehicle.plate ?? "",
          color: firstVehicle.color ?? undefined,
        }
      : undefined,
    serviceHistory: [],
    totalSpent: 0,
    createdAt: api.createdAt,
  };
}

function mapApiUserToEmployee(u: UserProfile): Employee {
  const roleUpper = u.role.toUpperCase() as Employee["userRole"];
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: (u as unknown as { phone?: string }).phone ?? "",
    role:
      u.role === "owner" || u.role === "manager" ? "Administrador" : "Técnico",
    userRole: roleUpper,
    active: u.status === "active",
    hireDate: u.createdAt.slice(0, 10),
    servicesCompleted: 0,
    revenueGenerated: 0,
    specialties: [],
  };
}

function mapApiUserToUser(u: UserProfile): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.toUpperCase(),
    active: u.status === "active",
    createdAt: u.createdAt,
  };
}

function mapApiTransaction(api: ApiTransaction): Transaction {
  return {
    id: api.id,
    type: api.type as Transaction["type"],
    description: api.description,
    amount: api.amount,
    date: api.date,
    dueDate: api.dueDate ?? undefined,
    paidDate: api.paidDate ?? undefined,
    isPaid: api.isPaid,
    category: api.category,
    costCenter: api.costCenter ?? undefined,
    paymentMethod: api.paymentMethod ?? undefined,
    isRecurring: api.isRecurring,
    recurrenceDay: api.recurrenceDay ?? undefined,
    installments: api.installments ?? undefined,
    installmentNum: api.installmentNum ?? undefined,
    installmentRef: api.installmentRef ?? undefined,
    clientId: api.clientId ?? undefined,
    clientName: api.clientName ?? undefined,
    appointmentId: api.appointmentId ?? undefined,
    invoiceId: api.invoiceId ?? undefined,
  };
}

function mapApiGoal(api: ApiGoal): Goal {
  const progressPct = api.target > 0 ? Math.round((api.achieved / api.target) * 100) : 0;
  return {
    id: api.id,
    employeeId: api.employeeId ?? undefined,
    employeeName: api.employeeName ?? undefined,
    type: api.type as Goal["type"],
    period: api.period,
    target: api.target,
    achieved: api.achieved,
    progressPct,
  };
}

function mapApiRating(api: ApiRating): ClientRating {
  return {
    id: api.id,
    appointmentId: api.appointmentId ?? "",
    clientId: api.clientId ?? "",
    clientName: api.clientName ?? undefined,
    companyId: api.storeId,
    score: api.score,
    comment: api.comment ?? undefined,
    createdAt: api.createdAt,
  };
}

function mapApiServiceOrder(api: ApiServiceOrder): Appointment {
  return {
    id: api.id,
    clientId: api.clientId ?? "",
    clientName: api.clientName,
    vehicle: api.vehicle ?? "—",
    serviceType: api.serviceType,
    employeeId: api.employeeId ?? "",
    employeeName: api.employeeName ?? "",
    quoteId: api.quoteId ?? undefined,
    date: api.date,
    endDate: api.endDate ?? undefined,
    startTime: api.startTime ?? undefined,
    endTime: api.endTime ?? undefined,
    status: api.status as Appointment["status"],
    value: api.value,
    notes: api.notes ?? undefined,
  };
}

function mapApiQuote(api: ApiQuote): Quote {
  return {
    id: api.id,
    number: api.number,
    issueDate: api.issueDate.slice(0, 10),
    validUntil: api.validUntil ? api.validUntil.slice(0, 10) : "",
    status: api.status as QuoteStatus,
    clientId: api.clientId ?? "",
    clientName: api.clientName,
    clientPhone: api.clientPhone ?? undefined,
    clientEmail: api.clientEmail ?? undefined,
    clientDocument: api.clientDocument ?? undefined,
    clientDocumentType:
      (api.clientDocumentType as "cpf" | "cnpj" | undefined) ?? undefined,
    category: api.category as Quote["category"],
    subject: api.subject as QuoteSubject | undefined,
    sellerId: api.sellerId ?? undefined,
    sellerName: api.sellerName ?? undefined,
    createdById: api.createdById ?? undefined,
    createdByName: api.createdByName ?? undefined,
    items: api.items.map((item) => ({
      id: item.id,
      type: item.type as Quote["items"][0]["type"],
      name: item.name,
      description: item.description ?? undefined,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discount: item.discount,
      discountType: item.discountType as "value" | "percent",
      total: item.total,
      productId: item.productId ?? undefined,
      serviceId: item.serviceId ?? undefined,
      vehicleId: item.vehicleId ?? undefined,
    })),
    subtotal: api.subtotal,
    discount: api.discount,
    discountType: api.discountType as "value" | "percent" | undefined,
    taxes: api.taxes ?? undefined,
    totalValue: api.totalValue,
    acceptedPaymentMethods: api.acceptedPaymentMethods,
    payment: api.payment as QuotePayment | undefined,
    notes: api.notes ?? undefined,
    internalNotes: api.internalNotes ?? undefined,
    convertedAt: api.convertedAt ?? undefined,
    convertedToAppointmentId: api.convertedToAppointmentId ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  const setClients = useClientsStore((s) => s.setClients);
  const setProducts = useProductsStore((s) => s.setProducts);
  const setServiceCatalog = useServiceCatalogStore((s) => s.setServices);
  const setEmployees = useEmployeesStore((s) => s.setEmployees);
  const setAppointments = useServicesStore((s) => s.setServices);
  const setQuotes = useQuotesStore((s) => s.setQuotes);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const setGoals = useGoalsStore((s) => s.setGoals);
  const setRatings = useRatingsStore((s) => s.setRatings);
  const setUsers = useUsersStore((s) => s.setUsers);

  useEffect(() => {
    if (!token) return;

    Promise.allSettled([
      apiGetClients(token).then((data) => setClients(data.map(mapApiClient))),

      apiGetInventoryItems(token).then((data) =>
        setProducts(data.map(mapApiItemToProduct))
      ),

      apiGetServices(token).then((data) =>
        setServiceCatalog(
          data.map((s) => ({
            ...s,
            category: s.category as ServiceCategory,
            description: s.description ?? undefined,
            estimatedMinutes: s.estimatedMinutes ?? undefined,
          }))
        )
      ),

      apiGetUsers(token).then((data) => {
        setEmployees(data.map(mapApiUserToEmployee));
        setUsers(data.map(mapApiUserToUser));
      }),

      apiGetServiceOrders(token).then((data) =>
        setAppointments(data.map(mapApiServiceOrder))
      ),

      apiGetQuotes(token).then((data) => setQuotes(data.map(mapApiQuote))),

      apiGetTransactions(token).then((data) =>
        setTransactions(data.map(mapApiTransaction))
      ),

      apiGetGoals(token).then((data) => setGoals(data.map(mapApiGoal))),

      apiGetRatings(token).then((data) => setRatings(data.map(mapApiRating))),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return <>{children}</>;
}
