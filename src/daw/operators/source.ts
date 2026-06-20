import type { DAW } from "../daw";
import type { AudioSourceInput, DAWOperator } from "../../types/daw";
import { getInternals } from "./internals";

export function add(source: AudioSourceInput = {}): DAWOperator<DAW> {
  return (daw) => getInternals(daw).addSource(source);
}
