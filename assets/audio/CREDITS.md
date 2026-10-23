# Music credits

Both tracks are licensed [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (licences checked 2026-10-23). The game also shows this on the main menu (footer + CREDITS overlay, `MUSIC_CREDITS` in `src/fx/music.ts`).

| File | Title | Author | Source | Changes |
|---|---|---|---|---|
| `nlv-cyberpunk.ogg` | Cyberpunk/Synthwave project track | NLV | <https://opengameart.org/content/cyberpunksynthwave-project-track> | Cut to 0:45.1–4:34 (starts on the drop, skips the slow intro; trailing silence dropped), 30 ms fade-in, 2 s fade-out, re-encoded from WAV to OGG Vorbis q4 |
| `spring-synthwave.ogg` | 06-06-19 Synthwave | Spring | <https://opengameart.org/content/06-06-19-synthwave> | None (original OGG) |

The NLV source page also offers OGA-BY; the Spring page also offers CC-BY 3.0, CC-BY-SA and OGA-BY. We use CC-BY 4.0 for both. NLV asks (as a courtesy) to be told when the track is used.

Re-encode recipe (ffmpeg, e.g. a one-off `npx ffmpeg-static`, not a project dependency):

```
ffmpeg -ss 45.1 -i cyebrcunk.wav -t 228.9 -af "afade=t=in:d=0.03,afade=t=out:st=226.9:d=2" -c:a libvorbis -q:a 4 nlv-cyberpunk.ogg
```
