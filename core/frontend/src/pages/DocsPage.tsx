import { useEffect } from 'react';
import { Box, Drawer, IconButton, Stack, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/MenuBook';
import { useState } from 'react';
import DocsTree from '../components/docs/DocsTree';
import MarkdownView from '../components/docs/MarkdownView';
import { defaultDocId, docsById } from '../data/docs';
import { tokens } from '../theme';

const SIDEBAR_WIDTH = 288;

export default function DocsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeId = slug && docsById.has(slug) ? slug : defaultDocId;
  const doc = docsById.get(activeId);

  useEffect(() => {
    if (!slug || !docsById.has(slug)) navigate(`/docs/${defaultDocId}`, { replace: true });
  }, [slug, navigate]);

  // Scroll the reading pane back to the top when the file changes.
  useEffect(() => {
    document.getElementById('docs-content')?.scrollTo({ top: 0 });
  }, [activeId]);

  const select = (id: string) => {
    navigate(`/docs/${id}`);
    setDrawerOpen(false);
  };

  const sidebar = <DocsTree selectedId={activeId} onSelect={select} />;

  return (
    <Box sx={{ display: 'flex', height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 60px)' } }}>
      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH, bgcolor: tokens.panel } } }}
        >
          {sidebar}
        </Drawer>
      ) : (
        <Box
          component="nav"
          aria-label="Documentation files"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: `1px solid ${tokens.rule}`,
            bgcolor: tokens.panel,
            height: '100%',
            position: 'sticky',
            top: { xs: 56, sm: 60 },
          }}
        >
          {sidebar}
        </Box>
      )}

      <Box
        id="docs-content"
        component="main"
        sx={{ flex: 1, overflowY: 'auto', height: '100%', bgcolor: tokens.ink }}
      >
        {isMobile && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 2, py: 1, borderBottom: `1px solid ${tokens.rule}`, position: 'sticky', top: 0, bgcolor: tokens.ink, zIndex: 1 }}>
            <Tooltip title="Browse files">
              <IconButton size="small" onClick={() => setDrawerOpen(true)} aria-label="Browse documentation files">
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {doc?.label}
            </Typography>
          </Stack>
        )}

        {doc?.content ? (
          <MarkdownView content={doc.content} title={doc.label} />
        ) : (
          <Box sx={{ p: 6 }}>
            <Typography variant="h3">Pick a file to read</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Choose a document from the sidebar to open it here.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
