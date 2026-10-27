/* Late-bound callbacks so screens never import main.js (no circular imports). */
export const bus = {
  ui: null,
  render() {},
  toast() {},
  go() {}
};
