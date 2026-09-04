import CategoryIcon from '@mui/icons-material/Category';
import InsightsIcon from '@mui/icons-material/Insights';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';

import { QueryGate } from '@/components/feedback/QueryGate';
import { GenericCard } from '@/components/GenericCard';
import {
  GenericChart,
  type GenericChartPointEvent,
  type GenericChartSeries,
} from '@/components/GenericChart';
import { GenericPopup } from '@/components/GenericPopup';
import { useProducts } from '@/hooks/useProducts';
import { capitalize } from '@/utils/format';

import type { Product } from '@/types/product';

const DASHBOARD_FILTERS = { search: '', page: 0, pageSize: 100 } as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] as const;

interface DashboardChartMetadata {
  detail: string;
  source: string;
}

const REVENUE_SERIES: readonly GenericChartSeries<DashboardChartMetadata>[] = [
  {
    id: 'revenue-2025',
    name: '2025',
    type: 'line',
    data: [42, 48, 51, 47, 60, 66].map((y, index) => ({
      name: MONTHS[index],
      y,
      metadata: { detail: `2025 revenue for ${MONTHS[index]}`, source: 'Finance forecast' },
    })),
  },
  {
    id: 'revenue-2026',
    name: '2026',
    type: 'line',
    data: [50, 55, 61, 64, 72, 81].map((y, index) => ({
      name: MONTHS[index],
      y,
      metadata: { detail: `2026 revenue for ${MONTHS[index]}`, source: 'Finance actuals' },
    })),
  },
];

const MIXED_SERIES: readonly GenericChartSeries<DashboardChartMetadata>[] = [
  {
    id: 'orders',
    name: 'Orders',
    type: 'column',
    data: [34, 41, 39, 52, 58, 67].map((y, index) => ({
      name: MONTHS[index],
      y,
      metadata: { detail: `${y} orders in ${MONTHS[index]}`, source: 'Order service' },
    })),
  },
  {
    id: 'conversion',
    name: 'Conversion index',
    type: 'area',
    data: [29, 37, 42, 49, 55, 63].map((y, index) => ({
      name: MONTHS[index],
      y,
      metadata: { detail: `Conversion index ${y}`, source: 'Analytics service' },
    })),
  },
];

function categorySeries(
  products: readonly Product[],
): readonly GenericChartSeries<DashboardChartMetadata>[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }
  return [
    {
      id: 'product-categories',
      name: 'Products',
      type: 'bar',
      data: [...counts].map(([category, count]) => ({
        name: capitalize(category),
        y: count,
        metadata: { detail: `${count} products in ${capitalize(category)}`, source: 'Product API' },
      })),
    },
  ];
}

function stockSeries(
  products: readonly Product[],
): readonly GenericChartSeries<DashboardChartMetadata>[] {
  return [
    {
      id: 'product-stock',
      name: 'Stock',
      type: 'donut',
      data: [...products]
        .sort((left, right) => right.stock - left.stock)
        .slice(0, 5)
        .map((product) => ({
          id: String(product.id),
          name: product.title,
          y: product.stock,
          metadata: { detail: `${product.stock} units in stock`, source: product.category },
        })),
    },
  ];
}

interface ProductChartCardsProps {
  products: readonly Product[];
  onPointClick: (event: GenericChartPointEvent<DashboardChartMetadata>) => void;
  onOpenComposition: () => void;
}

function ProductChartCards({ products, onPointClick, onOpenComposition }: ProductChartCardsProps) {
  // Aggregation and sorting scale with API results and produce arrays passed to
  // the memoized chart adapter, making these appropriate useMemo targets.
  const categories = useMemo(() => categorySeries(products), [products]);
  const stock = useMemo(() => stockSeries(products), [products]);

  return (
    <>
      <GenericCard
        header={{
          title: 'Products per category',
          subtitle: 'Live product API data',
          icon: <CategoryIcon />,
        }}
        appearance={{ size: 'expanded' }}
      >
        <GenericChart
          series={categories}
          multiColor
          legend={{ visible: false }}
          yAxis={{ title: 'Products' }}
          interactive
          onPointClick={onPointClick}
        />
      </GenericCard>

      <GenericCard
        header={{
          title: 'Top products by stock',
          subtitle: 'Live inventory distribution',
          icon: <Inventory2OutlinedIcon />,
        }}
        appearance={{ size: 'expanded', surface: 'subtle' }}
        slots={{
          footer: (
            <Button endIcon={<OpenInNewIcon />} onClick={onOpenComposition}>
              Open card composition
            </Button>
          ),
        }}
      >
        <GenericChart
          series={stock}
          multiColor
          legend={{ position: 'right', toggleable: true }}
          interactive
          onPointClick={onPointClick}
          exportOptions={{ enabled: true, filename: 'top-product-stock', formats: ['png', 'csv'] }}
        />
      </GenericCard>
    </>
  );
}

type DashboardPopup = 'point' | 'composition' | null;

/** Protected dashboard composed from reusable Card, Chart, and Popup primitives. */
export function DashboardPage() {
  const productsQuery = useProducts(DASHBOARD_FILTERS);
  const [popup, setPopup] = useState<DashboardPopup>(null);
  const [selected, setSelected] = useState<GenericChartPointEvent<DashboardChartMetadata> | null>(
    null,
  );

  // GenericChart's adapter memo depends on this externally handled action.
  const handlePointClick = useCallback((event: GenericChartPointEvent<DashboardChartMetadata>) => {
    setSelected(event);
    setPopup('point');
  }, []);
  const openComposition = useCallback(() => setPopup('composition'), []);
  const closePopup = useCallback(() => setPopup(null), []);

  return (
    <Stack spacing={3} pb={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">Dashboard</Typography>
        <Typography color="text.secondary">
          Reusable, theme-aware charts. Select any data point to inspect the same typed data in a
          popup.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <GenericCard
          header={{
            title: 'Monthly revenue',
            subtitle: 'Year-over-year performance',
            icon: <ShowChartIcon />,
            badge: <Chip label="Interactive" size="small" color="primary" />,
          }}
          appearance={{ size: 'expanded', surface: 'glass' }}
          slots={{
            footer: (
              <Button variant="outlined" onClick={openComposition}>
                Open chart popup
              </Button>
            ),
          }}
        >
          <GenericChart
            series={REVENUE_SERIES}
            xAxis={{ categories: MONTHS }}
            yAxis={{ title: 'USD (k)' }}
            tooltip={{ valuePrefix: '$', valueSuffix: 'k' }}
            legend={{ toggleable: true }}
            interactive
            onPointClick={handlePointClick}
            exportOptions={{ enabled: true, filename: 'monthly-revenue' }}
          />
        </GenericCard>

        <GenericCard
          header={{
            title: 'Orders and conversion',
            subtitle: 'Mixed column + area combination',
            icon: <InsightsIcon />,
          }}
          appearance={{ size: 'expanded' }}
        >
          <GenericChart
            series={MIXED_SERIES}
            xAxis={{ categories: MONTHS }}
            thresholds={[{ value: 60, label: 'Target' }]}
            multiColor
            interactive
            onPointClick={handlePointClick}
          />
        </GenericCard>

        <QueryGate query={productsQuery} isEmpty={(data) => data.products.length === 0}>
          {(data) => (
            <ProductChartCards
              products={data.products}
              onPointClick={handlePointClick}
              onOpenComposition={openComposition}
            />
          )}
        </QueryGate>
      </Box>

      <GenericPopup
        open={popup === 'point'}
        onClose={closePopup}
        size="small"
        header={{
          title: selected
            ? `${selected.series.name}: ${selected.point.name ?? 'Data point'}`
            : 'Chart detail',
          description: 'Selected data is passed from GenericChart to this dashboard parent.',
        }}
        actions={{ confirmLabel: 'Done', onConfirm: closePopup, hideCancel: true }}
      >
        {selected && (
          <GenericCard
            header={{
              title: selected.point.name ?? selected.series.name,
              metric: selected.point.y,
              badge: <Chip label={selected.series.type} size="small" />,
              description: selected.point.metadata?.detail,
            }}
            appearance={{ surface: 'subtle' }}
          >
            <Typography variant="body2" color="text.secondary">
              Source: {selected.point.metadata?.source}
            </Typography>
          </GenericCard>
        )}
      </GenericPopup>

      <GenericPopup
        open={popup === 'composition'}
        onClose={closePopup}
        size="large"
        header={{
          title: 'Dashboard composition',
          description: 'The parent combines GenericChart and GenericCard inside GenericPopup.',
        }}
        actions={{ confirmLabel: 'Close', onConfirm: closePopup, hideCancel: true }}
        stickyFooter
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(220px, 1fr)' },
            gap: 2,
          }}
        >
          <GenericCard header={{ title: 'Revenue comparison' }} appearance={{ size: 'expanded' }}>
            <GenericChart
              series={REVENUE_SERIES.slice(1)}
              xAxis={{ categories: MONTHS }}
              comparison={{ mode: 'percent', baseline: 'previous' }}
              yAxis={{ title: 'Month-over-month' }}
              legend={{ visible: false }}
              multiColor={false}
            />
          </GenericCard>
          <Stack spacing={2}>
            <GenericCard
              header={{
                title: 'Latest revenue',
                metric: '$81k',
                badge: <Chip label="+12.5%" color="success" size="small" />,
              }}
              appearance={{ surface: 'accent' }}
            >
              June 2026 performance
            </GenericCard>
            <GenericCard
              header={{ title: 'Target status', metric: 'Met', description: '$3k above target' }}
              appearance={{ surface: 'subtle' }}
            />
          </Stack>
        </Box>
      </GenericPopup>
    </Stack>
  );
}
