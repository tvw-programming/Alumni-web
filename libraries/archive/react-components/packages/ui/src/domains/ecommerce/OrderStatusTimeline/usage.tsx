import { OrderStatusTimeline, type OrderStep } from './OrderStatusTimeline';
import sample from './sample.json';

export function OrderStatusTimelineUsage() {
  // Progress is server-authoritative: never predicted, never advanced locally.
  // Poll or subscribe; a delivery step is not something the client can decide.
  const steps = sample.steps as OrderStep[];
  return <OrderStatusTimeline steps={steps} orientation="vertical" />;
}
