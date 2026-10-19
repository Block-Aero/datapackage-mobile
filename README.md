# Data Package – Receiver View (mobile prototype)

Clickable prototype of the Figma page **01 Design ⭐️ → View Data Package Details (Receiver View)**
(file `LN5JvYg8GMRjHFJVOfxUpJ`). Plain HTML/CSS/JS, no build step.

**Live:** https://cflribeiro.github.io/datapackage-mobile/ (desktop: screen list + phone frame)

**Mobile / share link:** https://cflribeiro.github.io/datapackage-mobile/?mobile (just the flow, no screen list)

## Run

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. On desktop you get the phone frame plus a navigator that jumps to every
Figma screen (100–701). On a phone the prototype fills the screen.

- Password: `blockaero` (anything else shows the "Access denied" state).
- `?screen=<id>` opens a specific Figma screen, e.g. `?screen=402`.
- `?bare` renders only the 393×844 frame, 1:1 with Figma, for design QA.

## Scrolling behaviour

| Screen | Fixed | Sticky | Scrolls |
| --- | --- | --- | --- |
| Data package | Header, Documents download bar | Tabs + search + list header (shadow when stuck) | Package title/description, list (infinite: 20 rows per page) |
| Asset profile | Header (back / part / info) | Tab bar | Cards, tables. Events table also scrolls horizontally with its own indicator |
| Asset information | Sheet header | — | Collapsible sections; page behind is locked |
| Document viewer | Toolbar, paginator | — | Document canvas (double-tap to zoom), thumbnail rail scrolls on its own |

The Safari chrome and the iOS keyboard drawn in Figma are reference only and are not reproduced.
