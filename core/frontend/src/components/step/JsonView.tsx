import { useMemo, useState } from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandLessIcon from '@mui/icons-material/KeyboardArrowRight';
import CopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import { fonts, tokens } from '../../theme';

/** Colour by JSON type, so shape is readable before the words are. */
const typeColor = {
  string: '#9BD3A8',
  number: '#E8A33D',
  boolean: '#7C8CF8',
  null: '#5C6178',
  key: '#8FB8E8',
  punct: '#5C6178',
} as const;

interface NodeProps {
  name?: string;
  value: unknown;
  depth: number;
  defaultOpen: boolean;
  isLast: boolean;
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span style={{ color: typeColor.null }}>null</span>;
  if (typeof value === 'string') return <span style={{ color: typeColor.string }}>"{value}"</span>;
  if (typeof value === 'number') return <span style={{ color: typeColor.number }}>{value}</span>;
  if (typeof value === 'boolean')
    return <span style={{ color: typeColor.boolean }}>{String(value)}</span>;
  return <span>{String(value)}</span>;
}

function JsonNode({ name, value, depth, defaultOpen, isLast }: NodeProps) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const entries = isObject ? Object.entries(value as Record<string, unknown>) : [];
  const empty = entries.length === 0;

  const label = name !== undefined && (
    <>
      <span style={{ color: typeColor.key }}>"{name}"</span>
      <span style={{ color: typeColor.punct }}>: </span>
    </>
  );

  if (!isObject) {
    return (
      <Box sx={{ pl: depth * 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {label}
        <Primitive value={value} />
        {!isLast && <span style={{ color: typeColor.punct }}>,</span>}
      </Box>
    );
  }

  const open_b = isArray ? '[' : '{';
  const close_b = isArray ? ']' : '}';

  if (empty) {
    return (
      <Box sx={{ pl: depth * 1.75 }}>
        {label}
        <span style={{ color: typeColor.punct }}>
          {open_b}
          {close_b}
          {!isLast ? ',' : ''}
        </span>
      </Box>
    );
  }

  return (
    <Box sx={{ pl: depth * 1.75 }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          background: 'none',
          border: 'none',
          p: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
          borderRadius: 0.5,
          '&:hover': { bgcolor: alpha(tokens.signal, 0.08) },
          '&:focus-visible': { outline: `1px solid ${tokens.signal}`, outlineOffset: 1 },
        }}
      >
        {open ? (
          <ExpandMoreIcon sx={{ fontSize: 14, color: typeColor.punct, ml: -1.75 }} />
        ) : (
          <ExpandLessIcon sx={{ fontSize: 14, color: typeColor.punct, ml: -1.75 }} />
        )}
        {label}
        <span style={{ color: typeColor.punct }}>{open_b}</span>
        {!open && (
          <span style={{ color: typeColor.punct }}>
            {' '}
            {entries.length} {isArray ? 'items' : 'keys'} {close_b}
            {!isLast ? ',' : ''}
          </span>
        )}
      </Box>

      {open && (
        <>
          {entries.map(([key, child], i) => (
            <JsonNode
              key={key}
              name={isArray ? undefined : key}
              value={child}
              depth={depth + 1}
              defaultOpen={defaultOpen}
              isLast={i === entries.length - 1}
            />
          ))}
          <Box sx={{ pl: depth * 1.75 }}>
            <span style={{ color: typeColor.punct }}>
              {close_b}
              {!isLast ? ',' : ''}
            </span>
          </Box>
        </>
      )}
    </Box>
  );
}

interface Props {
  value: unknown;
  /** Shown when the value is null — steps that have not produced data yet. */
  emptyMessage?: string;
  maxHeight?: number | string;
}

export default function JsonView({ value, emptyMessage = 'No data yet.', maxHeight = 420 }: Props) {
  const [copied, setCopied] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (value === null || value === undefined) {
    return (
      <Box
        sx={{
          border: `1px dashed ${tokens.rule}`,
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ border: `1px solid ${tokens.rule}`, borderRadius: 1, overflow: 'hidden' }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 1.5, py: 0.75, borderBottom: `1px solid ${tokens.rule}`, bgcolor: tokens.panel }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          application/json
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Button
            size="small"
            onClick={() => setExpandAll((e) => !e)}
            sx={{ fontSize: 11, color: 'text.secondary', minWidth: 0 }}
          >
            {expandAll ? 'Collapse' : 'Expand all'}
          </Button>
          <Tooltip title={copied ? 'Copied' : 'Copy JSON'}>
            <IconButton size="small" onClick={copy} aria-label="Copy JSON">
              {copied ? (
                <DoneIcon sx={{ fontSize: 15, color: tokens.pass }} />
              ) : (
                <CopyIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        sx={{
          fontFamily: fonts.mono,
          fontSize: 12.5,
          lineHeight: 1.75,
          p: 1.5,
          pl: 3,
          maxHeight,
          overflow: 'auto',
          bgcolor: tokens.ink,
        }}
      >
        <JsonNode
          key={String(expandAll)}
          value={value}
          depth={0}
          defaultOpen={expandAll}
          isLast
        />
      </Box>
    </Box>
  );
}
