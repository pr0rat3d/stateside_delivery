import axios from 'axios';
import type { Merchant, MerchantWithMenu, Zone, Order, OrderPayload } from '../types';

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
