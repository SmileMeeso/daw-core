import type { DAW, DAWInternals } from "../daw";
import { DAW_INTERNALS } from "../daw";

export function getInternals(daw: DAW): DAWInternals {
  return daw[DAW_INTERNALS]();
}
