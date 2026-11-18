Ahmad Shoaib - Portfolio website
=================================

Pages
  index.html     Landing page (loader, hero, about, work, live work, Behance, process, toolkit, experience, FAQ, contact)
  veroxos.html   Case study: Veroxos employee portal
  pamogi.html    Case study: Pamogi

Folders
  css/   One stylesheet per page (main.css, veroxos.css, pamogi.css) plus fonts.css
  js/    main.js / veroxos.js / pamogi.js hold each page's content and interactions.
         dc-lite.js renders the page template (in each HTML file) with those values;
         morphdom.min.js (MIT licence) applies updates efficiently.
  assets/  Images, videos and the resume PDF.

Hosting
  Upload the whole folder to any static host (Netlify, Vercel, GitHub Pages, cPanel...).
  For local viewing, run a small local server inside the folder, e.g.
      python3 -m http.server 8080
  then open http://localhost:8080. Opening index.html directly also works in most browsers.

Editing text
  Most copy and lists live in the renderVals() method of js/main.js (and the case-study js files);
  static headings live in the template inside each .html file.
  Fonts (Bebas Neue, Manrope, JetBrains Mono) are self-hosted in fonts/ (SIL Open Font License),
  so the site works fully offline. The only external links are your profiles and live-site URLs.
