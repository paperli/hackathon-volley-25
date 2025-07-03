export type GameObject = {
  id: string; // unique identifier (e.g., "chair", "table", "fused-chair-table")
  name: string; // display name
  source: "detected" | "forged";
  components?: string[]; // for forged objects, what was combined
};

export type GameTask = {
  id: string;
  description: string;
  requirements: string[]; // object ids required to solve
  solved: boolean;
  solutionHint?: string; // debug hint for solution
};

export type GameState = {
  inventory: GameObject[];
  tasks: GameTask[];
  currentTaskIndex: number; // index in tasks array
}; 