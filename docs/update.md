# Updating the list

Everything a future session needs to change what visitors see. The site itself
is plain static HTML/CSS/JS with **no build step** — see `index.html`,
`styles.css`, `app.js`.

## The only file you edit

`links.json` holds every listed item. Edit it, commit, push to `main`; GitHub
Pages redeploys automatically (usually under a minute). Nothing else to run.

```json
{
  "site": { "title": "list", "tagline": "" },
  "items": [
    {
      "title": "Resume — Arie",
      "slug": "resume",
      "kind": "pdf",
      "target": "files/resume.pdf",
      "note": "Updated Nov 2026"
    }
  ]
}
```

## Item fields

| Field   | Required | Notes |
| ------- | -------- | ----- |
| `title` | yes      | Shown on the card. |
| `slug`  | yes      | Unique, lowercase, URL-safe (`a-z0-9-`). Drives the anchor and the shortlink. |
| `kind`  | yes      | One of the kinds below. Unknown values fall back to `file`. |
| `target`| yes      | External `https://…` URL, or a repo-relative path such as `files/doc.pdf`. |
| `note`  | no       | One short line under the title. Omit rather than leave empty. |

Keep the array order — items render in that order inside their group.

## Kinds

| Kind    | Means                                   | Visitor action |
| ------- | --------------------------------------- | -------------- |
| `link`  | An external URL                         | Opens in a new tab. |
| `page`  | An HTML file served from `files/`       | Opens in place (browser renders it). |
| `pdf`   | A PDF served from `files/`              | Opens in place (native viewer). |
| `image` | An image served from `files/`           | Opens in place. |
| `file`  | Anything else — doc, zip, etc.          | Opens in place. |

Groups appear on the page in the order above, and only when they contain items.

## Files

Drop the file anywhere under the repo and reference it relative to the repo root,
e.g. `files/resume.pdf`. Put large or binary assets in `files/` so they stay out
of the way; there is no server-side processing, the file is served as-is.

## Slugs, anchors and shortlinks

- On-page anchor: `https://raeerie.github.io/list/#resume`
- Shortlink (redirects to the target): `https://raeirie.github.io/list/?go=resume`

The shortlink resolves against `links.json` at request time, so it always follows
the current `target` even after the item is edited.

Pretty paths such as `https://raeerie.github.io/list/go/resume` are **not** built
yet — tracked in [issue #1](https://github.com/raeerie/list/issues/1).

## Placeholders and samples

`links.json` ships with clearly-labelled `Sample:` entries pointing at files in
`files/`, so the page has honest content while tuning. They are placeholders, not
real listings — replace them with real items rather than editing them in place.

## Changing the look

Every visual value lives in the `:root` block at the top of `styles.css`. Edit
those values directly and push; there is no separate theme file.

The dev-only tuning panel (loaded via `?tune=1`) was removed once the current
values were locked. To tune again, restore `tuner.js`, `tuner.css` and the
`loadTuner()` call in `app.js` from git history, then remove them again once the
new values are baked in.

## Visual values

All colour, spacing, type and grid values are CSS custom properties declared once
in the `:root` block at the top of `styles.css`. Change them there; do not add
one-off values in components.
