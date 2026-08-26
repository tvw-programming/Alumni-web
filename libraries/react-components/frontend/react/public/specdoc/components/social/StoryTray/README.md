# StoryTray

## API

```ts
type StoryTrayProps = {
  stories: Story[]; // author, postedAt, seen, uploadProgress?
  onOpen: (id: string) => void;
  onAddStory?: () => void;
};
```

## Seen state is in the label

A coloured ring is a colour-only signal, and "seen" is exactly the sort of state
that never reaches assistive technology when it lives in a border. Every item
announces _"Meera's story, new, 2 hours ago"_ or _"…, already seen, …"_.

## Structure

A real horizontal scroller (`overflow-x: auto`) inside `role="list"`, not a
carousel with buttons — it is what a touch device expects, and a keyboard user
still tabs through the items with a visible focus ring.
