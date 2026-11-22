# Notebook fonts

Caladea (prose) and Carlito (controls) are bundled open alternatives to Cambria and Calibri.
The WOFF2 files are Fontsource 5.2.5 Latin subsets, downloaded from:

- `https://cdn.jsdelivr.net/npm/@fontsource/caladea@5.2.5/files/`
- `https://cdn.jsdelivr.net/npm/@fontsource/carlito@5.2.5/files/`

Filenames record family, subset, weight and style. Caladea includes regular, italic and bold;
Carlito includes regular and bold. The accompanying OFL files come from Google Fonts'
`ofl/caladea/OFL.txt` and `ofl/carlito/OFL.txt`. Keep them with redistributed fonts.

Examine controls use Satoshi Medium through the official Fontshare webfont endpoint. It loads
when the controls are rendered and falls back to Carlito or the system sans serif when unavailable.
Satoshi is licensed under the ITF Free Font License, so the font binary is not checked into this
public repository. Notebook prose continues to use Caladea.
The notebook stylesheet supplies system fallbacks; characters outside these subsets fall
through to those fonts. No external font service is contacted during play.

Noto Sans Brahmi and its existing OFL license serve the title independently.
