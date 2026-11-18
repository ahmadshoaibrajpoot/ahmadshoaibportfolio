class Component extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = { ch: -1 };
  }
  componentWillUnmount() {
    this._unbind();
  }
  _bind() {
    if (this._bound) return;
    this._bound = true;
    this._onScroll = () => {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._tick(); });
    };
    window.addEventListener('scroll', this._onScroll, { passive: true, capture: true });
    window.addEventListener('resize', this._onScroll);
    if (this._root) this._root.classList.add('js-rv');
    this._onScroll();
    this._late = setTimeout(this._onScroll, 500);
  }
  _unbind() {
    if (!this._bound) return;
    this._bound = false;
    window.removeEventListener('scroll', this._onScroll, { capture: true });
    window.removeEventListener('resize', this._onScroll);
    clearTimeout(this._late);
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
  _tick() {
    const root = this._root;
    if (!root) return;
    const vh = window.innerHeight || 800;
    const r = root.getBoundingClientRect();
    const span = r.height - vh;
    const p = span > 4 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
    if (this._prog) this._prog.style.width = (p * 100).toFixed(2) + '%';
    root.querySelectorAll('.rv:not(.in)').forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.9) el.classList.add('in');
    });
    let cur = -1;
    root.querySelectorAll('section[id^="ch-"]').forEach((sec, i) => {
      if (sec.getBoundingClientRect().top <= vh * 0.4) cur = i;
    });
    if (cur !== (this.state || {}).ch) this.setState({ ch: cur });
    const v = this._vid;
    if (v) {
      let reduce = false;
      try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      const vr = v.getBoundingClientRect();
      const seen = vr.bottom > 0 && vr.top < vh;
      if (seen && !reduce) {
        v.muted = true;
        if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      } else if (!v.paused) v.pause();
    }
  }
  renderVals() {
    const accent = this.props.accent ?? '#93B1FF';
    if (!this._rootRef) {
      this._rootRef = (el) => { if (el) { this._root = el; this._bind(); } else { this._unbind(); this._root = null; } };
      this._progRef = (el) => { this._prog = el; };
      this._vidRef = (el) => { this._vid = el; if (el) this._onScroll && this._onScroll(); };
    }
    const ch = (this.state || {}).ch;
    const chapters = [
      { id: 'ch-overview', num: '01', title: 'Overview', intro: 'What Veroxos is, who the portal is for, and the three problems it had to solve.', panels: [
          { src: 'assets/977898e4a47db8fe4d63ef25f3583dd5.jpg', w: 1800, h: 808, r: '2.279% / 5.081%', alt: "About the project. Veroxos is a technology expense management platform that helps large organisations track spend on mobile devices, phone plans, telecom and cloud services. This project opened it to the employees who use the phones and the managers who approve their requests. Product: Veroxos Employee Portal. Company: Stablelogic. Platform: enterprise web app, desktop first. Role: Senior UI/UX Designer. Year: 2025. Scope: 12 flows, 70+ screens." },
          { src: 'assets/bee3f4e07a4e7bd1949f7abf3191b4b6.jpg', w: 1800, h: 971, r: '2.388% / 4.427%', alt: "The brief: let employees see what they spend, what they can order and where their request is, without emailing IT. Problem 1, no visibility: costs lived in billing reports only finance and IT could read. Problem 2, opaque requests: upgrades and new lines went by email with no way to track progress. Problem 3, support overload: simple questions became tickets." }
      ] },
      { id: 'ch-structure', num: '02', title: 'Structure', intro: 'How one portal serves two roles, from first sketches to final screens.', panels: [
          { src: 'assets/feffc578c64c17c3c633936be6052b67.jpg', w: 1800, h: 1523, r: '2.496% / 2.95%', alt: "Information architecture. One portal serves two roles: employees get the core modules, managers see the same layout with approvals, team cost and reporting added. Groups: Menu, Support and Access, with the 12 flows listed below." },
          { src: 'assets/3e588e858d04bd51ea5b571a046edfaf.jpg', w: 1800, h: 2808, r: '2.279% / 1.461%', alt: "Low-fidelity wireframe sketches of five screens, employee home, sign-in, manager approvals, my cost and support feedback, annotated in blue with the decisions that carried into the final design." },
          { src: 'assets/52e070aec7d1ae96aee6957164ed4168.jpg', w: 1800, h: 2166, r: '2.243% / 1.864%', alt: "Wireframe and final design side by side for two key screens: the employee home and the manager approvals dialog." }
      ] },
      { id: 'ch-system', num: '03', title: 'Visual system', intro: 'The brand, type, colour, icons and components every screen is built from.', panels: [
          { src: 'assets/1fb315ef5870bccf24e635936c8002cd.jpg', w: 1800, h: 1439, r: '2.207% / 2.761%', alt: "Branding. The Veroxos mark is two nested hexagons cut by parallel lines, shown on its construction grid with primary, on-blue and mono lockups and app-icon versions." },
          { src: 'assets/cfdfbd8e0de35be3c62caa14a9905b86.jpg', w: 1800, h: 1414, r: '2.207% / 2.808%', alt: "Typography and scale. Inter carries the whole interface, with a scale from 30px bold key figures down to 10px micro labels." },
          { src: 'assets/742d2efcc5035fc83e0482145db50cf3.jpg', w: 1800, h: 1581, r: '2.352% / 2.678%', alt: "Colour system in three tiers: primary blue #1D46F3 with neutrals, status colours for approved, rejected and over budget, and tertiary colours so up to eight chart categories stay distinct." },
          { src: 'assets/adc01101758fd0bb5f570b84b0ef89bf.jpg', w: 1800, h: 1376, r: '2.207% / 2.887%', alt: "Icon language. Lucide line icons at 1.75 stroke for the interface, and a custom set of 21 filled, coloured icons for orders, services and support actions." },
          { src: 'assets/178610699f2bff410a1e576f3996132a.jpg', w: 1800, h: 2148, r: '2.279% / 1.91%', alt: "Component library: side navigation, summary card, order tracker, buttons, badges, status pills, tabs, dropdowns, pagination and a month picker for billing-cycle reports." }
      ] },
      { id: 'ch-product', num: '04', title: 'The product', intro: 'The portal in use, for employees and for the managers who approve their requests.', panels: [
          { src: 'assets/dfe0970bf74d5002531498b47d8376b4.jpg', w: 1800, h: 3183, r: '2.352% / 1.33%', alt: "Mockup view: the portal on laptops and monitors in four scenes, designed for a 1920 pixel desktop canvas with a fixed side rail." },
          { src: 'assets/694290be0ea0a7edf058fbe130422e09.jpg', w: 1800, h: 2416, r: '2.352% / 1.752%', alt: "Employee experience. One home screen answers what am I paying, can I get a new device and where is my request. Sign-in routes each organisation to its own single sign-on. Feedback asks what went wrong after a low score." },
          { src: 'assets/1aa1440fb08e72621ec6d9091da1794f.jpg', w: 1800, h: 2534, r: '2.207% / 1.568%', alt: "Manager tools. Approve requests from a focused dialog without leaving the home page, and see team spend by branch with a cost-centre chart, org chart and table." },
          { src: 'assets/831e65315c1db08ef143f61ea6aa1c43.jpg', w: 1800, h: 3284, r: '2.243% / 1.23%', alt: "Cost and reporting. My Cost opens on 12 months of charts plotted against the number of services; the monthly spend report highlights unusual days like a roaming spike; forbidden and 404 states keep navigation in place." }
      ] },
      { id: 'ch-outcome', num: '05', title: 'Outcome', intro: 'What shipped, and what I learned along the way.', panels: [
          { src: 'assets/43f7d2a903d2f643d805e8244cc64f9d.jpg', w: 1800, h: 862, r: '2.315% / 4.834%', alt: "Outcome: 70+ screens across 12 flows, 2 roles served by one layout, 1 shared design system in Figma. Learned: design for the infrequent visitor. Next: test cost reports beyond the pilot groups and measure support tickets and approval turnaround." },
          { src: 'assets/2ed4d83e7123640ce023a7d6dcc486f1.jpg', w: 1800, h: 914, r: '2.388% / 4.704%', alt: "Thank you. Ahmad Shoaib, Senior UI/UX Designer and UX Engineer." }
      ] }
    ].map((c, ci) => ({
      ...c, titleUp: c.title.toUpperCase(),
      panels: c.panels.map((p, pi) => ({ ...p, loading: ci === 0 ? 'eager' : 'lazy' }))
    }));
    const chips = chapters.map((c, i) => ({
      num: c.num, label: c.title.toUpperCase(), href: '#' + c.id,
      cls: 'chip' + (i === ch ? ' on' : ''), numColor: i === ch ? accent : '#55555C'
    }));
    const meta = [
      { k: 'ROLE', v: 'Senior UI/UX Designer' },
      { k: 'COMPANY', v: 'Stablelogic' },
      { k: 'PLATFORM', v: 'Enterprise web app, desktop first' },
      { k: 'YEAR', v: '2025' },
      { k: 'SCOPE', v: '12 flows, 70+ screens' }
    ];
    return {
      accent, chapters, chips, meta,
      rootRef: this._rootRef, progRef: this._progRef, heroVidRef: this._vidRef
    };
  }
}
