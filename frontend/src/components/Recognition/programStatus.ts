import { RecognitionProgram } from "../../types/recognition";

/**
 * Active/Inactive state and the countdown pill shown on the "All Programs" card.
 *
 * Kept out of the component so the rules stay testable on their own — the
 * component only renders what these return.
 */

// Days between today and the program end date (clamped at 0).
export const daysLeftUntil = (end?: string): number => {
  if (!end) return 0;
  const parsed = new Date(end).getTime();
  if (Number.isNaN(parsed)) return 0;
  const diff = Math.ceil((parsed - Date.now()) / 86400000);
  return Math.max(0, diff);
};

// A program stays Active through the whole of its end date; Inactive after that.
// Without an end date we fall back to whatever status the API sent.
export const isProgramActive = (program: RecognitionProgram): boolean => {
  if (!program.end_date) {
    return (program.status || "").toLowerCase() !== "inactive";
  }
  const end = new Date(program.end_date);
  if (Number.isNaN(end.getTime())) return true;
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= Date.now();
};

export const formatDaysLeft = (days: number) => {
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
};

export type ProgramPill = {
  label: string;
  bgClass: string;
  textClass: string;
  showTimer: boolean;
};

// The countdown only surfaces in the final week: amber from 7 days out, red in
// the last 3. Otherwise the card just reads Active / Inactive.
export const getProgramPill = (program: RecognitionProgram): ProgramPill => {
  if (!isProgramActive(program)) {
    return {
      label: "Inactive",
      bgClass: "bg-slate-100",
      textClass: "text-slate-600",
      showTimer: false,
    };
  }

  const days = program.days_left ?? daysLeftUntil(program.end_date);

  if (days <= 3) {
    return {
      label: formatDaysLeft(days),
      bgClass: "bg-red-100",
      textClass: "text-red-700",
      showTimer: true,
    };
  }

  if (days <= 7) {
    return {
      label: formatDaysLeft(days),
      bgClass: "bg-amber-100",
      textClass: "text-amber-800",
      showTimer: true,
    };
  }

  return {
    label: "Active",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    showTimer: false,
  };
};

// Active programs first, then Inactive; newest end date first within each group.
export const sortPrograms = (items: RecognitionProgram[]): RecognitionProgram[] =>
  [...items].sort((a, b) => {
    const activeDiff = Number(isProgramActive(b)) - Number(isProgramActive(a));
    if (activeDiff !== 0) return activeDiff;
    return (
      new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime()
    );
  });
