class Component extends DCLogic {
  constructor(...args) {
    super(...args);
    this.state = { ch: -1, scr: 0, scrW: 0 };
  }
  componentDidUpdate() {
    this._tick();
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
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    // videos: load a little ahead, play only while on screen
    root.querySelectorAll('video.auto-v').forEach((v) => {
      const vr = v.getBoundingClientRect();
      const near = vr.top < vh * 2 && vr.bottom > -vh;
      const seen = vr.bottom > 0 && vr.top < vh;
      if (near && !reduce && !v.getAttribute('src')) {
        v.preload = 'auto';
        v.setAttribute('src', v.getAttribute('data-src'));
        v.addEventListener('playing', () => v.classList.add('on'));
      }
      if (seen && !reduce && v.getAttribute('src')) {
        v.muted = true;
        if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      } else if (!v.paused) v.pause();
    });
    let cur = -1;
    root.querySelectorAll('section[id^="ch-"]').forEach((sec, i) => {
      if (sec.getBoundingClientRect().top <= vh * 0.4) cur = i;
    });
    const view = root.querySelector('.scr-view');
    const w = view ? Math.round(view.getBoundingClientRect().width) : 0;
    const s = this.state || {};
    if (cur !== s.ch || (w && w !== s.scrW)) this.setState({ ch: cur, scrW: w || s.scrW });
  }
  renderVals() {
    const accent = this.props.accent ?? '#8BE3CC';
    if (!this._rootRef) {
      this._rootRef = (el) => { if (el) { this._root = el; this._bind(); } else { this._unbind(); this._root = null; } };
      this._progRef = (el) => { this._prog = el; };
    }
    const st = this.state || {};
    const ch = st.ch;
    const chapters = [
      { id: 'ch-overview', num: '01', title: 'Overview', intro: 'The idea behind Pamogi, the founder’s brief, and what was broken in the original designs.', panels: [
        { isImg: true, isVid: false, src: 'assets/584c2cd8349def9d5e4cce806e65e3b7.jpg', w: 1400, h: 1081, alt: "Overview: ideas worth trying, from inspiration to impact. Pamogi joins project management with crowdfunding: every project is a planet, owners set a budget in POGI, and contributors earn POGI, points and proof of ownership when a suggestion is approved. Alpha stage, 10 active projects in Peru, Togo and Belgium, 4 roles, about 60 original Figma frames. Quote from founder Bert Bernolet: collaboration is the communication." },
        { isImg: true, isVid: false, src: 'assets/02da6a66d798fb1d8427f0c71230bb0f.jpg', w: 1400, h: 1416, alt: "The challenge: a strong idea, told in fragments. Eight of the original Figma frames, and six problems: no shared visual world, content you couldn't read, icons without labels, forms that ignored the game, a mascot without a job, and low contrast with small type." }
      ] },
      { id: 'ch-system', num: '02', title: 'The system', intro: 'Pamogi’s vocabulary, the planet lifecycle, the three loops and the rules every screen follows.', panels: [
        { isImg: false, isVid: true, vid: 'assets/00ceee6db3171b3fd1926d482f45c18e.mp4', poster: 'assets/7b8d39ef7c24ab825b92f7d8f0f681e6.jpg', w: 1400, h: 1066, alt: "Animated panel, learning the language of the universe: eight terms mapped to plain meanings, MOGI, POGI, planet, AGEs, project owner, assistant, judge and suggestion." },
        { isImg: true, isVid: false, src: 'assets/785afe43c8859d22d3ae8ba3c6f7e4d7.jpg', w: 1400, h: 741, alt: "The planet lifecycle: progress you can see from orbit. Five ages, Age of Black, Rising Planet, Eruption, Terraforming and Complete, plus the six terraforming areas: oxygen, water, vegetation, energy, land levels and raise lands." },
        { isImg: true, isVid: false, src: 'assets/bd17aacde2950c24a8b4076ec1f283e3.jpg', w: 1400, h: 1507, alt: "Flows and architecture: three loops run the whole product. Getting in, growing a planet through the suggestion loop, and connecting with other MOGIs, followed by the four areas of the site map: Universe, Your planet, POGI, and Social and support." },
        { isImg: true, isVid: false, src: 'assets/4bfb62d8d2586d1a14d64c1b40d826ee.jpg', w: 1400, h: 651, alt: "Design principles, four rules for every screen: the world is the interface, one sky everywhere, say it in words, and reward feels physical." }
      ] },
      { id: 'ch-wireframes', num: '03', title: 'Wireframes', intro: 'Six key screens sketched in pencil, settling structure before any colour or illustration.', panels: [
        { isImg: true, isVid: false, src: 'assets/d70043d7085c3d4e5d624d1f892dd320.jpg', w: 1400, h: 2367, alt: "Wireframes: pencil before pixels. Annotated low-fidelity sketches of six key screens: home and the solar system, Age of Terraforming, add assistant, planets, questions and add POGI." }
      ] },
      { id: 'ch-world', num: '04', title: 'Visual world', intro: 'One character, one low-poly style for every world, and one small set of tokens.', panels: [
        { isImg: false, isVid: true, vid: 'assets/93b695638bc4786001dcff5b60f41643.mp4', poster: 'assets/25ee74dfc3b1c50546df66749b716ec5.jpg', w: 1400, h: 1238, alt: "Animated panel, Pamogi the guide with a visor: the flat mascot rebuilt as a 3D character with poses, one visor colour per assistant, and approved and not-this-time states." },
        { isImg: false, isVid: true, vid: 'assets/34fc850564b2ab4c3bdd093f63d642cd.mp4', poster: 'assets/6aded5b553eeaf1536914891df17702a.jpg', w: 1400, h: 1510, alt: "Animated panel, one low-poly style for every world: the volcano isle, planet globe and terraforming island rebuilt as faceted 3D models, with the full set of planets, sun, asteroid and POGI coin." },
        { isImg: false, isVid: true, vid: 'assets/53371e0afa1f4a54704e7b534cd793c6.mp4', poster: 'assets/512f475fe9dd6c50f5aa815d6131d51e.jpg', w: 1400, h: 1186, alt: "Animated panel, deep space and one glossy button: the colour tokens, the display and body typefaces, the primary button, floating panels and planet stat meters." }
      ] }
    ].map((c, ci) => ({
      ...c, titleUp: c.title.toUpperCase(),
      panels: c.panels.map((p) => ({ ...p, loading: ci === 0 ? 'eager' : 'lazy' }))
    }));
    const chapters2 = [
      { id: 'ch-outcome', num: '06', title: 'Motion & outcome', intro: 'How the universe keeps moving, what shipped, and what I would do next.', panels: [
        { isImg: true, isVid: false, src: 'assets/2658897d4b88e9dda6183d9c29976d41.jpg', w: 1400, h: 628, alt: "Motion: slow, constant, alive. A living starfield, orbits that keep running on the home screen, and short character beats, one per event." },
        { isImg: true, isVid: false, src: 'assets/ea7bf03c6832fc94c11d4169e4626a41.jpg', w: 1400, h: 741, alt: "What shipped: 14 screens redesigned plus a cinematic login, 8 assistant colourways with green and red states, 9 animated world assets, and 1 shared background, panel, type pair and primary button. What I learned: a metaphor only works if it is consistent. What I'd do next: test the side navigation and suggestion flow with alpha project owners and extend the system to the remaining screens." },
        { isImg: false, isVid: true, vid: 'assets/589ab5dd77999e8a28118876dd5001cd.mp4', poster: 'assets/35058ad3a03a084b7a977c768119474a.jpg', w: 1400, h: 986, alt: "Animated closing panel: thanks for exploring the universe, designed by Ahmad, UI/UX designer, with Pamogi waving and the sources used." }
      ] }
    ].map((c) => ({ ...c, titleUp: c.title.toUpperCase(), panels: c.panels.map((p) => ({ ...p, loading: 'lazy' })) }));
    const chips = chapters.map((c) => ({ num: c.num, title: c.title, id: c.id }))
      .concat([{ num: '05', title: 'Screens', id: 'ch-screens' }, { num: '06', title: 'Outcome', id: 'ch-outcome' }])
      .map((c, i) => ({
        num: c.num, label: c.title.toUpperCase(), href: '#' + c.id,
        cls: 'chip' + (i === ch ? ' on' : ''), numColor: i === ch ? accent : '#5D5A78'
      }));
    const slideData = [
      { label: "Log in", src: 'assets/ddc38bf37e0e0a894e16c2a9a5dccfd4.jpg', h: 736, alt: "Screen 1 of 13, log in: a full-screen interactive galaxy with a short sign-in form floating on top." },
      { label: "Home", src: 'assets/2567d1c87b5a2a4d2ce328542d6e101c.jpg', h: 1332, alt: "Screen 2 of 13, home: after and before. The redesign turns the solar system into orbiting planets you can open, a selected-planet card and a labelled side menu." },
      { label: "Planets", src: 'assets/304e4e07255e98dbabbd3847fc4be6ca.jpg', h: 1333, alt: "Screen 3 of 13, planets: after and before. Lorem ipsum rows became a dashboard of your planet and the others in your system, with liveable tags." },
      { label: "New planet", src: 'assets/e611d60469dcf7f005bfada390bbcf04.jpg', h: 1332, alt: "Screen 4 of 13, a new planet has formed: after and before. Orbit rings, Pamogi the guide and two clear exits." },
      { label: "Rising planet", src: 'assets/2a92fbfbb65078000f87497a6c7bca99.jpg', h: 1333, alt: "Screen 5 of 13, Age of Rising Planet: after and before. The volcano owns the left half and questions became a readable feed." },
      { label: "Terraforming", src: 'assets/40d0bdb224d775c4789004a63edc0f9a.jpg', h: 1333, alt: "Screen 6 of 13, Age of Terraforming: after and before. A full-screen map of islands with colour-coded layer toggles and an island detail card." },
      { label: "Add assistant", src: 'assets/da3ba6a645fe63d4bc1eb1262ce6ceb3.jpg', h: 1332, alt: "Screen 7 of 13, add assistant: after and before. Eight identical cards became eight distinct assistants with role filters and a selection preview." },
      { label: "Judge result", src: 'assets/90cce1ddaeae4987e22d92f8267567f5.jpg', h: 1035, alt: "Screen 8 of 13, judge application result: approved and rejected dialogs, before and after. Pamogi turns green for approved and red for rejected, and a rejection gives a reason and a next step." },
      { label: "Questions", src: 'assets/86975464abe075494bc8ff0ea9204058.jpg', h: 1333, alt: "Screen 9 of 13, questions: after and before. Placeholder rows became a community board with a vote column, the five Ws as filters and guidance from Pamogi on the side." },
      { label: "Chat", src: 'assets/775f98be7d1b8dce3a6ab5f791a87fa7.jpg', h: 1333, alt: "Screen 10 of 13, chat: after and before. Assistants appear as contacts with their coloured Pamogi, messages reference planets, and call and video sit in the header." },
      { label: "News feed", src: 'assets/9216b3ff168d8c4bea8e1f724cc99bda.jpg', h: 1332, alt: "Screen 11 of 13, news feed on an asteroid: after and before. Numbered beacons on the asteroid point to stories in a readable feed beside it." },
      { label: "Add POGI", src: 'assets/5e3e8fc34a424677edbf89c9e1f6da69.jpg', h: 1333, alt: "Screen 12 of 13, add POGI: after and before. Packages come before card fields, with an order summary and trust signals next to the pay button." },
      { label: "MOGI profile", src: 'assets/5e4d9b86d6bcd2936c28dc76bb93349e.jpg', h: 1332, alt: "Screen 13 of 13, MOGI profile, POGI tab: after and before. A 3D gold coin and large key numbers, with profile actions grouped on the right." }
    ];
    const n = slideData.length;
    const scr = Math.max(0, Math.min(n - 1, st.scr || 0));
    const go = (i) => () => { const k = Math.max(0, Math.min(n - 1, i)); if (k !== scr) this.setState({ scr: k }); };
    const two = (x) => (x < 10 ? '0' : '') + x;
    const slides = slideData.map((d, i) => ({ ...d, hidden: i === scr ? 'false' : 'true', inert: i !== scr }));
    const tabs = slideData.map((d, i) => ({
      label: d.label, num: two(i + 1), go: go(i), sel: i === scr ? 'true' : 'false',
      color: i === scr ? '#ECEAF4' : '#8C88A6', numColor: i === scr ? accent : '#5D5A78',
      line: i === scr ? accent : 'transparent'
    }));
    // the frame takes each screen's own height, so the short log-in screen doesn't leave a gap
    const scrHeight = st.scrW ? Math.round(st.scrW * slideData[scr].h / 1400) + 'px' : 'auto';
    const meta = [
      { k: 'ROLE', v: 'UI/UX & visual designer' },
      { k: 'PLATFORM', v: 'Web app · 1440 desktop' },
      { k: 'SCOPE', v: '14 screens, character, worlds' },
      { k: 'YEAR', v: '2026' }
    ];
    return {
      accent, chapters, chapters2, chips, meta, slides, tabs, scrHeight,
      scrShift: (-100 * scr) + '%', scrNow: two(scr + 1), scrTotal: two(n),
      scrPrev: go(scr - 1), scrNext: go(scr + 1), scrAtStart: scr === 0, scrAtEnd: scr === n - 1,
      rootRef: this._rootRef, progRef: this._progRef
    };
  }
}
