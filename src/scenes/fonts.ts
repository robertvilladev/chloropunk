export const FONT_SPECS = ["64px Bungee", "16px 'IBM Plex Mono'", "600 16px 'IBM Plex Mono'"];

/** Resolves when every font load settled or after timeoutMs; never rejects. */
export function loadFonts(fonts: Pick<FontFaceSet, "load">, specs: string[], timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const loaded = Promise.allSettled(specs.map((s) => fonts.load(s))).then(() => undefined);
  return Promise.race([loaded, timeout]).finally(() => clearTimeout(timer));
}
