import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useDeferredValue, useEffect, useId, useRef, useState } from 'react';

import { pluralize } from '../../../foundation';

export interface MentionCandidate {
  id: string;
  name: string;
  handle: string;
  avatarUri?: string;
}

export interface MentionTextInputProps {
  value: string;
  label?: string;
  placeholder?: string;
  candidates: MentionCandidate[];
  loading?: boolean;
  onChange: (value: string) => void;
  /** Called with the query after the `@`. Debounce and cancel upstream. */
  onQueryChange: (query: string | null) => void;
}

/** The `@token` immediately before the caret, or null. */
function activeMention(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const match = /(?:^|\s)@([\w.]*)$/.exec(before);
  if (!match) return null;
  return { query: match[1], start: caret - match[1].length - 1 };
}

/**
 * A text input that suggests people after `@`.
 *
 * Two things this gets right that most mention inputs do not:
 *
 * - **The caret is restored after inserting.** A mention that dumps the cursor
 *   at the end of the text makes editing mid-sentence impossible, and it is the
 *   most common bug in this control.
 * - **The result count is announced.** A silent listbox appearing under a text
 *   field is invisible to a screen-reader user; `aria-live` says "5 people".
 *
 * `useDeferredValue` keeps typing responsive when the candidate list is long —
 * the input updates immediately and the filtering lags by a frame rather than
 * blocking the keystroke.
 */
export function MentionTextInput({
  value,
  label,
  placeholder,
  candidates,
  loading = false,
  onChange,
  onQueryChange,
}: MentionTextInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  /**
   * The Popper's anchor, in state.
   *
   * `anchorEl={inputRef.current}` reads a ref during render: React does not
   * re-render when a ref changes, so the popper would anchor to `null` on the
   * first paint and never correct itself.
   */
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const listId = useId();

  // The list lags the keystroke instead of blocking it.
  const deferredCandidates = useDeferredValue(candidates);
  const open = mention !== null && (deferredCandidates.length > 0 || loading);

  /**
   * Notify the caller when the *query* changes — not when its callback does.
   *
   * Depending on `onQueryChange` looks harmless and is an infinite loop: a
   * caller that passes an inline arrow gets a new identity every render, the
   * effect re-runs, its `setState` re-renders, and the identity changes again.
   * That is React error #185, and it is why the callback is read through a ref
   * and the effect depends only on the string.
   */
  const query = mention?.query ?? null;
  const onQueryChangeRef = useRef(onQueryChange);
  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  });
  useEffect(() => {
    onQueryChangeRef.current(query);
  }, [query]);

  const insert = (candidate: MentionCandidate) => {
    if (!mention) return;
    const input = inputRef.current;
    const caret = input?.selectionStart ?? value.length;
    const next = `${value.slice(0, mention.start)}@${candidate.handle} ${value.slice(caret)}`;
    const nextCaret = mention.start + candidate.handle.length + 2;

    onChange(next);
    setMention(null);

    // Restoring the caret has to wait for the controlled value to land, or the
    // browser puts it back at the end.
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  return (
    <>
      <TextField
        inputRef={(node: HTMLInputElement | null) => {
          inputRef.current = node;
          setAnchorEl(node);
        }}
        fullWidth
        multiline
        maxRows={6}
        size="small"
        label={label}
        placeholder={placeholder}
        value={value}
        slotProps={{
          htmlInput: {
            role: 'combobox',
            'aria-expanded': open,
            'aria-controls': open ? listId : undefined,
            'aria-autocomplete': 'list',
          },
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setMention(activeMention(event.target.value, event.target.selectionStart ?? 0));
          setHighlighted(0);
        }}
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlighted((current) => (current + 1) % deferredCandidates.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted(
              (current) => (current - 1 + deferredCandidates.length) % deferredCandidates.length,
            );
          } else if (event.key === 'Enter') {
            event.preventDefault();
            const candidate = deferredCandidates[highlighted];
            if (candidate) insert(candidate);
          } else if (event.key === 'Escape') {
            setMention(null);
          }
        }}
      />

      {/* Announced separately, because a listbox appearing silently under a
          text field does not exist for a screen-reader user. */}
      <Typography aria-live="polite" sx={visuallyHidden}>
        {open && !loading ? pluralize(deferredCandidates.length, 'person', 'people') : ''}
      </Typography>

      <Popper open={open} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 1300 }}>
        <Paper variant="outlined" sx={{ minWidth: 260, maxHeight: 240, overflowY: 'auto' }}>
          <MenuList id={listId} role="listbox" dense>
            {loading ? (
              <ListItemButton disabled>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <ListItemText primary="Searching…" />
              </ListItemButton>
            ) : (
              deferredCandidates.map((candidate, index) => (
                <ListItemButton
                  key={candidate.id}
                  role="option"
                  aria-selected={index === highlighted}
                  selected={index === highlighted}
                  onMouseEnter={() => {
                    setHighlighted(index);
                  }}
                  onClick={() => {
                    insert(candidate);
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar src={candidate.avatarUri} alt="" sx={{ width: 28, height: 28 }}>
                      {candidate.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={candidate.name}
                    secondary={`@${candidate.handle}`}
                    slotProps={{ primary: { variant: 'body2' }, secondary: { variant: 'caption' } }}
                  />
                </ListItemButton>
              ))
            )}
          </MenuList>
        </Paper>
      </Popper>
    </>
  );
}

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
