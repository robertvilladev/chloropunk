import { parseGrid, type Grid } from "./grid";

/** 8x8 lime scrap nut (also serves as XP), two-frame shimmer. Drawn at 3x. */
export const PICKUPS: { key: "pickup_scrap"; frames: [Grid, Grid] }[] = [
  {
    key: "pickup_scrap",
    frames: [
      parseGrid(`
..kkkk..
.kyyyyk.
kywwyyyk
kywkkyyk
kyykkyyk
kyyyyyyk
.kyyyyk.
..kkkk..
`),
      parseGrid(`
..kkkk..
.kyyyyk.
kyyyyyyk
kyykkyyk
kyykkwyk
kyyyywwk
.kyyyyk.
..kkkk..
`),
    ],
  },
];
