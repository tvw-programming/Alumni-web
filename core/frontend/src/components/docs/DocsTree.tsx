import { useMemo, useState } from 'react';
import { Box, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import SearchIcon from '@mui/icons-material/Search';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import { allGroupIds, docTree } from '../../data/docs';
import { fonts, tokens } from '../../theme';

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Left column of the documentation view: every markdown file, grouped by errand. */
export default function DocsTree({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const tree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docTree;
    return docTree
      .map((group) => ({
        ...group,
        children: (group.children ?? []).filter(
          (child) =>
            child.label.toLowerCase().includes(q) ||
            (child.content ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter((group) => (group.children ?? []).length > 0);
  }, [query]);

  const expanded = useMemo(() => (query ? tree.map((g) => g.id) : allGroupIds), [query, tree]);

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ p: 2, pb: 1.5, borderBottom: `1px solid ${tokens.rule}` }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Documentation
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the docs"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {tree.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
            Nothing matches “{query}”. Try a shorter term.
          </Typography>
        ) : (
          <SimpleTreeView
            key={expanded.join(',')}
            defaultExpandedItems={expanded}
            selectedItems={selectedId}
            onSelectedItemsChange={(_e: React.SyntheticEvent | null, id: string | null) => {
              if (id && !allGroupIds.includes(id)) onSelect(id);
            }}
            sx={{
              '& .MuiTreeItem-content': {
                borderRadius: 1,
                py: 0.5,
                '&.Mui-selected, &.Mui-selected.Mui-focused': {
                  bgcolor: alpha(tokens.signal, 0.13),
                  color: tokens.signal,
                },
                '&:hover': { bgcolor: tokens.panelRaised },
              },
              '& .MuiTreeItem-label': { fontSize: 13.5, fontFamily: fonts.ui },
            }}
          >
            {tree.map((group) => (
              <TreeItem
                key={group.id}
                itemId={group.id}
                label={
                  <Typography
                    sx={{
                      fontFamily: fonts.mono,
                      fontSize: 10.5,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      py: 0.25,
                    }}
                  >
                    {group.label}
                  </Typography>
                }
              >
                {(group.children ?? []).map((child) => (
                  <TreeItem
                    key={child.id}
                    itemId={child.id}
                    label={
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <ArticleIcon sx={{ fontSize: 14, opacity: 0.55 }} />
                        <span>{child.label}</span>
                      </Stack>
                    }
                  />
                ))}
              </TreeItem>
            ))}
          </SimpleTreeView>
        )}
      </Box>
    </Stack>
  );
}
