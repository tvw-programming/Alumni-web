// components/ItemsAccordion.tsx
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { QueryGate } from '@/components/feedback/QueryGate';
import { glassAccents, type GlassAccent } from '@/components/glass/glassAccents';
import { useItems } from '@/hooks/useItems';

const ACCENT_CYCLE: GlassAccent[] = ['violet', 'pink', 'teal', 'amber'];

/**
 * Fancy expand/collapse list backed by the Go Fiber API's `GET /api/items`
 * (see hooks/useItems.ts -> services/itemService.ts -> api/goApiClient.ts) —
 * demonstrates the frontend talking to the dockerized Go service end to end.
 *
 * Each panel cycles through the app's existing glass accent gradients so it
 * fits the same visual language as GlassCard/TeamPage rather than
 * introducing a one-off style; the expand/collapse itself stays on MUI's
 * built-in Accordion transition (which already animates smoothly) — framer
 * -motion is reserved for the entrance stagger, so the two animations never
 * fight over the same transform.
 */
export function ItemsAccordion() {
  const query = useItems();
  const [expandedId, setExpandedId] = useState<number | false>(false);
  const theme = useTheme();

  return (
    <QueryGate
      query={query}
      isEmpty={(items) => items.length === 0}
      emptyFallback={
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No items returned by the API yet.
        </Typography>
      }
    >
      {(items) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {items.map((item, index) => {
            const accent = glassAccents[ACCENT_CYCLE[index % ACCENT_CYCLE.length]];
            const isOpen = expandedId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
              >
                <Accordion
                  expanded={isOpen}
                  onChange={() => setExpandedId(isOpen ? false : item.id)}
                  disableGutters
                  elevation={0}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundImage: isOpen ? accent : 'none',
                    transition: 'background-image 200ms ease, box-shadow 200ms ease',
                    '&:before': { display: 'none' },
                    '&:hover': { boxShadow: theme.shadows[4] },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Inventory2Icon fontSize="small" color={isOpen ? 'inherit' : 'action'} />
                      <Typography fontWeight={600}>{item.name}</Typography>
                      <Chip size="small" label={`#${item.id}`} variant="outlined" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary">
                      Item #{item.id}, served live from the Go Fiber API at <code>/api/items</code>.
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </motion.div>
            );
          })}
        </Box>
      )}
    </QueryGate>
  );
}

export default ItemsAccordion;
