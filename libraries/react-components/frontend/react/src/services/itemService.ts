import { goApiClient } from '@/api/goApiClient';
import { get } from '@/api/request';

import type { Item } from '@/types/item';

/** `GET /api/items` on the Go Fiber service — see api/internal/handler/item_handler.go. */
export async function fetchItems(signal?: AbortSignal): Promise<Item[]> {
  return get<Item[]>('/items', { client: goApiClient, signal });
}
