export interface Merchant {
  id: number;
  business_name: string;
  category: 'restaurant' | 'grocery' | 'convenience' | 'provisioning';
  phone: string | null;
  hours_open: string | null;
  hours_close: string | null;
  commission_percent: string;
  is_active: boolean;
}

export interface MenuItem {
  id: number;
  merchant_id: number;
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  is_available: boolean;
  is_cold_item: boolean;
  allergen_info: string | null;
}

export interface MerchantWithMenu extends Merchant {
  menu_items: MenuItem[];
}

export interface Zone {
  id: number;
  name: string;
  base_delivery_fee: string;
  service_level: 'standard' | 'priority' | 'scheduled_only';
  max_delivery_time_minutes: number;
  min_order_value: string;
  is_active?: boolean;
}

export interface CartItem {
  menu_item_id: number;
  name: string;
  price_per_unit: number;
  quantity: number;
  is_cold_item: boolean;
}

export type SubstitutionPolicy = 'exact_only' | 'customer_approval_required' | 'shopper_discretion';

export interface OrderPayload {
  merchant_id: number;
  zone_id: number;
  pin_latitude: number;
  pin_longitude: number;
  delivery_notes: string;
  gate_code: string;
  villa_building_name: string;
  villa_unit: string;
  landmark: string;
  contact_phone: string;
  substitution_policy: SubstitutionPolicy;
  order_type: 'on_demand' | 'scheduled';
  scheduled_delivery_time: string | null;
  tip: number;
  order_items: { menu_item_id: number; name: string; quantity: number; price_per_unit: number }[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  price_per_unit: string;
  substitution_status: 'none' | 'awaiting_approval' | 'approved' | 'refunded';
  substitution_notes: string | null;
}

export interface Order {
  id: number;
  customer_id: number;
  merchant_id: number;
  driver_id: number | null;
  zone_id: number;
  status: string;
  order_type: string;
  scheduled_delivery_time: string | null;
  estimated_ready_time?: string | null;
  pin_latitude: string;
  pin_longitude: string;
  delivery_notes: string | null;
  gate_code: string | null;
  villa_building_name: string | null;
  villa_unit: string | null;
  landmark: string | null;
  contact_phone: string | null;
  substitution_policy: string;
  subtotal: string;
  delivery_fee: string;
  service_fee: string;
  tax: string;
  tip: string;
  total: string;
  created_at: string;
  delivered_at?: string | null;
  items?: OrderItem[];
  customer_name?: string;
  merchant_name?: string;
  driver_name?: string | null;
}

export interface Driver {
  id: number;
  full_name: string;
  phone: string | null;
  availability_status: 'offline' | 'online' | 'on_delivery' | 'on_break';
  cooler_kit_status: boolean;
  total_deliveries: number;
  avg_rating: string | null;
}

export interface DriverOrder extends Order {
  merchant_name: string;
  merchant_address: string | null;
  customer_name: string;
  has_cold_items: boolean;
}

export interface Delivery {
  id: number;
  total: string;
  delivery_fee: string;
  tip: string;
  delivered_at: string;
  merchant_name: string;
}

export interface MerchantOrderSummary {
  id: number;
  status: string;
  total: string;
  order_type: string;
  scheduled_delivery_time: string | null;
  estimated_ready_time: string | null;
  driver_id: number | null;
  driver_name: string | null;
  customer_name: string;
  created_at: string;
  has_pending_substitution: boolean;
}

export interface MerchantOrderFeed {
  incoming: MerchantOrderSummary[];
  in_progress: MerchantOrderSummary[];
}

export interface MerchantHistoryOrder {
  id: number;
  status: string;
  subtotal: string;
  total: string;
  delivered_at: string | null;
  customer_name: string;
}

export interface MerchantHistory {
  orders: MerchantHistoryOrder[];
  summary: {
    delivered_count: number;
    gross_subtotal: number;
    commission_percent: number;
    net_revenue: number;
  };
}

export interface AdminOrder {
  id: number;
  status: string;
  total: string;
  estimated_ready_time: string | null;
  scheduled_delivery_time: string | null;
  order_type: string;
  customer_name: string;
  merchant_name: string;
  driver_id: number | null;
  driver_name: string | null;
  pin_latitude: string;
  pin_longitude: string;
  created_at: string;
  has_cold_items: boolean;
}

export interface AdminDriver {
  id: number;
  full_name: string;
  phone: string | null;
  email: string;
  availability_status: Driver['availability_status'];
  cooler_kit_status: boolean;
  is_active: boolean;
  license_verified: boolean;
  insurance_verified: boolean;
  total_deliveries: number;
  avg_rating: string | null;
  lifetime_earnings: string;
}

export interface AdminMerchant extends Merchant {
  delivered_orders: string;
}

export interface Report {
  orders_per_day: { day: string; order_count: string }[];
  delivery_time_by_cold_chain: { has_cold_items: boolean; avg_minutes: string | null; delivered_count: string }[];
  repeat_customers: number;
  total_customers: number;
  driver_utilization: { id: number; full_name: string; availability_status: string; deliveries_last_14_days: string }[];
}

export type Role = 'customer' | 'driver' | 'merchant' | 'admin';

export interface AuthResponse {
  token: string;
  role: Role;
  full_name: string;
  customer_id?: number;
  driver_id?: number;
  merchant_id?: number;
  message?: string;
}

export interface SupportTicket {
  id: number;
  order_id: number | null;
  customer_id: number;
  issue_type: string;
  description: string;
  resolution: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  customer_name: string;
  order_total: string | null;
  merchant_name: string | null;
}
