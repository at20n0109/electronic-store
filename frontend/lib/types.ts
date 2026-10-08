export type Category = {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  _count?: { products: number };
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  sortOrder: number;
};

export type ProductSpecs = Record<string, string>;

export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  specs: ProductSpecs | null;
  price: number;
  stock: number;
  status: 'ACTIVE' | 'DRAFT' | 'HIDDEN';
  category: Pick<Category, 'id' | 'name' | 'slug'> | null;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
};

export type PcBuildSlot =
  | 'cpu'
  | 'gpu'
  | 'mainboard'
  | 'ram'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooling';

export type PcBuildItem = {
  slot: PcBuildSlot;
  sortOrder: number;
  product: Product;
};

export type PcBuild = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  budget: number;
  tier: number;
  sortOrder: number;
  total: number;
  remaining: number;
  items: PcBuildItem[];
};

export type PcBuildDetail = PcBuild & {
  alternatives: Partial<Record<string, Product[]>>;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AuthRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: AuthRole;
  phone?: string | null;
  phoneVerified?: boolean;
  avatarUrl?: string | null;
  authProvider?: string;
};

export type SocialMethod = {
  provider: 'google' | 'facebook' | 'apple';
  label: string;
  ready: boolean;
};

export type AuthMethods = {
  social: SocialMethod[];
  phone: boolean;
};

export type AuthResult = {
  user: SessionUser;
  accessToken?: string;
};

export type RegisterFields = {
  email: string;
  password: string;
  name?: string;
};

export type LoginFields = {
  email: string;
  password: string;
};

export type CartProduct = Pick<
  Product,
  'id' | 'slug' | 'name' | 'price' | 'images' | 'stock'
>;

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  product?: Pick<Product, 'id' | 'name' | 'images'>;
};

export type Payment = {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl?: string | null;
  clientSecret?: string | null;
  transactionId?: string | null;
  createdAt: string;
};

export type Invoice = {
  id: string;
  orderId: string;
  number: string;
  fileUrl?: string | null;
  issuedAt: string;
  paidAt?: string | null;
  qrDataUrl?: string | null;
};

export type Order = {
  id: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  subtotal: number;
  shipping: number;
  total: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  note?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment?: Payment | null;
  invoice?: Invoice | null;
};
