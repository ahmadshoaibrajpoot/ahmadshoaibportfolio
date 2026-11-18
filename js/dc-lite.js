/*! dc-lite: a tiny runtime that renders the portfolio's page templates in a plain browser.
 *  Templates use {{ holes }}, <sc-for list as> and <sc-if value>; logic lives in a
 *  `class Component extends DCLogic` with renderVals(), setState() and ref/event callbacks.
 *  DOM updates are patched with morphdom, keeping attributes and text that scripts changed
 *  unless the template itself changed (the same rule React follows). */
(function () {
  'use strict';
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return ESC[c]; }); }
  function look(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    var cur = scope, parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /* ---- template parsing ---- */
  function parse(tpl) {
    var re = /<(\/?)sc-(for|if)\b([^>]*)>/g, root = { kids: [] }, stack = [root], last = 0, m;
    while ((m = re.exec(tpl))) {
      if (m.index > last) stack[stack.length - 1].kids.push({ t: 'html', s: tpl.slice(last, m.index) });
      last = re.lastIndex;
      if (m[1]) { stack.pop(); continue; }
      var a = m[3], node;
      if (m[2] === 'for') {
        node = { t: 'for', list: (a.match(/list="\{\{([^}]*)\}\}"/) || [])[1], as: (a.match(/as="([^"]+)"/) || [])[1], kids: [] };
      } else {
        node = { t: 'if', value: (a.match(/value="\{\{([^}]*)\}\}"/) || [])[1], kids: [] };
      }
      stack[stack.length - 1].kids.push(node);
      stack.push(node);
    }
    if (last < tpl.length) root.kids.push({ t: 'html', s: tpl.slice(last) });
    return root.kids;
  }

  var EV = { onClick: 'click', onPointerMove: 'pointermove', onPointerLeave: 'pointerleave', onPointerEnter: 'pointerenter',
    onMouseEnter: 'mouseenter', onMouseLeave: 'mouseleave', onLoad: 'load', onInput: 'input', onChange: 'change',
    onKeyDown: 'keydown', onFocus: 'focus', onBlur: 'blur', onSubmit: 'submit' };

  function renderHtml(chunk, scope, ctx) {
    return chunk.replace(/<[a-zA-Z][^<>]*>|[^<]+|</g, function (part) {
      if (part.charAt(0) !== '<' || part.length === 1) {
        return part.replace(/\{\{([^}]*)\}\}/g, function (_, p) { var v = look(p, scope); return v == null || v === false ? '' : esc(v); });
      }
      if (part.indexOf('{{') < 0 && part.indexOf(' on') < 0 && part.indexOf('hint-') < 0) return part;
      var tm = part.match(/^<([a-zA-Z][\w-]*)/), tag = tm[1], rest = part.slice(tm[0].length);
      var selfClose = /\/\s*>$/.test(rest);
      var out = '<' + tag, evs = [];
      rest.replace(/([^\s=\/>]+)(?:\s*=\s*"([^"]*)")?/g, function (_, name, val) {
        if (name.indexOf('hint-') === 0) return '';
        if (val === undefined) { out += ' ' + name; return ''; }
        var single = val.match(/^\{\{([^}]*)\}\}$/);
        if (EV[name] || /^on[A-Z]/.test(name)) {
          var fn = single ? look(single[1], scope) : null;
          if (typeof fn === 'function') { ctx.H.push(fn); evs.push((EV[name] || name.slice(2).toLowerCase()) + ':' + (ctx.H.length - 1)); }
          return '';
        }
        if (name === 'ref') {
          var rf = single ? look(single[1], scope) : null;
          if (typeof rf === 'function') { ctx.R.push(rf); out += ' data-dcref="' + (ctx.R.length - 1) + '"'; }
          return '';
        }
        if (single) {
          var v = look(single[1], scope), aria = name.indexOf('aria-') === 0;
          if (v == null || (v === false && !aria)) return '';
          if (v === true && !aria) { out += ' ' + name + '=""'; return ''; }
          out += ' ' + name + '="' + esc(v) + '"';
          return '';
        }
        out += ' ' + name + '="' + val.replace(/\{\{([^}]*)\}\}/g, function (_, p) { var x = look(p, scope); return x == null ? '' : esc(x); }) + '"';
        return '';
      });
      if (evs.length) out += ' data-dcev="' + evs.join(',') + '"';
      return out + (selfClose ? ' />' : '>');
    });
  }

  function expand(nodes, scope, ctx) {
    var s = '';
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.t === 'html') s += renderHtml(n.s, scope, ctx);
      else if (n.t === 'if') { if (look(n.value, scope)) s += expand(n.kids, scope, ctx); }
      else {
        var list = look(n.list, scope) || [];
        for (var j = 0; j < list.length; j++) { var sc = Object.create(scope); sc[n.as] = list[j]; s += expand(n.kids, sc, ctx); }
      }
    }
    return s;
  }

  /* ---- React-like patching ---- */
  function attrsOf(el) { var o = {}; for (var i = 0; i < el.attributes.length; i++) o[el.attributes[i].name] = el.attributes[i].value; return o; }
  function stamp(el) {
    if (el.nodeType !== 1) return;
    el.__a = attrsOf(el); el.__h = el.innerHTML;
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) stamp(c);
  }
  function mirror(to, from) {
    var i, a;
    for (i = to.attributes.length - 1; i >= 0; i--) { a = to.attributes[i].name; if (!from.hasAttribute(a)) to.removeAttribute(a); }
    for (i = 0; i < from.attributes.length; i++) { a = from.attributes[i]; if (to.getAttribute(a.name) !== a.value) to.setAttribute(a.name, a.value); }
  }

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (u, cb) {
    var prev = this.state || {};
    var part = typeof u === 'function' ? u(prev, this.props) : u;
    if (part == null) return;
    this.state = Object.assign({}, prev, part);
    if (this.__host) this.__host.schedule(prev, cb);
  };
  DCLogic.prototype.forceUpdate = function (cb) { if (this.__host) this.__host.schedule(this.state, cb); };

  function Host(Comp, props, tpl, mountEl) {
    this.c = new Comp(props);
    this.c.props = props;
    this.c.__host = this;
    this.tree = parse(tpl);
    this.el = mountEl;
    this.refs = new Map();
    this.H = []; this.R = [];
    this.pending = null; this.cbs = [];
  }
  Host.prototype.build = function () {
    var ctx = { H: [], R: [] };
    var html = expand(this.tree, this.c.renderVals() || {}, ctx);
    return { html: html, ctx: ctx };
  };
  Host.prototype.mount = function () {
    var b = this.build();
    this.H = b.ctx.H; this.R = b.ctx.R;
    this.el.innerHTML = b.html;
    for (var c = this.el.firstElementChild; c; c = c.nextElementSibling) stamp(c);
    this.post();
    if (this.c.componentDidMount) this.c.componentDidMount();
  };
  Host.prototype.schedule = function (prevState, cb) {
    if (cb) this.cbs.push(cb);
    if (this.pending) return;
    this.pending = { prev: prevState };
    var self = this;
    Promise.resolve().then(function () { self.update(); });
  };
  Host.prototype.update = function () {
    var prev = this.pending ? this.pending.prev : this.c.state;
    this.pending = null;
    var b = this.build();
    this.H = b.ctx.H; this.R = b.ctx.R;
    window.morphdom(this.el, '<div>' + b.html + '</div>', {
      childrenOnly: true,
      onBeforeElUpdated: function (from, to) {
        var prevA = from.__a;
        if (prevA) {
          var next = attrsOf(to), k;
          for (k in next) if (prevA[k] !== next[k]) from.setAttribute(k, next[k]);
          for (k in prevA) if (!(k in next)) from.removeAttribute(k);
          from.__a = next;
          mirror(to, from);
          var h = to.innerHTML;
          if (from.__h === h) return false;
          from.__h = h;
        }
        return true;
      },
      onNodeAdded: function (n) { stamp(n); return n; }
    });
    this.post();
    if (this.c.componentDidUpdate) this.c.componentDidUpdate(this.c.props, prev);
    var cbs = this.cbs; this.cbs = [];
    for (var i = 0; i < cbs.length; i++) cbs[i].call(this.c);
  };
  Host.prototype.post = function () {
    var self = this;
    var evs = this.el.querySelectorAll('[data-dcev]');
    for (var i = 0; i < evs.length; i++) {
      var el = evs[i], spec = el.getAttribute('data-dcev');
      if (el.__evb === spec) continue;
      el.__evb = spec;
      spec.split(',').forEach(function (p) {
        var bits = p.split(':'), name = bits[0], idx = +bits[1], target = el;
        target['on' + name] = function (e) { var f = self.H[idx]; if (f) return f.call(self.c, e); };
        if (name === 'load' && target.complete && target.naturalWidth) {
          setTimeout(function () { var f = self.H[idx]; if (f) f.call(self.c, { type: 'load', target: target, currentTarget: target }); }, 0);
        }
      });
    }
    var seen = new Set(), rs = this.el.querySelectorAll('[data-dcref]');
    for (var j = 0; j < rs.length; j++) {
      var fn = this.R[+rs[j].getAttribute('data-dcref')];
      if (!fn) continue;
      seen.add(fn);
      if (this.refs.get(fn) !== rs[j]) { this.refs.set(fn, rs[j]); fn.call(this.c, rs[j]); }
    }
    this.refs.forEach(function (el, fn) { if (!seen.has(fn)) { self.refs.delete(fn); fn.call(self.c, null); } });
  };

  window.DCLogic = DCLogic;
  window.dcMount = function (Comp, props) {
    var tplEl = document.getElementById('dc-template');
    var mountEl = document.getElementById('app');
    var host = new Host(Comp, props || {}, tplEl.textContent, mountEl);
    host.mount();
    window.addEventListener('pagehide', function () { if (host.c.componentWillUnmount) host.c.componentWillUnmount(); });
    return host;
  };
})();
