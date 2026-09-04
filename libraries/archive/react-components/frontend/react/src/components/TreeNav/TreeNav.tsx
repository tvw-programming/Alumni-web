import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { memo, type ReactNode } from 'react';

/** A selectable item. `id` is what `onSelect` reports and what `selectedId` matches. */
export interface TreeLeaf {
  type: 'leaf';
  id: string;
  label: string;
  /** Second line — a filename, a summary, a count. */
  caption?: string;
  icon?: ReactNode;
}

export interface TreeBranch {
  type: 'branch';
  id: string;
  label: string;
  caption?: string;
  icon?: ReactNode;
  children: TreeNode[];
}

export type TreeNode = TreeLeaf | TreeBranch;

export interface TreeNavProps {
  nodes: readonly TreeNode[];
  selectedId: string | null;
  openIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  depth?: number;
}

/**
 * A two-level-plus navigator for anything that is grouped.
 *
 * Generalised out of the specification browser, which needed exactly this and
 * had it welded to a `specDoc/` node shape. The grouping *is* information in
 * both cases — which layer a document describes, which domain a component
 * belongs to — so a flat list would throw away the useful half.
 *
 * Open and selected state live with the caller, so the tree is a pure function
 * of its props and a page can open it to a deep link.
 */
export const TreeNav = memo(function TreeNav({
  nodes,
  selectedId,
  openIds,
  onToggle,
  onSelect,
  depth = 0,
}: TreeNavProps) {
  return (
    <List
      dense
      disablePadding
      /*
       * `ul` at every level, not `div` when nested.
       *
       * A nested level renders inside the parent's `li`, and `li > div > li` is
       * invalid HTML — React reports a hydration error for it. `ul` inside `li`
       * is exactly how nested lists are meant to be expressed.
       */
      component="ul"
      role={depth === 0 ? 'tree' : 'group'}
    >
      {nodes.map((node) => {
        if (node.type === 'branch') {
          const open = openIds.has(node.id);
          return (
            <Box key={node.id} component="li" sx={{ listStyle: 'none' }}>
              <ListItemButton
                onClick={() => {
                  onToggle(node.id);
                }}
                aria-expanded={open}
                sx={{ pl: 1.5 + depth * 1.5 }}
              >
                {node.icon ? <ListItemIcon sx={{ minWidth: 30 }}>{node.icon}</ListItemIcon> : null}
                <ListItemText
                  primary={node.label}
                  secondary={node.caption}
                  slotProps={{
                    primary: { variant: 'body2', fontWeight: 600 },
                    secondary: { variant: 'caption' },
                  }}
                />
                {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </ListItemButton>

              {/*
                `unmountOnExit` is not decoration: items left mounted inside a
                collapsed branch stay in the tab order, which is a keyboard trap
                with no visible cause.
              */}
              <Collapse in={open} timeout="auto" unmountOnExit>
                <TreeNav
                  nodes={node.children}
                  selectedId={selectedId}
                  openIds={openIds}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              </Collapse>
            </Box>
          );
        }

        const selected = node.id === selectedId;
        return (
          <Box key={node.id} component="li" sx={{ listStyle: 'none' }}>
            <ListItemButton
              selected={selected}
              aria-current={selected ? 'page' : undefined}
              onClick={() => {
                onSelect(node.id);
              }}
              sx={{ pl: 1.5 + depth * 1.5 }}
            >
              {node.icon ? <ListItemIcon sx={{ minWidth: 30 }}>{node.icon}</ListItemIcon> : null}
              <ListItemText
                primary={node.label}
                secondary={node.caption}
                slotProps={{
                  primary: {
                    variant: 'body2',
                    fontWeight: selected ? 600 : 400,
                    noWrap: true,
                  },
                  secondary: { variant: 'caption', noWrap: true },
                }}
              />
            </ListItemButton>
          </Box>
        );
      })}
    </List>
  );
});
