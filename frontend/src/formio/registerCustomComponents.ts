import { Formio } from "formiojs";
import StarRating from "./custom/StarRating";

export function registerCustomComponents() {
  Formio.use({
    components: {
      starrating: StarRating
    }
  });
}