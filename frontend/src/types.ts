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
  customer_id: number;
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

export interface Order {
  id: number;
  customer_id: number;
  merchant_id: number;
  driver_id: number | null;
  zone_id: number;
  status: string;
  order_type: string;
  scheduled_delivery_time: string | null;
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
  items?: { id: number; name: string; quantity: number; price_per_unit: string }[];
}
