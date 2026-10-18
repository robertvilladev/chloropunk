export type RendererChoice = "auto" | "canvas" | "webgl";

/** `?renderer=canvas|webgl`; anything else is "auto". Pure so it tests in node. */
export function rendererFromSearch(search: string): RendererChoice {
  const r = new URLSearchParams(search).get("renderer");
  return r === "canvas" || r === "webgl" ? r : "auto";
}
