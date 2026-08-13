import { z } from 'zod';

const phone = z.string().trim().min(1).max(20);
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const password = z.string().min(8).max(200);
const email = z.string().trim().toLowerCase().email().max(255);

export const registerCustomerSchema = z.object({
  email,
  password,
  full_name: z.string().trim().min(1).max(255),
  phone: phone.optional(),
});

export const registerDriverSchema = z.object({
  email,
  password,
  full_name: z.string().trim().min(1).max(255),
  phone: phone.optional(),
  license_number: z.string().trim().min(1).max(50),
});

export const registerMerchantSchema = z.object({
  email,
  password,
  full_name: z.string().trim().min(1).max(255),
  phone: phone.optional(),
  business_name: z.string().trim().min(1).max(255),
  category: z.enum(['restaurant', 'grocery', 'convenience', 'provisioning']),
  hours_open: z.string().max(10).optional(),
  hours_close: z.string().max(10).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const createOrderSchema = z.object({
  merchant_id: z.number().int().positive(),
  zone_id: z.number().int().positive(),
  pin_latitude: latitude,
  pin_longitude: longitude,
  delivery_notes: z.string().max(1000).optional().default(''),
  gate_code: z.string().max(50).optional().default(''),
  villa_building_name: z.string().max(100).optional().default(''),
  villa_unit: z.string().max(50).optional().default(''),
  landmark: z.string().max(255).optional().default(''),
  contact_phone: phone,
  substitution_policy: z.enum(['exact_only', 'customer_approval_required', 'shopper_discretion']),
  order_type: z.enum(['on_demand', 'scheduled']),
  scheduled_delivery_time: z.string().max(30).nullable().optional(),
  tip: z.number().min(0).max(1000).optional().default(0),
  order_items: z.array(
    z.object({
      menu_item_id: z.number().int().positive(),
      quantity: z.number().int().min(1).max(50),
    })
  ).min(1).max(100),
});

export const paymentIntentSchema = z.object({
  order_id: z.number().int().positive(),
  amount: z.number().positive().max(100000),
});

export const refundSchema = z.object({
  refund_reason: z.string().trim().min(1).max(1000),
});

export const supportTicketSchema = z.object({
  order_id: z.number().int().positive(),
  issue_type: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
});

export const zoneSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  base_delivery_fee: z.number().min(0).max(1000).optional(),
  service_level: z.enum(['standard', 'priority', 'scheduled_only']).optional(),
  min_order_value: z.number().min(0).max(10000).optional(),
  max_delivery_time_minutes: z.number().int().min(1).max(1440).optional(),
  is_active: z.boolean().optional(),
});

export const createZoneSchema = z.object({
  name: z.string().trim().min(1).max(100),
  base_delivery_fee: z.number().min(0).max(1000),
  service_level: z.enum(['standard', 'priority', 'scheduled_only']),
  min_order_value: z.number().min(0).max(10000),
  max_delivery_time_minutes: z.number().int().min(1).max(1440),
});
