/**
 * Type declarations for importing JSON files
 */

declare module "*.json" {
  const value: any;
  export default value;
}

// Specific type declarations for our data files
declare module "@assets/data/enemies.json" {
  import type { EnemyData } from "@/types";
  const enemies: Record<string, EnemyData>;
  export default enemies;
}

declare module "@assets/data/weapons.json" {
  import type { WeaponData } from "@/types";
  const weapons: Record<string, WeaponData>;
  export default weapons;
}

declare module "@assets/data/waves.json" {
  import type { WaveData } from "@/types";
  const data: { waves: WaveData[] };
  export default data;
}
