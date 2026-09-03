import React, { useEffect, useState } from "react";
import { Check, Search, Sparkles, Trash2, X } from "lucide-react";
import Badge from "../../shared/Badge";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { learningPlan, proficiencyLevels, skillsLibrary } from "../mockdata";
import type { Skill } from "../types";

interface EditSkillPopupProps {
  skill: Skill;
  onClose: () => void;
}

const getLevelLabel = (level: number) => proficiencyLevels.find((item) => item.level === level)?.label ?? "Beginner";

const EditSkillPopup: React.FC<EditSkillPopupProps> = ({ skill, onClose }) => {
  const gap = Math.max(skill.target - skill.current, 0);
  const [isFocusSkill, setIsFocusSkill] = useState(false);
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-[70] flex bg-black/60 backdrop-blur-xs font-brand animate-fadeIn ${
        isCompact ? "items-stretch justify-stretch p-0" : "items-center justify-center p-4"
      }`}
      onClick={onClose}
    >
      <div
        className={`animate-slideUp flex w-full flex-col overflow-hidden bg-card border border-border shadow-2xl ${
          isCompact ? "h-[100dvh] max-h-none rounded-none" : "max-h-[92vh] max-w-7xl rounded-xl"
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-skill-title"
      >
        <div className={`relative shrink-0 border-b border-border ${isCompact ? "px-4 py-4 pr-14" : "px-6 py-5"}`}>
          <Badge label="Edit Skill" backgroundColor="bg-primary/10 border border-primary/20" textColor="text-primary" size="sm" />
          <Typography id="edit-skill-title" variant={isCompact ? "h4" : "h3"} className="mt-3 break-words text-text-title font-bold">
            {skill.name}
          </Typography>
          <Typography variant="caption" className="mt-1 block leading-5 text-text-body2">
            Research & Insight - Required for Sr. Designer career path - Last assessed {skill.lastAssessed}
          </Typography>

          <button
            type="button"
            className={`absolute flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-text-body2 transition hover:bg-slate-500/10 hover:text-text-title cursor-pointer ${
              isCompact ? "right-4 top-4" : "right-5 top-5"
            }`}
            onClick={onClose}
            aria-label="Close edit skill popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={`${isCompact ? "block flex-1 overflow-y-auto" : "grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[330px_minmax(0,1fr)]"}`}>
          <aside className={`${isCompact ? "border-b px-4 py-4" : "min-h-0 overflow-y-auto border-b px-6 py-4 pb-6 lg:border-b-0 lg:border-r"} border-border bg-card`}>
            <Typography variant="caption" className="font-bold uppercase tracking-wide text-text-body2">
              Skill Library
            </Typography>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-body2" />
              <input
                className="h-9 w-full rounded-md border border-border bg-slate-500/10 pl-9 pr-3 text-xs text-text-title outline-none transition placeholder:text-text-body2 focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary"
                defaultValue="research"
                aria-label="Search skills"
              />
            </div>

            <div className={isCompact ? "mt-3 flex gap-2 overflow-x-auto pb-1" : "mt-3 space-y-1.5"}>
              {skillsLibrary.map((item) => {
                const isSelected = item.name === "User Research";

                return (
                  <button
                    key={item.name}
                    type="button"
                    aria-label={`Select ${item.name} skill`}
                    className={`flex h-10 items-center justify-between rounded-md border px-3 text-left text-xs transition cursor-pointer ${
                      isCompact ? "w-auto min-w-[150px] shrink-0" : "w-full"
                    } ${
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10 text-text-title shadow-sm"
                        : "border-border bg-card text-text-title hover:border-emerald-500/30 hover:bg-emerald-500/5"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-5 w-1 rounded-md ${isSelected ? "bg-emerald-500" : "bg-emerald-500/50"}`} />
                      <span className={`truncate ${isSelected ? "font-bold" : "font-semibold"}`}>{item.name}</span>
                    </span>
                    {item.hot ? <Badge label="HOT" backgroundColor="bg-transparent" textColor="text-amber-500" size="sm" /> : null}
                    {item.featured ? <Sparkles className="h-3 w-3 text-emerald-500" /> : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="mt-3 h-9 w-full rounded-md border border-dashed border-border text-[11px] font-bold text-primary transition hover:border-primary hover:bg-primary/10 cursor-pointer"
              aria-label="Suggest a new skill"
            >
              + Suggest a new skill
            </button>
          </aside>

          <div className={isCompact ? "px-4 py-4 pb-6" : "min-h-0 overflow-y-auto p-5 pb-28"}>
            <section>
              <Typography variant="bodySmall" className="font-bold text-text-title">
                Current proficiency
              </Typography>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {proficiencyLevels.map((item) => {
                  const isCurrent = item.level === skill.current;

                  return (
                    <div
                      key={item.level}
                      className={`${isCompact ? "min-h-0 p-3" : "min-h-[150px] p-4"} rounded-lg border transition ${
                        isCurrent ? "border-amber-500/50 bg-amber-500/10 shadow-sm" : "border-border bg-card"
                      }`}
                    >
                      <div className={`text-xs font-bold ${isCurrent ? "text-amber-500" : "text-primary"}`}>L{item.level}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Typography variant="bodySmall" className="font-bold text-text-title">
                          {item.label}
                        </Typography>
                        {isCurrent ? (
                          <Badge
                            label="Current"
                            backgroundColor="bg-amber-500/20"
                            textColor="text-amber-500"
                            size="sm"
                            icon={<Check className="h-3 w-3" />}
                          />
                        ) : null}
                      </div>
                      <Typography variant="caption" className="mt-2 block leading-5 text-text-body2">
                        {item.description}
                      </Typography>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-6">
              <Typography variant="bodySmall" className="font-bold text-text-title">
                Target proficiency for FY26
              </Typography>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {proficiencyLevels.map((item) => {
                  const isTarget = item.level === skill.target;
                  const isBelowCurrent = item.level < skill.current;

                  return (
                    <div
                      key={item.level}
                      className={`${isCompact ? "min-h-0 p-3" : "min-h-[150px] p-4"} rounded-lg border transition ${
                        isTarget
                          ? "border-primary/50 bg-primary/10 shadow-sm"
                          : isBelowCurrent
                            ? "border-border bg-slate-500/10 opacity-60"
                            : "border-border bg-card"
                      }`}
                    >
                      <div className={`text-xs font-bold ${isTarget ? "text-primary" : "text-text-body2"}`}>L{item.level}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Typography variant="bodySmall" className="font-bold text-text-title">
                          {item.label}
                        </Typography>
                        {isTarget ? (
                          <Badge
                            label="Target"
                            backgroundColor="bg-primary/20"
                            textColor="text-primary"
                            size="sm"
                            icon={<Check className="h-3 w-3" />}
                          />
                        ) : null}
                      </div>
                      <Typography variant="caption" className="mt-2 block leading-5 text-text-body2">
                        {item.description}
                      </Typography>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className={`mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 ${isCompact ? "px-3 py-3" : "px-5 py-4"}`}>
              <span className="text-base font-bold text-primary">
                {getLevelLabel(skill.current)} &gt; {getLevelLabel(skill.target)}
              </span>
              <Badge label={`+${gap} ${gap === 1 ? "level" : "levels"} gap`} backgroundColor="bg-card border border-border shadow-sm" textColor="text-primary" size="md" />
            </div>

            <label className="mt-6 block">
              <Typography variant="caption" className="font-bold text-text-body2">
                Why upskill here? (visible to manager)
              </Typography>
              <textarea
                className="mt-2 min-h-[86px] w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm leading-6 text-text-title placeholder:text-text-body2 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                defaultValue={`Oxygen 2.0 rollout needs deeper ${skill.name.toLowerCase()} craft - I've been leaning on ${skill.mentor.split(" ")[0]} for every study. Closing this gap unlocks independence on H2 product bets.`}
                aria-label={`Why upskill in ${skill.name}`}
              />
            </label>

            <section className="mt-6 rounded-lg border border-border bg-slate-500/10 p-4">
              <div className={`flex gap-2 ${isCompact ? "flex-col" : "items-center justify-between"}`}>
                <Typography variant="bodySmall" className="font-bold text-text-title">
                  Learning plan
                </Typography>
                <Typography variant="caption" className="text-text-body2">
                  2 resources - 1 mentor
                </Typography>
              </div>
              <div className="mt-3 space-y-2">
                {learningPlan.map(({ icon: Icon, title, action }) => (
                  <div key={title} className={`flex gap-3 rounded-lg bg-card border border-border px-3 py-2 shadow-sm ${isCompact ? "flex-col" : "items-center justify-between"}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className={`${isCompact ? "whitespace-normal" : "truncate"} text-sm font-medium text-text-title`}>{title}</span>
                    </span>
                    <div className="shrink-0">
                      <Badge label={action} backgroundColor="bg-primary/10 border border-primary/20" textColor="text-primary" size="sm" />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/10 cursor-pointer"
                aria-label="Add learning resource or action"
              >
                + Add resource or action
              </button>
            </section>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <input
                aria-label={`Mark ${skill.name} as FY26 focus skill`}
                type="checkbox"
                checked={isFocusSkill}
                onChange={(event) => setIsFocusSkill(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-500/40 text-amber-500 accent-amber-500"
              />
              <span>
                <Typography variant="bodySmall" className="font-bold text-amber-500">
                  Mark as FY26 focus skill
                </Typography>
                <Typography variant="caption" className="mt-1 block leading-5 text-text-body2">
                  Appears in Development Plan and weekly check-in nudges. Max 3 focus skills at a time.
                </Typography>
              </span>
            </label>
          </div>
        </div>

        <div className={`shrink-0 border-t border-border bg-card ${isCompact ? "px-4 py-3" : "px-6 py-4"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 cursor-pointer" aria-label={`Remove ${skill.name}`}>
            <Trash2 className="h-4 w-4" />
            Remove skill
          </button>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <button
              type="button"
              className="h-10 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-text-title transition hover:bg-slate-500/10 cursor-pointer"
              onClick={onClose}
              aria-label="Cancel editing skill"
            >
              Cancel
            </button>
            <button type="button" className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 cursor-pointer" onClick={onClose} aria-label={`Save ${skill.name}`}>
              Save Skill
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSkillPopup;
