/**
 * Minimal ambient declaration for the `qz-tray` package, which ships no types.
 * The library is consumed through a deliberately loose `any` surface in
 * hooks/usePrinter.ts and lib/cashDrawerKick.ts.
 */
declare module "qz-tray" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qz: any;
  export default qz;
}
