import { DomainIcon } from '@idol-ui/react';
import SearchIcon from '@mui/icons-material/Search';
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { TreeNav, type TreeNode } from '@/components/TreeNav/TreeNav';

import { componentsOf, domainsOf, useDomainCatalogue } from './useDomainCatalogue';

const ROUTE = '/admin/master-data/domain-components';

/**
 * The domain-wise component tree, rendered inside the Master Data sidebar.
 *
 * This is the *navigation* for the component library, which is why it lives in
 * the sidebar rather than inside the page: a tree that only appears after you
 * have already navigated somewhere is a table of contents printed on page 40.
 *
 * Selection lives in the URL (`?component=ecommerce/ProductCard`), so the
 * sidebar, the page and a shared link all read the same source — and the page
 * itself holds no navigation state at all.
 *
 * Deliberately **no ordinal gutter**. The numbered list above it is the one the
 * speech layer addresses by position; adding 99 more numbered rows would make
 * "open the fourth menu" ambiguous.
 */
export function DomainComponentTree({ onNavigate }: { onNavigate?: () => void }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [branchOverrides, setBranchOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());

  const needle = search.trim().toLowerCase();
  /*
   * Fetched, not bundled. The tree renders in the Master Data sidebar — on
   * every page in the section — and the catalogue it used to import inlined
   * every component's source and README into the bundle. See
   * `useDomainCatalogue`.
   */
  const catalogue = useDomainCatalogue();
  const domains = useMemo(() => domainsOf(catalogue.data), [catalogue.data]);
  const components = useMemo(() => componentsOf(catalogue.data), [catalogue.data]);

  const nodes = useMemo<TreeNode[]>(
    () =>
      domains
        .map((domain) => ({
          domain,
          components: components.filter(
            (entry) =>
              entry.domainId === domain.id &&
              (needle === '' ||
                entry.name.toLowerCase().includes(needle) ||
                entry.summary.toLowerCase().includes(needle) ||
                domain.label.toLowerCase().includes(needle)),
          ),
        }))
        .filter(({ components }) => components.length > 0)
        .map(({ domain, components }) => ({
          type: 'branch' as const,
          id: domain.id,
          label: domain.label,
          caption: `${String(components.length)} component${components.length === 1 ? '' : 's'}`,
          // The domain's own icon, so a branch is recognisable before it is read.
          icon: <DomainIcon domain={domain.id} />,
          children: components.map((entry) => ({
            type: 'leaf' as const,
            id: entry.id,
            label: entry.name,
            icon: <WidgetsOutlinedIcon fontSize="small" />,
          })),
        })),
    [domains, components, needle],
  );

  // Only highlighted while the gallery route is open. A selection shown while
  // the user is on Manage Product would be pointing at a page they cannot see.
  const onGallery = location.pathname === ROUTE;
  const requested = searchParams.get('component');
  const selectedId = onGallery
    ? requested !== null && components.some((entry) => entry.id === requested)
      ? requested
      : (components[0]?.id ?? null)
    : null;

  const openIds = useMemo(() => {
    // While filtering, every surviving domain is open — a match inside a
    // collapsed branch looks like no match at all.
    if (needle) return new Set(nodes.map((node) => node.id));

    const open = new Set(selectedId === null ? [] : [selectedId.split('/')[0]]);
    for (const [id, isOpen] of branchOverrides) {
      if (isOpen) open.add(id);
      else open.delete(id);
    }
    return open;
  }, [needle, nodes, selectedId, branchOverrides]);

  const handleToggle = useCallback(
    (id: string) => {
      setBranchOverrides((current) => new Map(current).set(id, !openIds.has(id)));
    },
    [openIds],
  );

  const handleSelect = useCallback(
    (id: string) => {
      // `replace` while already in the gallery so browsing components does not
      // fill the back stack; a real push when arriving from another page, so
      // Back returns there.
      void navigate(`${ROUTE}?component=${encodeURIComponent(id)}`, { replace: onGallery });
      onNavigate?.();
    },
    [navigate, onGallery, onNavigate],
  );

  return (
    <Box sx={{ pb: 2 }}>
      <Divider sx={{ my: 1 }} />

      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 2, display: 'block' }}
        id="domain-components-heading"
      >
        {/* No count until the catalogue lands, rather than a confident "0". */}
        {components.length === 0
          ? 'Domain components'
          : `Domain components · ${String(components.length)}`}
      </Typography>

      <Box sx={{ px: 1.5, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Filter"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {nodes.length === 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
          {`No component matches “${search}”.`}
        </Typography>
      ) : (
        <Box aria-labelledby="domain-components-heading">
          <TreeNav
            nodes={nodes}
            selectedId={selectedId}
            openIds={openIds}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
        </Box>
      )}
    </Box>
  );
}
