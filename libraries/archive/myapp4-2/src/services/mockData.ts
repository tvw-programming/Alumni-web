import type { Order, OrderStatus, Product } from './types';

const CATEGORIES = ['Audio', 'Wearables', 'Home', 'Cameras', 'Gaming'] as const;

const NAMES = [
  'Aurora Headphones', 'Nimbus Earbuds', 'Vertex Smartwatch', 'Halo Fitness Band',
  'Lumen Desk Lamp', 'Cascade Air Purifier', 'Prism Action Camera', 'Orbit 4K Drone',
  'Pulse Controller', 'Vector Mechanical Keyboard', 'Echo Soundbar', 'Solstice Speaker',
  'Meridian Router', 'Atlas Power Bank', 'Zenith Monitor', 'Cobalt Webcam',
  'Drift Turntable', 'Ember Kettle', 'Flux Charger', 'Grove Humidifier',
  'Harbour Bookshelf Speaker', 'Ion Air Fryer', 'Jetstream Fan', 'Kestrel Tripod',
];

const DESCRIPTIONS = [
  'Tuned for long listening sessions, with adaptive noise control.',
  'Seven-day battery, water resistant, and genuinely comfortable.',
  'A quiet, efficient design that disappears into the room.',
  'Built for travel — light, tough, and quick to set up.',
];

export const PRODUCT_CATEGORIES = CATEGORIES;

export const PRODUCTS: Product[] = NAMES.map((name, i) => ({
  id: `p-${i + 1}`,
  name,
  category: CATEGORIES[i % CATEGORIES.length] as string,
  priceMinor: (2999 + ((i * 1737) % 45000)) * 100,
  currency: 'INR',
  rating: Math.round((3 + ((i * 7) % 20) / 10) * 2) / 2,
  ratingCount: 12 + ((i * 53) % 900),
  inStock: i % 7 !== 0,
  description: DESCRIPTIONS[i % DESCRIPTIONS.length] as string,
}));

const STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'failed', 'refunded'];

export const ORDERS: Order[] = Array.from({ length: 18 }, (_, i) => {
  const product = PRODUCTS[i % PRODUCTS.length] as Product;
  const quantity = (i % 3) + 1;
  return {
    id: `o-${i + 1}`,
    reference: `ORD-${(48219 + i * 7).toString()}`,
    status: STATUSES[i % STATUSES.length] as OrderStatus,
    totalMinor: product.priceMinor * quantity,
    currency: 'INR',
    placedAt: new Date(Date.now() - i * 36 * 3600 * 1000).toISOString(),
    items: [{ productId: product.id, name: product.name, quantity, priceMinor: product.priceMinor }],
  };
});
