import { post } from '@/api/request';

import type { NewOrder, Order } from '@/types/order';

/**
 * This app's mock backend (dummyjson.com — see `api/axiosClient.ts`) has no
 * native "orders" resource, unlike `/products`. `/orders/add` is a
 * placeholder: point it at the real orders API once one exists. The
 * request/response shape here is the contract `OrderForm` and `useOrders`
 * are already built against, so wiring up the real endpoint later is a
 * one-line change in this file, not a rewrite of the form or the hook.
 */
export async function createOrder(input: NewOrder): Promise<Order> {
  return post<Order, NewOrder>('/orders/add', input);
}
