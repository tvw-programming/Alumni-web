/**
 * Branded identifiers.
 *
 * Every id is a string at runtime, which means a `UserId` and a `ProductId` are
 * interchangeable to the compiler unless something distinguishes them. The
 * brand is a phantom property — it exists only in the type system and costs
 * nothing at runtime — so passing a `ProductId` where a `UserId` belongs
 * becomes a compile error instead of a lookup that silently returns nothing.
 */

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type VariantId = Brand<string, 'VariantId'>;
export type CartItemId = Brand<string, 'CartItemId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type AppointmentId = Brand<string, 'AppointmentId'>;
export type SlotId = Brand<string, 'SlotId'>;
export type PostId = Brand<string, 'PostId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type TaskId = Brand<string, 'TaskId'>;
export type DeviceId = Brand<string, 'DeviceId'>;
export type BookingId = Brand<string, 'BookingId'>;
export type ContentId = Brand<string, 'ContentId'>;
export type WorkoutId = Brand<string, 'WorkoutId'>;

/**
 * The one place a raw string becomes a branded id.
 *
 * Casting is unavoidable at the boundary — the value really does arrive as a
 * plain string — so it happens here, once, rather than at every call site where
 * it would stop being reviewable.
 */
export function asId<T extends string>(value: string): T {
  return value as T;
}
