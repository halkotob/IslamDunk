// A virtualised list: fixed-height rows, only the visible ones (plus a margin) are in the DOM.
export class VList {
  constructor(host, { rowH = 44, render, onPick }) {
    this.host = host; this.rowH = rowH; this.render = render; this.onPick = onPick; this.n = 0; this.sel = -1;
    host.classList.add('vlist');
    this.pad = document.createElement('div'); this.pad.className = 'vpad'; host.appendChild(this.pad);
    this.rows = new Map();
    host.addEventListener('scroll', () => this.draw(), { passive: true });
    new ResizeObserver(() => this.draw()).observe(host);
    host.addEventListener('click', e => { const r = e.target.closest('.vrow'); if (r) this.onPick(+r.dataset.i); });
  }
  set(n) { this.n = n; this.pad.style.height = n * this.rowH + 'px'; this.refresh(); }
  refresh() { for (const r of this.rows.values()) r.remove(); this.rows.clear(); this.draw(); }
  update(i) { const r = this.rows.get(i); if (r) { r.replaceChildren(); this.render(r, i); r.classList.toggle('sel', i === this.sel); } }
  select(i, scroll = true) {
    const old = this.rows.get(this.sel); if (old) old.classList.remove('sel');
    this.sel = i; const r = this.rows.get(i); if (r) r.classList.add('sel');
    if (scroll && i >= 0) {
      const top = i * this.rowH, h = this.host.clientHeight;
      if (top < this.host.scrollTop) this.host.scrollTop = top;
      else if (top + this.rowH > this.host.scrollTop + h) this.host.scrollTop = top + this.rowH - h;
      this.draw();
    }
  }
  draw() {
    const h = this.host.clientHeight || 600, top = this.host.scrollTop;
    const a = Math.max(0, Math.floor(top / this.rowH) - 8), b = Math.min(this.n, Math.ceil((top + h) / this.rowH) + 8);
    for (const [i, r] of this.rows) if (i < a || i >= b) { r.remove(); this.rows.delete(i); }
    for (let i = a; i < b; i++) {
      if (this.rows.has(i)) continue;
      const r = document.createElement('div'); r.className = 'vrow' + (i === this.sel ? ' sel' : ''); r.dataset.i = i;
      r.style.transform = `translateY(${i * this.rowH}px)`; r.style.height = this.rowH + 'px';
      this.render(r, i); this.pad.appendChild(r); this.rows.set(i, r);
    }
  }
}
