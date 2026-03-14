"use server";

import { getDb, isFirebaseConfigured } from "../firebase-admin";
import { listOrders, listRefundCases, type RefundCase } from "./orders";
import { listDigitalOrdersByCustomer, type DigitalOrderRecord } from "./digital-orders";

export type CustomerShippingAddress = {
  label: string;
  address: string;
  instructions?: string;
  recipientName?: string;
  recipientPhone?: string;
  lastUsedAt: string;
  isDefault?: boolean;
};

export type CustomerEngagement = {
  id: string;
  customerEmail: string;
  orderReference?: string;
  type: string;
  title: string;
  detail?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export type AdminCustomer = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt?: string;
  lastOrderReference?: string;
  savedAddressCount: number;
  preferredDeliveryMethod?: "collect" | "delivery";
  paymentMethodsUsed: string[];
  lastPaymentIssueAt?: string;
  openRefundCaseCount: number;
};

export type CustomerProfile = AdminCustomer & {
  shippingAddresses: CustomerShippingAddress[];
  refunds: RefundCase[];
  engagements: CustomerEngagement[];
  recentOrders: Awaited<ReturnType<typeof listOrders>>;
  digitalOrders: DigitalOrderRecord[];
};

type FirestoreCustomerRecord = {
  email?: string;
  name?: string;
  phone?: string;
  address?: string;
  authUserId?: string;
  accountStatus?: "pending_verification" | "active";
  emailVerifiedAt?: string;
  registeredAt?: string;
  shippingAddresses?: CustomerShippingAddress[];
  preferredDeliveryMethod?: "collect" | "delivery";
  paymentMethodsUsed?: string[];
  lastOrderReference?: string;
  lastOrderAt?: string;
  lastPaymentIssueAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

function normalizePhone(value: string | undefined) {
  return (value ?? "").replace(/\D+/g, "");
}

function buildCustomerBase(email: string): AdminCustomer {
  return {
    id: email,
    email,
    name: email,
    orderCount: 0,
    totalSpent: 0,
    savedAddressCount: 0,
    paymentMethodsUsed: [],
    openRefundCaseCount: 0,
  };
}

export async function listCustomers(): Promise<AdminCustomer[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const db = getDb();
  const [customerSnapshot, orders, refunds] = await Promise.all([
    db.collection("customers").get(),
    listOrders(),
    listRefundCases(),
  ]);

  const customers = new Map<string, AdminCustomer>();

  customerSnapshot.forEach(doc => {
    const data = doc.data() as FirestoreCustomerRecord;
    const email = (data.email ?? doc.id).toLowerCase();
    customers.set(email, {
      id: doc.id,
      email,
      name: data.name ?? email,
      phone: data.phone,
      address: data.address,
      orderCount: 0,
      totalSpent: 0,
      lastOrderAt: data.lastOrderAt ?? data.updatedAt,
      lastOrderReference: data.lastOrderReference,
      savedAddressCount: Array.isArray(data.shippingAddresses) ? data.shippingAddresses.length : 0,
      preferredDeliveryMethod: data.preferredDeliveryMethod,
      paymentMethodsUsed: Array.isArray(data.paymentMethodsUsed) ? data.paymentMethodsUsed : [],
      lastPaymentIssueAt: data.lastPaymentIssueAt,
      openRefundCaseCount: 0,
    });
  });

  for (const order of orders) {
    const email = order.customerEmail?.toLowerCase();
    if (!email) continue;

    const existing = customers.get(email) ?? buildCustomerBase(email);
    existing.id = existing.id || email;
    existing.name = existing.name === email ? (order.customerName || email) : existing.name;
    existing.phone = existing.phone || order.customerPhone;
    existing.address = existing.address || order.customerAddress;
    existing.orderCount += 1;
    existing.totalSpent += order.totalUsd ?? order.total ?? 0;

    const paymentMethod = order.paymentMethod?.toUpperCase();
    if (paymentMethod && !existing.paymentMethodsUsed.includes(paymentMethod)) {
      existing.paymentMethodsUsed.push(paymentMethod);
    }

    if (order.shipping?.deliveryMethod && !existing.preferredDeliveryMethod) {
      existing.preferredDeliveryMethod = order.shipping.deliveryMethod;
    }

    const createdAt = order.createdAt;
    if (!existing.lastOrderAt || (createdAt && createdAt > existing.lastOrderAt)) {
      existing.lastOrderAt = createdAt;
      existing.lastOrderReference = order.id;
    }

    customers.set(email, existing);
  }

  for (const refund of refunds) {
    const email = refund.customerEmail?.toLowerCase();
    if (!email) continue;
    const existing = customers.get(email) ?? buildCustomerBase(email);
    if (!["closed", "rejected"].includes(refund.status)) {
      existing.openRefundCaseCount += 1;
    }
    if (!existing.lastPaymentIssueAt || refund.updatedAt > existing.lastPaymentIssueAt) {
      existing.lastPaymentIssueAt = refund.updatedAt;
    }
    customers.set(email, existing);
  }

  return Array.from(customers.values()).sort((a, b) => {
    if (a.lastOrderAt && b.lastOrderAt) {
      return b.lastOrderAt.localeCompare(a.lastOrderAt);
    }
    return a.name.localeCompare(b.name);
  });
}

export async function getCustomerProfileByEmail(email: string): Promise<CustomerProfile | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const normalizedEmail = email.toLowerCase();
  const db = getDb();
  const [customerDoc, orders, refunds, engagementSnapshot, digitalOrders] = await Promise.all([
    db.collection("customers").doc(normalizedEmail).get(),
    listOrders(),
    listRefundCases({ customerEmail: normalizedEmail }),
    db.collection("customer_engagements").where("customerEmail", "==", normalizedEmail).orderBy("createdAt", "desc").limit(50).get(),
    listDigitalOrdersByCustomer(normalizedEmail),
  ]);

  const allCustomers = await listCustomers();
  const summary = allCustomers.find(customer => customer.email === normalizedEmail);
  if (!summary && !customerDoc.exists) {
    return null;
  }

  const data = (customerDoc.data() ?? {}) as FirestoreCustomerRecord;
  const customerOrders = orders.filter(order => order.customerEmail?.toLowerCase() === normalizedEmail);

  return {
    ...(summary ?? buildCustomerBase(normalizedEmail)),
    id: customerDoc.id || normalizedEmail,
    email: normalizedEmail,
    name: summary?.name ?? data.name ?? normalizedEmail,
    phone: summary?.phone ?? data.phone,
    address: summary?.address ?? data.address,
    shippingAddresses: Array.isArray(data.shippingAddresses) ? data.shippingAddresses : [],
    refunds,
    engagements: engagementSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CustomerEngagement),
    recentOrders: customerOrders.slice(0, 20),
    digitalOrders,
  };
}

export async function lookupReturningCustomer(email: string, phone: string) {
  const profile = await getCustomerProfileByEmail(email);
  if (!profile) {
    return null;
  }

  if (!normalizePhone(profile.phone) || normalizePhone(profile.phone) !== normalizePhone(phone)) {
    return null;
  }

  return {
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
    address: profile.address,
    preferredDeliveryMethod: profile.preferredDeliveryMethod,
    shippingAddresses: profile.shippingAddresses,
    lastOrderReference: profile.lastOrderReference,
    paymentMethodsUsed: profile.paymentMethodsUsed,
  };
}

export async function authenticateCustomer(email: string, phone: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const profile = await lookupReturningCustomer(normalizedEmail, phone);
  if (!profile) {
    return null;
  }

  return {
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
  };
}

export async function getCustomerAccountSnapshot(email: string) {
  const profile = await getCustomerProfileByEmail(email);
  if (!profile) {
    return null;
  }

  return {
    profile: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
      preferredDeliveryMethod: profile.preferredDeliveryMethod,
      shippingAddresses: profile.shippingAddresses,
      paymentMethodsUsed: profile.paymentMethodsUsed,
      orderCount: profile.orderCount,
      totalSpent: profile.totalSpent,
      lastOrderAt: profile.lastOrderAt,
      lastOrderReference: profile.lastOrderReference,
      savedAddressCount: profile.savedAddressCount,
      openRefundCaseCount: profile.openRefundCaseCount,
      lastPaymentIssueAt: profile.lastPaymentIssueAt,
    },
    orders: profile.recentOrders,
    digitalOrders: profile.digitalOrders,
    refunds: profile.refunds,
    engagements: profile.engagements,
  };
}

export async function registerCustomerAccount(input: {
  email: string;
  authUserId: string;
  name: string;
  phone: string;
}) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const ref = db.collection("customers").doc(email);
  const snapshot = await ref.get();
  const existing = (snapshot.data() ?? {}) as FirestoreCustomerRecord;

  if (existing.authUserId && existing.authUserId !== input.authUserId) {
    throw new Error("This email is already linked to another customer account.");
  }

  if (existing.phone && normalizePhone(existing.phone) && normalizePhone(existing.phone) !== normalizePhone(input.phone)) {
    throw new Error("Phone number does not match the existing customer record for this email.");
  }

  const timestamp = new Date().toISOString();
  await ref.set({
    email,
    name: input.name.trim(),
    phone: input.phone.trim(),
    authUserId: input.authUserId,
    accountStatus: "pending_verification",
    registeredAt: existing.registeredAt ?? timestamp,
    updatedAt: timestamp,
  }, { merge: true });
}

export async function activateCustomerAccount(input: {
  email: string;
  authUserId: string;
  name?: string | null;
}) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firestore is not configured");
  }

  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const ref = db.collection("customers").doc(email);
  const snapshot = await ref.get();
  const existing = (snapshot.data() ?? {}) as FirestoreCustomerRecord;
  const timestamp = new Date().toISOString();

  if (existing.authUserId && existing.authUserId !== input.authUserId) {
    throw new Error("This customer record is linked to another account.");
  }

  await ref.set({
    email,
    name: input.name ?? existing.name ?? email,
    authUserId: input.authUserId,
    accountStatus: "active",
    emailVerifiedAt: timestamp,
    registeredAt: existing.registeredAt ?? timestamp,
    updatedAt: timestamp,
  }, { merge: true });
}
