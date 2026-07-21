export type ApiRole = "ADMIN" | "USER";
export type ApiOrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED";

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  price: number;
  stock: number;
  category: string;
  brand: string | null;
  imageUrl: string;
  additionalImages: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: ApiRole;
  isActive: boolean;
  createdAt: string;
}

export interface ApiOrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
}

export type ApiBuybackStatus = "NEW" | "CONTACTED" | "OFFER_SENT" | "ACCEPTED" | "REFUSED" | "CLOSED";

export interface ApiBuybackRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  equipmentType: string;
  brand: string;
  model: string;
  condition: string;
  description: string;
  expectedPrice: number | null;
  status: ApiBuybackStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  status: ApiOrderStatus;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  totalAmount: number;
  createdAt: string;
  orderItems: ApiOrderItem[];
}

export interface PartView {
  id: string;
  name: string;
  price: number;
  category: string;
  condition: "Neuf" | "Très bon état" | "Bon état" | "Reconditionné";
  image: string;
  description: string;
  stock: number;
  createdAt: string;
}

export interface AccountView {
  id: string;
  isActive: boolean;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

export interface OrderView {
  id: string;
  apiId: string;
  customerName: string;
  customerEmail: string;
  items: Array<{ part: PartView; qty: number }>;
  total: number;
  status: "en_attente" | "en_cours" | "expédié" | "livré" | "annulée";
  date: string;
}

interface ApiErrorBody { error?: string; message?: string; }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "include" });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const error = (body || {}) as ApiErrorBody;
    throw new ApiError(error.error || error.message || "Une erreur est survenue.", response.status);
  }
  return body as T;
}

function unwrapUser(value: ApiUser | { user: ApiUser }): ApiUser {
  return "user" in value ? value.user : value;
}

export function productToView(product: ApiProduct): PartView {
  const knownConditions = ["Neuf", "Très bon état", "Bon état", "Reconditionné"] as const;
  const condition = knownConditions.includes(product.shortDescription as typeof knownConditions[number])
    ? product.shortDescription as typeof knownConditions[number]
    : "Reconditionné";
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    condition,
    image: product.imageUrl,
    description: product.description,
    stock: product.stock,
    createdAt: product.createdAt,
  };
}

export function userToView(user: ApiUser): AccountView {
  return {
    id: user.id,
    isActive: user.isActive,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    email: user.email,
    role: user.role === "ADMIN" ? "admin" : "user",
    createdAt: user.createdAt,
  };
}

const statusToView: Record<ApiOrderStatus, OrderView["status"]> = {
  PENDING: "en_attente",
  PROCESSING: "en_cours",
  SHIPPED: "expédié",
  DELIVERED: "livré",
  CANCELED: "annulée",
};

export function orderToView(order: ApiOrder): OrderView {
  return {
    id: order.orderNumber,
    apiId: order.id,
    customerName: [order.firstName, order.lastName].filter(Boolean).join(" "),
    customerEmail: order.email,
    total: order.totalAmount / 100,
    status: statusToView[order.status],
    date: order.createdAt.slice(0, 10),
    items: order.orderItems.map((item) => ({
      qty: item.quantity,
      part: {
        id: item.productId || item.id,
        name: item.productName,
        price: item.unitPrice / 100,
        category: "Commande",
        condition: "Reconditionné",
        image: item.imageUrl || "",
        description: "",
        stock: 0,
        createdAt: order.createdAt,
      },
    })),
  };
}

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 170);
}

function splitName(name: string): { firstName: string; lastName: string } {
  const words = name.trim().split(/\s+/);
  return { firstName: words.shift() || "", lastName: words.join(" ") || "-" };
}

const blogToView = (post: any) => ({ id: post.id, title: post.title, excerpt: post.excerpt, content: post.content, image: post.imageUrl, date: new Date(post.createdAt).toLocaleDateString("fr-FR"), category: post.category, author: post.author, readTime: post.readTime });
export const api = {
  async blogPosts(): Promise<BlogPostView[]> {
    const posts = await request<ApiBlogPost[]>("/api/blog");
    return posts.map(blogToView);
  },
  async saveBlogPost(data: { title: string; excerpt: string; content: string; category: string; image: string }, id?: string): Promise<BlogPostView> {
    const post = await request<ApiBlogPost>(id ? "/api/blog/" + id : "/api/blog", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({ ...data, imageUrl: data.image, author: "Équipe Do' Motoculture", readTime: Math.max(1, Math.ceil(data.content.split(/\s+/).length / 220)) }),
    });
    return blogToView(post);
  },
  deleteBlogPost: (id: string) => request<void>("/api/blog/" + id, { method: "DELETE" }),
  contact: (data: { name: string; email: string; phone: string; subject: string; message: string }) =>
    request<{ id: string; status: string }>("/api/contact", { method: "POST", body: JSON.stringify(data) }),


  async createCheckout(input: {
    customer: { name: string; email: string; phone?: string };
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<{ url: string }> {
    return request<{ url: string }>("/api/checkout/session", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async checkoutStatus(sessionId: string): Promise<{
    orderNumber: string;
    status: ApiOrderStatus;
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    totalAmount: number;
  }> {
    return request("/api/checkout/session/" + encodeURIComponent(sessionId));
  },
  async products(): Promise<PartView[]> {
    const products = await request<ApiProduct[]>("/api/products");
    return products.map(productToView);
  },
  async session(): Promise<AccountView | null> {
    try {
      const value = await request<ApiUser | { user: ApiUser }>("/api/auth/me");
      return userToView(unwrapUser(value));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  async login(email: string, password: string): Promise<AccountView> {
    const value = await request<ApiUser | { user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return userToView(unwrapUser(value));
  },
  logout: () => request<{ success?: boolean }>("/api/auth/logout", { method: "POST" }),
  async adminProducts(page = 1): Promise<PartView[]> {
    const products = await request<ApiProduct[]>("/api/admin/products?page=" + page + "&limit=25");
    return products.map(productToView);
  },
  async adminBuybacks(page = 1, status = ""): Promise<ApiBuybackRequest[]> {
    const query = new URLSearchParams({ page: String(page), limit: "25" });
    if (status) query.set("status", status);
    return request<ApiBuybackRequest[]>("/api/admin/buyback-requests?" + query.toString());
  },
  async updateBuyback(id: string, data: { status?: ApiBuybackStatus; adminNotes?: string | null }): Promise<ApiBuybackRequest> {
    return request<ApiBuybackRequest>("/api/admin/buyback-requests/" + id, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async adminUsers(page = 1): Promise<AccountView[]> {
    const users = await request<ApiUser[]>("/api/admin/users?page=" + page + "&limit=25");
    return users.map(userToView);
  },
  async adminOrders(page = 1): Promise<OrderView[]> {
    const orders = await request<ApiOrder[]>("/api/admin/orders?page=" + page + "&limit=25");
    return orders.map(orderToView);
  },
  async saveProduct(part: Partial<PartView>, id?: string): Promise<PartView> {
    if (!part.name || !part.description || !part.image) throw new Error("Nom, description et URL d’image sont requis.");
    const payload = {
      name: part.name,
      slug: slugify(part.name),
      description: part.description,
      shortDescription: part.condition || null,
      price: Math.round((part.price || 0) * 100),
      stock: Math.max(0, Math.trunc(part.stock || 0)),
      category: part.category || "Autre",
      brand: null,
      imageUrl: part.image,
      additionalImages: [],
      isActive: true,
    };
    const product = await request<ApiProduct>(id ? "/api/admin/products/" + id : "/api/admin/products", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    return productToView(product);
  },
  async deactivateProduct(id: string): Promise<void> {
    await request<ApiProduct>("/api/admin/products/" + id, { method: "DELETE" });
  },
  async updateOrderStatus(id: string, status: OrderView["status"]): Promise<void> {
    const statusMap: Record<OrderView["status"], ApiOrderStatus> = {
      en_attente: "PENDING",
      en_cours: "PROCESSING",
      "expédié": "SHIPPED",
      "livré": "DELIVERED",
      "annulée": "CANCELED",
    };
    await request<ApiOrder>("/api/admin/orders/" + id + "/status", {
      method: "PATCH",
      body: JSON.stringify({ status: statusMap[status] }),
    });
  },
  async updateUser(id: string, data: { role?: "admin" | "user"; isActive?: boolean }): Promise<AccountView> {
    const payload = {
      ...(data.role ? { role: data.role.toUpperCase() } : {}),
      ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
    };
    const user = await request<ApiUser>("/api/admin/users/" + id, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return userToView(user);
  },
  async deactivateUser(id: string): Promise<AccountView> {
    const user = await request<ApiUser>("/api/admin/users/" + id, {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
    return userToView(user);
  },
  async createUser(input: { name: string; email: string; password: string; role: "admin" | "user" }): Promise<AccountView> {
    const names = splitName(input.name);
    const user = await request<ApiUser>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ ...names, email: input.email, password: input.password, role: input.role.toUpperCase() }),
    });
    return userToView(user);
  },
};
