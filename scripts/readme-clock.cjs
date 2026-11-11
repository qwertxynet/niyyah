// Preload for readme-shots.cjs: moves the page's clock to ?readme-now=<ms> and lets it keep ticking.
const flag = new URLSearchParams(window.location.search).get('readme-now');
if (flag) {
  const Real = Date;
  const offset = Number(flag) - Real.now();
  class FakeDate extends Real {
    constructor(...args) {
      if (args.length === 0) super(Real.now() + offset);
      else super(...args);
    }
    static now() {
      return Real.now() + offset;
    }
  }
  window.Date = FakeDate;
}
