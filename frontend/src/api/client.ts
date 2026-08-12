import axios from 'axios';
import type { Merchant, MerchantWithMenu, Zone, Order, OrderPayload, Driver, DriverOrder, Delivery } from '../types';

const baseURL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const client = axios.create({ baseURL });

export async function getMerchants(): Promise<Merchant[]> {
  const res = await client.get('/merchants');
  return res.data;
}

export async function getMerchant(id: string | number): Promise<MerchantWithMenu> {
  const res = await client.get(`/merchants/${id}`);
  return res.data;
}

export async function getZones(): Promise<Zone[]> {
  const res = await client.get('/zones');
  return res.data;
}

export async function createOrder(payload: OrderPayload): Promise<Order> {
  const res = await client.post('/orders', payload);
  return res.data;
}

export async function getOrder(id: string | number): Promise<Order> {
  const res = await client.get(`/orders/${id}`);
  return res.data;
}

export async function createPaymentIntent(order_id: number, amount: number) {
  const res = await client.post('/payments/intent', { order_id, amount });
  return res.data;
}

export async function getDrivers(): Promise<Driver[]> {
  const res = await client.get('/drivers');
  return res.data;
}

export async function getDriver(id: string | number): Promise<Driver> {
  const res = await client.get(`/drivers/${id}`);
  return res.data;
}

export async function setDriverAvailability(id: number, availability_status: Driver['availability_status']): Promise<Driver> {
  const res = await client.patch(`/drivers/${id}/availability`, { availability_status });
  return res.data;
}

export async function setDriverCoolerKit(id: number, cooler_kit_status: boolean): Promise<Driver> {
  const res = await client.patch(`/drivers/${id}/cooler-kit`, { cooler_kit_status });
  return res.data;
}

export async function getAvailableOrders(driverId: number): Promise<DriverOrder[]> {
  const res = await client.get(`/drivers/${driverId}/available-orders`);
  return res.data;
}

export async function getActiveOrder(driverId: number): Promise<DriverOrder | null> {
  const res = await client.get(`/drivers/${driverId}/active-order`);
  return res.data;
}

export async function getDriverDeliveries(driverId: number): Promise<{ deliveries: Delivery[]; earnings: number }> {
  const res = await client.get(`/drivers/${driverId}/deliveries`);
  return res.data;
}

export async function acceptOrder(driverId: number, orderId: number): Promise<Order> {
  const res = await client.post(`/drivers/${driverId}/accept-order/${orderId}`);
  return res.data;
}

export async function declineOrder(driverId: number, orderId: number): Promise<void> {
  await client.post(`/drivers/${driverId}/decline-order/${orderId}`);
}

export async function updateOrderStatus(orderId: number, status: string): Promise<Order> {
  const res = await client.patch(`/orders/${orderId}/status`, { status });
  return res.data;
}

export async function submitDeliveryProof(
  orderId: number,
  payload: { proof_type: 'photo' | 'signature' | 'gps'; latitude?: number; longitude?: number; driver_id: number }
): Promise<Order> {
  const res = await client.post(`/orders/${orderId}/delivery-proof`, payload);
  return res.data;
}
