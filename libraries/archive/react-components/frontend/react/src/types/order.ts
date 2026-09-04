export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

export interface Order {
  id: number;
  orderId: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
}

export interface NewOrder {
  orderId: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
}

export const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered'];
