import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Fragment, memo } from 'react';

import type { BlockNode, InlineNode, ParsedMarkdown } from './markdown';

/**
 * Renders a parsed document.
 *
 * Every node becomes a React element and every string goes through a text child,
 * so **no HTML is ever constructed or injected**. There is no
 * `dangerouslySetInnerHTML` here and there must not be one — that is what makes
 * the viewer safe without a sanitizer.
 */

const HEADING_VARIANTS = ['h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1'] as const;

function Inline({ nodes }: { nodes: readonly InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case 'text':
            return <Fragment key={index}>{node.value}</Fragment>;
          case 'code':
            return (
              <Box
                key={index}
                component="code"
                sx={{
                  px: 0.6,
                  py: 0.2,
                  borderRadius: 0.75,
                  bgcolor: 'action.hover',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.86em',
                  overflowWrap: 'anywhere',
                }}
              >
                {node.value}
              </Box>
            );
          case 'strong':
            return (
              <Box key={index} component="strong" sx={{ fontWeight: 700 }}>
                <Inline nodes={node.children} />
              </Box>
            );
          case 'em':
            return (
              <Box key={index} component="em">
                <Inline nodes={node.children} />
              </Box>
            );
          case 'link': {
            // Only http(s) and in-page anchors are linkable. Anything else —
            // including a relative path to a source file — renders as text,
            // because it would 404 and because `javascript:` must never survive.
            const isSafe = /^(https?:\/\/|#)/i.test(node.href);
            if (!isSafe) {
              return (
                <Box key={index} component="span" sx={{ textDecoration: 'underline dotted' }}>
                  <Inline nodes={node.children} />
                </Box>
              );
            }
            return (
              <Link
                key={index}
                href={node.href}
                target={node.href.startsWith('#') ? undefined : '_blank'}
                rel="noopener noreferrer"
              >
                <Inline nodes={node.children} />
              </Link>
            );
          }
        }
      })}
    </>
  );
}

function Block({ node }: { node: BlockNode }) {
  switch (node.kind) {
    case 'heading':
      return (
        <Typography
          id={node.id}
          // The variant sets the *size* — a document's `#` should not render at
          // page-title scale inside a pane. `component` keeps the *element*
          // matching the source level, so the heading outline a screen reader
          // announces is the one the Markdown describes.
          variant={HEADING_VARIANTS[node.level - 1]}
          component={`h${String(node.level)}` as 'h1'}
          sx={{ fontWeight: 700, mt: node.level <= 2 ? 4 : 3, mb: 1, scrollMarginTop: 80 }}
        >
          <Inline nodes={node.children} />
        </Typography>
      );

    case 'paragraph':
      return (
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.75 }}>
          <Inline nodes={node.children} />
        </Typography>
      );

    case 'code':
      return (
        <Box
          component="pre"
          sx={{
            my: 2,
            p: 2,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            fontSize: 13,
            lineHeight: 1.65,
            // Code blocks are wide; they scroll inside their own box so the
            // page never scrolls sideways.
            overflowX: 'auto',
          }}
        >
          <Box component="code" aria-label={node.language ? `${node.language} code` : 'code'}>
            {node.value}
          </Box>
        </Box>
      );

    case 'list':
      return (
        <Box component={node.ordered ? 'ol' : 'ul'} sx={{ my: 1.5, pl: 3, '& li': { mb: 0.75 } }}>
          {node.items.map((item, index) => (
            <Typography key={index} component="li" variant="body2" sx={{ lineHeight: 1.7 }}>
              <Inline nodes={item} />
            </Typography>
          ))}
        </Box>
      );

    case 'table':
      return (
        <TableContainer component={Paper} variant="outlined" sx={{ my: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {node.head.map((cell, index) => (
                  <TableCell key={index} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <Inline nodes={cell} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {node.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} hover>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} sx={{ verticalAlign: 'top' }}>
                      <Inline nodes={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );

    case 'quote':
      return (
        <Box
          sx={{
            my: 2,
            pl: 2,
            py: 1,
            borderLeft: 4,
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
            borderRadius: '0 6px 6px 0',
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            <Inline nodes={node.children} />
          </Typography>
        </Box>
      );

    case 'rule':
      return <Divider sx={{ my: 3 }} />;
  }
}

/**
 * Memoized on the parsed document. The viewer re-renders whenever the tree's
 * open folders change, and re-rendering a 300-block document for that would be
 * wasted work.
 */
export const MarkdownView = memo(function MarkdownView({ doc }: { doc: ParsedMarkdown }) {
  return (
    <Box sx={{ maxWidth: 900 }}>
      {doc.blocks.map((block, index) => (
        <Block key={index} node={block} />
      ))}
    </Box>
  );
});
