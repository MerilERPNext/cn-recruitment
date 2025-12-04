import { ScaleSettings } from "../../../types/goalReviewDetails";

export const getRatingShapFromScalesSettings = (scalesSettings: ScaleSettings["settings"]) => {
    if (scalesSettings?.show_stars) return "star";
    else if (scalesSettings?.enable_dropdown) return "dropdown";
    return "circle";
}