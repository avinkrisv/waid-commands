# design/

`preview.html` — the designer's standalone HTML, with inline fixture data and
no placeholders. Open it directly in a browser to see the intended visual
treatment without running the slash command.

The plugin itself does not load this file at run time. The canonical source
splits into `../assets/template.html` (with placeholders), `../assets/template.css`,
and `../assets/template.js`. Update those when iterating; refresh `preview.html`
when you want to share a new self-contained design snapshot.
