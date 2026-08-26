# GenericPopup

`GenericPopup` is a controlled MUI Dialog/Drawer shell. The parent owns open,
dirty, loading, form, and business state; the component owns presentation,
close-policy enforcement, portal rendering, and accessible action controls.

```tsx
<GenericPopup
  open={open}
  onClose={() => setOpen(false)}
  header={{ title: 'Edit product', description: 'Update the selected product.' }}
  actions={{ formId: 'product-form', loading: saving, confirmLabel: 'Save' }}
  closeBehavior={{ dirty, preventCloseWhenDirty: true }}
  stickyFooter
>
  <form id="product-form" onSubmit={handleSubmit}>
    {/* Parent-owned fields */}
  </form>
</GenericPopup>
```

Use `slots.header`, `slots.body`, or `slots.footer` for completely custom
composition. Set `variant="drawer"` for side-panel presentation; Dialog and
Drawer both retain MUI portal, focus-trap, Escape, and focus-restoration behavior.

## Memoization

The component holds no `useMemo`, `useCallback`, or `React.memo` on purpose.

Measured with the React Profiler (20 updates, warm-up discarded, jsdom): 0.05 ms
per update while closed and 0.65 ms while open. `requestClose`, `popupContent`,
and `footerSx` are rebuilt each render, but they feed plain child components
(`Header`, `Footer`) and MUI's own `sx` handling, none of which compare by
reference — so stabilizing them cannot skip any work.

The costly subtree is `children`, which the parent supplies. A parent that
re-renders often (a controlled form, for example) should memoize its own body,
not this shell. Callers that do memoize should also stabilize `onClose` and
`actions.onConfirm`, since those are the props most likely to break a bail-out.

Re-measure before adding any of this back.
