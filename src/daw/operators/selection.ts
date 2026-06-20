import type { DAW } from "../daw";
import type { DAWOperator, DAWUpdateInput } from "../../types/daw";

export function remove(id?: string): DAWOperator<DAW> {
  return (daw) => {
    daw.remove(id);
  };
}

export function select(id: string): DAWOperator<DAW> {
  return (daw) => {
    daw.select(id);
  };
}

export function update(patch: DAWUpdateInput): DAWOperator<DAW>;
export function update(id: string, patch: DAWUpdateInput): DAWOperator<DAW>;
export function update(
  idOrPatch: string | DAWUpdateInput,
  maybePatch?: DAWUpdateInput
): DAWOperator<DAW> {
  return (daw) => {
    if (typeof idOrPatch === "string") {
      if (maybePatch !== undefined) {
        daw.update(idOrPatch, maybePatch);
      }
      return;
    }

    daw.update(idOrPatch);
  };
}
