export type Rating = "Outstanding" | "Exceeds" | "Meets" | "Below";

export type PriorCycle = Rating | "Unsatisfactory" | "";

export type CalibratorEmployee = {
  id: number;
  initials: string;
  name: string;
  detail: string;
  manager: string;
  prior: [PriorCycle, PriorCycle, PriorCycle];
  self: Rating;
  managerSuggested: Rating;
  calibrated: Rating;
  nineBox: [number, number];
  flag?: {
    label: string;
    tone: "green" | "amber";
  };
  override?: boolean;
};

export type CalibratedRatings = Record<number, Rating>;

export type RatingOption = {
  label: Rating;
  value: Rating;
};

export type DistributionItem = {
  color: string;
  height: string;
  label: string;
  value: number;
};
