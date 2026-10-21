/**
 * Type declarations for importing JSON files
 */

declare module "*.json" {
  const value: any;
  export default value;
}

// Specific type declarations for our data files
declare module "@assets/data/enemies.json" {
  import type { EnemyDef } from "@/types";
  const enemies: Record<string, EnemyDef>;
  export default enemies;
}

declare module "@assets/data/weapons.json" {
  import type { WeaponDef } from "@/types";
  const weapons: Record<string, WeaponDef>;
  export default weapons;
}

declare module "@assets/data/character.json" {
  import type { CharacterDef } from "@/types";
  const character: CharacterDef;
  export default character;
}

declare module "@assets/data/waves.json" {
  import type { WaveDef, WaveScaling } from "@/types";
  const data: { scaling: WaveScaling; waves: WaveDef[] };
  export default data;
}

declare module "@assets/data/items.json" {
  import type { ItemDef } from "@/types";
  const items: Record<string, ItemDef>;
  export default items;
}

declare module "@assets/data/upgrades.json" {
  import type { StatKey } from "@/types";
  const upgrades: Partial<Record<StatKey, [number, number, number, number]>>;
  export default upgrades;
}
