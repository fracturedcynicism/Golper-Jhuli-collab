# Golper-Jhuli-collab
An experimental collaborative novella.

# Collaborative Novella Reader
## Bilingual (EN / বাংলা) — Fractured Cynicism

E-ink paper aesthetic. Four chapters. Four authors. One toggle to switch languages.

---

### File Structure

```
collab-novella/
├── index.html
├── .nojekyll
├── css/style.css
├── js/app.js
├── data/
│   ├── config.json       ← Series config + chapter/author metadata
│   └── authors.txt       ← Author bios (EN + BN)
└── books/
    ├── en/
    │   ├── chapter-1.txt
    │   ├── chapter-2.txt
    │   ├── chapter-3.txt
    │   └── chapter-4.txt
    └── bn/
        ├── chapter-1.txt
        ├── chapter-2.txt
        ├── chapter-3.txt
        └── chapter-4.txt
```

---

### Setup

**Step 1 — Edit `data/config.json`**

Fill in the novella title, subtitle, and for each chapter:
- `title_en` / `title_bn` — chapter title in both languages
- `author_en` / `author_bn` — author name
- `author_role_en` / `author_role_bn` — e.g. "Opening Voice"
- `file_en` / `file_bn` — paths to .txt files

**Step 2 — Edit `data/authors.txt`**

One block per author:
```
AUTHOR: Author One
AUTHOR_BN: লেখক এক
BIO_EN: Two or three sentences in English.
BIO_BN: দুই বা তিনটি বাক্য বাংলায়।
```

**Step 3 — Add your .txt chapter files**

- English chapters → `books/en/chapter-1.txt` etc.
- Bengali chapters → `books/bn/chapter-1.txt` etc.

Each `.txt` file is plain prose. Optional metadata at the top is stripped automatically:
```
AUTHOR: Author One
AUTHOR_ROLE: Opening Voice

Prose begins here...
```

Scene breaks: `***` or `---` on its own line → `· · ·`
Timestamp/location lines: `*Kolkata — dusk*` → muted italic

---

### Features

- E-ink paper theme — optimised for long-form reading
- EN / বাংলা toggle — switches instantly, remembers per session
- Author card above each chapter with bio
- Drop cap on first paragraph of each chapter
- Progress bar with scroll tracking
- Font size controls (A− / A+)
- Mobile responsive with slide-out nav drawer
- Keyboard: `Alt+→` next chapter, `Alt+←` previous, `Esc` close drawer

---

### Deploy to GitHub Pages

1. Push all files to a GitHub repo
2. `.nojekyll` is included
3. Settings → Pages → Deploy from branch → main / root → Save
4. Live in 2–3 minutes

### Run Locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

---

*Fractured Cynicism publishing infrastructure.*
