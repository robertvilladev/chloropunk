# Music credits

Both tracks are licensed [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) (licences checked 2026-10-23). The game also shows this on the main menu (footer + CREDITS overlay, `MUSIC_CREDITS` in `src/fx/music.ts`).

| File | Title | Author | Source | Changes |
|---|---|---|---|---|
| `nlv-cyberpunk.ogg` | Cyberpunk/Synthwave project track | NLV | <https://opengameart.org/content/cyberpunksynthwave-project-track> | Trimmed to 4:34 (dropped trailing silence), 2 s fade-out, re-encoded from WAV to OGG Vorbis q4 |
| `spring-synthwave.ogg` | 06-06-19 Synthwave | Spring | <https://opengameart.org/content/06-06-19-synthwave> | None (original OGG) |

The NLV source page also offers OGA-BY; the Spring page also offers CC-BY 3.0, CC-BY-SA and OGA-BY. We use CC-BY 4.0 for both. NLV asks (as a courtesy) to be told when the track is used.

Re-encode recipe (ffmpeg, e.g. a one-off `npx ffmpeg-static`, not a project dependency):

```
ffmpeg -i cyebrcunk.wav -t 274 -af "afade=t=out:st=272:d=2" -c:a libvorbis -q:a 4 nlv-cyberpunk.ogg
```
