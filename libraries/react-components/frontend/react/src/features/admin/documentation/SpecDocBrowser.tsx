import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { TreeNav, type TreeNode } from '@/components/TreeNav/TreeNav';

import { MarkdownView } from './MarkdownView';
import { ancestorsOf, flattenFiles, type SpecNode } from './specDocTypes';
import { findSet, useSpecDocument, useSpecManifest } from './useSpecDocs';

interface SpecDocBrowserProps {
  /** Manifest set to browse: `ui` or `api`. */
  setId: string;
  title: string;
  description: string;
}

/** Case-insensitive filter that keeps a folder when any descendant matches. */
function filterTree(nodes: readonly SpecNode[], needle: string): SpecNode[] {
  if (!needle) return [...nodes];
  return nodes.flatMap<SpecNode>((node) => {
    if (node.type === 'file') {
      const haystack = `${node.title} ${node.name} ${node.path}`.toLowerCase();
      return haystack.includes(needle) ? [node] : [];
    }
    const children = filterTree(node.children, needle);
    return children.length > 0 ? [{ ...node, children }] : [];
  });
}

/**
 * The manifest's shape, in the shared tree's terms.
 *
 * The mapping is the price of `TreeNav` not knowing what a specification is —
 * and that ignorance is what let the component gallery reuse it unchanged.
 */
function toTreeNodes(nodes: readonly SpecNode[]): TreeNode[] {
  return nodes.map((node) =>
    node.type === 'folder'
      ? {
          type: 'branch',
          id: node.path,
          label: node.name,
          icon: <FolderOpenIcon fontSize="small" />,
          children: toTreeNodes(node.children),
        }
      : {
          type: 'leaf',
          id: node.path,
          label: node.title,
          caption: node.name,
          icon: <ArticleOutlinedIcon fontSize="small" />,
        },
  );
}

function collectFolderPaths(nodes: readonly SpecNode[]): string[] {
  return nodes.flatMap((node) =>
    node.type === 'folder' ? [node.path, ...collectFolderPaths(node.children)] : [],
  );
}

/**
 * The specification browser: folder tree on the left, document on the right.
 *
 * The same split as Manage Product (inline edit) — a narrow navigator beside a
 * wide working area — but weighted further towards the content, because reading
 * a specification is the whole task here.
 *
 * The selected document lives in the URL (`?doc=auth/auth-service.md`), so a
 * specification can be linked to, bookmarked and shared. That is the reason it
 * is a search param rather than component state.
 */
export function SpecDocBrowser({ setId, title, description }: SpecDocBrowserProps) {
  const manifestQuery = useSpecManifest();
  const [searchParams, setSearchParams] = useSearchParams();
  /**
   * Folders the reader has explicitly opened or closed.
   *
   * Only *overrides* live in state. Which folders are open is derived below
   * from these plus the selection, so opening the tree to a deep link needs no
   * effect writing back into state — and a folder the reader deliberately
   * closed stays closed even though it is on the path to the open document.
   */
  const [folderOverrides, setFolderOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [search, setSearch] = useState('');

  const set = findSet(manifestQuery.data, setId);
  const files = useMemo(() => (set ? flattenFiles(set.tree) : []), [set]);

  const requested = searchParams.get('doc');
  // Fall back to the first document rather than an empty pane, and ignore a
  // stale `?doc=` that no longer exists.
  const selectedPath = useMemo(() => {
    if (files.length === 0) return null;
    if (requested && files.some((file) => file.path === requested)) return requested;
    return files[0].path;
  }, [files, requested]);

  const documentQuery = useSpecDocument(setId, selectedPath);

  const needle = search.trim().toLowerCase();
  const visibleTree = useMemo(() => (set ? filterTree(set.tree, needle) : []), [set, needle]);

  const openFolders = useMemo(() => {
    // While filtering, every surviving branch is open — a match hidden inside a
    // collapsed folder looks like no match at all.
    if (needle) return new Set(collectFolderPaths(visibleTree));

    const open = new Set(selectedPath ? ancestorsOf(selectedPath) : []);
    for (const [path, isOpen] of folderOverrides) {
      if (isOpen) open.add(path);
      else open.delete(path);
    }
    return open;
  }, [needle, visibleTree, selectedPath, folderOverrides]);

  const handleToggleFolder = useCallback(
    (path: string) => {
      // The override records the opposite of what is on screen, not of what is
      // in the map — a folder opened only because it holds the selection has no
      // entry yet, and clicking it must close it.
      setFolderOverrides((current) => new Map(current).set(path, !openFolders.has(path)));
    },
    [openFolders],
  );

  const folderPaths = useMemo(() => (set ? collectFolderPaths(set.tree) : []), [set]);
  const allExpanded = folderPaths.length > 0 && folderPaths.every((path) => openFolders.has(path));

  const handleToggleAll = useCallback(() => {
    // Every folder gets an explicit override, including the ancestors of the
    // selected document — otherwise "collapse all" would leave those open,
    // since they are open by derivation rather than by choice.
    const next = !allExpanded;
    setFolderOverrides(new Map(folderPaths.map((path) => [path, next])));
  }, [allExpanded, folderPaths]);

  const handleSelectFile = useCallback(
    (path: string) => {
      // `replace` so browsing documents does not fill the back stack.
      setSearchParams({ doc: path }, { replace: true });
    },
    [setSearchParams],
  );

  const activeFile = files.find((file) => file.path === selectedPath);

  return (
    /*
     * Fills the height the documentation section gives it — the viewport minus
     * the admin app bar, near enough 98vh — so each column scrolls its own
     * content. A hard-coded viewport fraction was 22px out at this window size,
     * which is the kind of thing that only shows up on one screen.
     */
    <Stack spacing={2} sx={{ height: { md: '100%' }, minHeight: 0 }}>
      <Box>
        <Typography variant="h5">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>

      {manifestQuery.isError && (
        <Alert severity="error">
          The specification manifest could not be loaded. Run <code>pnpm dev</code> or{' '}
          <code>pnpm build</code> — both regenerate it from the <code>specDoc</code> folders.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          // The navigator is fixed and the content takes the rest, so a long
          // title cannot squeeze the reading column.
          gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' },
          gap: 2,
          flexGrow: { md: 1 },
          minHeight: 0,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            // Matches the reading pane, so the two columns line up and the tree
            // scrolls inside itself rather than growing the page.
            height: { md: '100%' },
            maxHeight: { xs: '60vh', md: 'none' },
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 1.5, pb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter documents"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
              {set && (
                <Chip
                  size="small"
                  label={`${String(set.fileCount)} documents`}
                  variant="outlined"
                />
              )}
              <Box sx={{ flexGrow: 1 }} />
              {/*
                One button, not two. Its meaning follows what is on screen: with
                anything open it collapses, otherwise it expands — so the icon
                always shows the action, never the current state.
              */}
              <Tooltip title={allExpanded ? 'Collapse all folders' : 'Expand all folders'}>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleToggleAll}
                    disabled={Boolean(needle) || folderPaths.length === 0}
                    aria-label={allExpanded ? 'Collapse all folders' : 'Expand all folders'}
                    aria-expanded={allExpanded}
                  >
                    {allExpanded ? (
                      <UnfoldLessIcon fontSize="small" />
                    ) : (
                      <UnfoldMoreIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>

          <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', pb: 1 }}>
            {manifestQuery.isPending ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={22} />
              </Box>
            ) : visibleTree.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No document matches “{search}”.
              </Typography>
            ) : (
              <TreeNav
                nodes={toTreeNodes(visibleTree)}
                selectedId={selectedPath}
                openIds={openFolders}
                onToggle={handleToggleFolder}
                onSelect={handleSelectFile}
              />
            )}
          </Box>
        </Paper>

        {/*
          A fixed-height reading pane that scrolls its own content in both
          directions. `auto` rather than `scroll` so the bars appear only when
          something actually overflows — a wide code block or a wide table.
        */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, md: 4 },
            height: { md: '100%' },
            minHeight: { xs: 400, md: 0 },
            overflowX: 'auto',
            overflowY: 'auto',
          }}
        >
          {activeFile && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
              <Chip size="small" label={activeFile.path} variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                {(activeFile.bytes / 1024).toFixed(1)} KB
              </Typography>
            </Stack>
          )}

          {documentQuery.isPending && selectedPath !== null && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {documentQuery.isError && (
            <Alert severity="error">That document could not be loaded.</Alert>
          )}

          {documentQuery.data && <MarkdownView doc={documentQuery.data} />}

          {selectedPath === null && !manifestQuery.isPending && (
            <Typography color="text.secondary">No documents in this set yet.</Typography>
          )}
        </Paper>
      </Box>
    </Stack>
  );
}
