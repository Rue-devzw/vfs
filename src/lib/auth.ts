import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export type StaffRole = "admin" | "store_manager" | "auditor";

export type StaffPermission =
  | "dashboard.view"
  | "products.view"
  | "products.edit"
  | "orders.view"
  | "orders.edit"
  | "payments.view"
  | "shipments.view"
  | "shipments.manage"
  | "refunds.view"
  | "refunds.manage"
  | "refunds.execute"
  | "customers.view"
  | "notifications.view"
  | "notifications.manage"
  | "audit.view"
  | "digital.view"
  | "digital.manage"
  | "settings.manage";

export type StaffSession = {
  role: StaffRole;
  permissions: StaffPermission[];
  expires: Date | string;
};

export type CustomerSession = {
  role: "customer";
  authUserId: string;
  email: string;
  phone?: string;
  name?: string;
  expires: Date | string;
};

export type AccessContext =
  | { kind: "staff"; role: StaffRole; permissions: StaffPermission[] }
  | { kind: "customer"; role: "customer" }
  | { kind: "anonymous"; role: "anonymous" };

const STAFF_ROLE_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  admin: [
    "dashboard.view",
    "products.view",
    "products.edit",
    "orders.view",
    "orders.edit",
    "payments.view",
    "shipments.view",
    "shipments.manage",
    "refunds.view",
    "refunds.manage",
    "refunds.execute",
    "customers.view",
    "notifications.view",
    "notifications.manage",
    "audit.view",
    "digital.view",
    "digital.manage",
    "settings.manage",
  ],
  store_manager: [
    "dashboard.view",
    "products.view",
    "products.edit",
    "orders.view",
    "orders.edit",
    "payments.view",
    "shipments.view",
    "shipments.manage",
    "refunds.view",
    "refunds.manage",
    "customers.view",
    "notifications.view",
    "notifications.manage",
    "digital.view",
    "digital.manage",
  ],
  auditor: [
    "dashboard.view",
    "products.view",
    "orders.view",
    "payments.view",
    "shipments.view",
    "refunds.view",
    "customers.view",
    "notifications.view",
    "audit.view",
    "digital.view",
  ],
};

function getSessionKey() {
  return new TextEncoder().encode(env.ADMIN_SESSION_PASSWORD);
}

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "store_manager" || value === "auditor";
}

export function getStaffPermissions(role: StaffRole): StaffPermission[] {
  return STAFF_ROLE_PERMISSIONS[role];
}

export function hasStaffPermission(
  session: Pick<StaffSession, "permissions"> | null | undefined,
  permission: StaffPermission,
) {
  return Boolean(session?.permissions.includes(permission));
}

export function getPermissionForAdminPath(pathname: string): StaffPermission {
  if (pathname.startsWith("/admin/products")) return "products.view";
  if (pathname.startsWith("/admin/orders")) return "orders.view";
  if (pathname.startsWith("/admin/payments")) return "payments.view";
  if (pathname.startsWith("/admin/shipments")) return "shipments.view";
  if (pathname.startsWith("/admin/refunds")) return "refunds.view";
  if (pathname.startsWith("/admin/customers")) return "customers.view";
  if (pathname.startsWith("/admin/notifications")) return "notifications.view";
  if (pathname.startsWith("/admin/audit")) return "audit.view";
  if (pathname.startsWith("/admin/digital")) return "digital.view";
  if (pathname.startsWith("/admin/settings")) return "settings.manage";
  return "dashboard.view";
}

export function getPermissionForAdminApiPath(pathname: string): StaffPermission {
  if (pathname.startsWith("/api/admin/upload-image")) return "products.edit";
  if (pathname.startsWith("/api/admin/orders/export")) return "orders.view";
  return "dashboard.view";
}

export async function encrypt(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSessionKey());
}

export async function decrypt(input: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(input, getSessionKey(), {
      algorithms: ["HS256"],
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createAdminSession(role: StaffRole = "admin") {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({
    role,
    permissions: getStaffPermissions(role),
    expires,
  } satisfies StaffSession);

  const cookieStore = await cookies();
  cookieStore.set("admin_session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function createCustomerSession(input: {
  authUserId: string;
  email: string;
  phone?: string;
  name?: string;
}) {
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const session = await encrypt({
    role: "customer",
    authUserId: input.authUserId,
    email: input.email.toLowerCase(),
    phone: input.phone,
    name: input.name,
    expires,
  } satisfies CustomerSession);

  const cookieStore = await cookies();
  cookieStore.set("customer_session", session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function verifyAdminSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  if (!payload || !isStaffRole(payload.role) || !Array.isArray(payload.permissions)) {
    return null;
  }

  return {
    role: payload.role,
    permissions: payload.permissions.filter((permission): permission is StaffPermission => typeof permission === "string"),
    expires: payload.expires as Date | string,
  };
}

export async function requireStaffRoles(roles: StaffRole[]) {
  const session = await verifyAdminSession();
  if (!session || !roles.includes(session.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireStaffPermission(permission: StaffPermission) {
  const session = await verifyAdminSession();
  if (!session || !hasStaffPermission(session, permission)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function verifyCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("customer_session")?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  if (payload?.role !== "customer" || typeof payload.email !== "string" || typeof payload.authUserId !== "string") {
    return null;
  }

  return payload as unknown as CustomerSession;
}

export async function getAccessContext(): Promise<AccessContext> {
  const staff = await verifyAdminSession();
  if (staff) {
    return {
      kind: "staff",
      role: staff.role,
      permissions: staff.permissions,
    };
  }

  const customer = await verifyCustomerSession();
  if (customer) {
    return {
      kind: "customer",
      role: "customer",
    };
  }

  return {
    kind: "anonymous",
    role: "anonymous",
  };
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", "", {
    maxAge: 0,
    path: "/",
  });
}

export async function destroyCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.set("customer_session", "", {
    maxAge: 0,
    path: "/",
  });
}
