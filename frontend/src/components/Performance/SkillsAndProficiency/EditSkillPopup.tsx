import React, { useEffect } from "react";
import { BookOpen, Check, Search, Sparkles, Trash2, UserRound, X } from "lucide-react";
import Badge from "../../shared/Badge";
import { Typography } from "../../shared/atoms/Typography";

interface EditableSkill {
  name: string;
  lastAssessed: string;
  mentor: string;
  current: number;
  target: number;
  delta: string;
}

interface EditSkillPopupProps {
  skill: EditableSkill;
  onClose: () => void;
}

const skillsLibrary = [
  { name: "User Research", hot: true },
  { name: "Usability Testing", featured: true },
  { name: "Survey Design" },
  { name: "Quant Research" },
  { name: "Generative Research", hot: true },
  { name: "Diary Studies" },
  { name: "Card Sorting" },
  { name: "A/B Testing & Experimentation", hot: true },
];

const proficiencyLevels = [
  { level: 1, label: "Novice", description: "Aware of the concept. Needs heavy guidance. Can't deliver independently." },
  { level: 2, label: "Beginner", description: "Performs basic tasks with supervision. Recognises common patterns." },
  { level: 3, label: "Intermediate", description: "Independent on standard work. Asks for help on ambiguous problems." },
  { level: 4, label: "Advanced", description: "Can teach others. Handles complex cases. Mentors mid-level peers." },
  { level: 5, label: "Expert", description: "Industry-level authority. Sets the standard for the team / function." },
];

const learningPlan = [
  { icon: UserRound, title: "Riya Banerjee - weekly research craft 1:1", action: "Mentor" },
  { icon: Sparkles, title: "Just Enough Research - Erika Hall", action: "Book - LMS" },
  { icon: BookOpen, title: "Shadow 4 usability sessions this quarter", action: "Action" },
];

const getLevelLabel = (level: number) => proficiencyLevels.find((item) => item.level === level)?.label ?? "Beginner";

const EditSkillPopup: React.FC<EditSkillPopupProps> = ({ skill, onClose }) => {
  const gap = Math.max(skill.target - skill.current, 0);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/45 p-4 font-brand animate-fadeIn" onClick={onClose}>
      <div
        className="animate-slideUp flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-skill-title"
      >
        <div className="relative border-b border-gray-100 px-6 py-5">
          <Badge label="Edit Skill" backgroundColor="bg-primary-50" textColor="text-primary-700" size="sm" />
          <Typography id="edit-skill-title" variant="h3" className="mt-3 text-text-title">
            {skill.name}
          </Typography>
          <Typography variant="caption" className="mt-1 block text-text-body2">
            Research & Insight - Required for Sr. Designer career path - Last assessed {skill.lastAssessed}
          </Typography>

          <button
            type="button"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close edit skill popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-gray-100 bg-white px-6 py-4 pb-6 lg:border-b-0 lg:border-r">
            <Typography variant="caption" className="font-bold uppercase tracking-wide text-gray-500">
              Skill Library
            </Typography>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                className="h-9 w-full rounded-md border border-gray-200 bg-primary-50/50 pl-9 pr-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-50"
                defaultValue="research"
                aria-label="Search skills"
              />
            </div>

            <div className="mt-3 space-y-1.5">
              {skillsLibrary.map((item) => {
                const isSelected = item.name === "User Research";

                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`flex h-10 w-full items-center justify-between rounded-md border px-3 text-left text-xs transition ${
                      isSelected
                        ? "border-success-500 bg-success-50 text-text-title shadow-sm"
                        : "border-gray-100 bg-white text-gray-700 hover:border-success-100 hover:bg-success-50/30"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`h-5 w-1 rounded-md ${isSelected ? "bg-success-600" : "bg-success-500"}`} />
                      <span className={`truncate ${isSelected ? "font-bold" : "font-semibold"}`}>{item.name}</span>
                    </span>
                    {item.hot ? <Badge label="HOT" backgroundColor="bg-transparent" textColor="text-warning-700" size="sm" /> : null}
                    {item.featured ? <Sparkles className="h-3 w-3 text-success-600" /> : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="mt-3 h-9 w-full rounded-md border border-dashed border-gray-200 text-[11px] font-bold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
            >
              + Suggest a new skill
            </button>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5 pb-28">
            <section>
              <Typography variant="bodySmall" className="font-bold text-text-title">
                Current proficiency
              </Typography>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                {proficiencyLevels.map((item) => {
                  const isCurrent = item.level === skill.current;

                  return (
                    <div
                      key={item.level}
                      className={`min-h-[150px] rounded-lg border p-4 transition ${
                        isCurrent ? "border-warning-500 bg-warning-50/60 shadow-sm" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className={`text-xs font-bold ${isCurrent ? "text-warning-700" : "text-primary-600"}`}>L{item.level}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Typography variant="bodySmall" className="font-bold text-text-title">
                          {item.label}
                        </Typography>
                        {isCurrent ? (
                          <Badge
                            label="Current"
                            backgroundColor="bg-warning-100"
                            textColor="text-warning-800"
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
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
                {proficiencyLevels.map((item) => {
                  const isTarget = item.level === skill.target;
                  const isBelowCurrent = item.level < skill.current;

                  return (
                    <div
                      key={item.level}
                      className={`min-h-[150px] rounded-lg border p-4 transition ${
                        isTarget
                          ? "border-primary-500 bg-primary-50/70 shadow-sm"
                          : isBelowCurrent
                            ? "border-gray-100 bg-gray-50/70 opacity-60"
                            : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className={`text-xs font-bold ${isTarget ? "text-primary-700" : "text-primary-600"}`}>L{item.level}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Typography variant="bodySmall" className="font-bold text-text-title">
                          {item.label}
                        </Typography>
                        {isTarget ? (
                          <Badge
                            label="Target"
                            backgroundColor="bg-primary-100"
                            textColor="text-primary-700"
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

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-secondary-100 bg-secondary-50 px-5 py-4">
              <span className="text-base font-bold text-secondary-700">
                {getLevelLabel(skill.current)} &gt; {getLevelLabel(skill.target)}
              </span>
              <Badge label={`+${gap} ${gap === 1 ? "level" : "levels"} gap`} backgroundColor="bg-white shadow-sm" textColor="text-secondary-700" size="md" />
            </div>

            <label className="mt-6 block">
              <Typography variant="caption" className="font-bold text-text-body2">
                Why upskill here? (visible to manager)
              </Typography>
              <textarea
                className="mt-2 min-h-[86px] w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-50"
                defaultValue={`Oxygen 2.0 rollout needs deeper ${skill.name.toLowerCase()} craft - I've been leaning on ${skill.mentor.split(" ")[0]} for every study. Closing this gap unlocks independence on H2 product bets.`}
              />
            </label>

            <section className="mt-6 rounded-lg border border-gray-200 bg-primary-50/50 p-4">
              <div className="flex items-center justify-between gap-4">
                <Typography variant="bodySmall" className="font-bold text-text-title">
                  Learning plan
                </Typography>
                <Typography variant="caption" className="text-text-body2">
                  2 resources - 1 mentor
                </Typography>
              </div>
              <div className="mt-3 space-y-2">
                {learningPlan.map(({ icon: Icon, title, action }) => (
                  <div key={title} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-primary-600" />
                      <span className="truncate text-sm font-medium text-gray-700">{title}</span>
                    </span>
                    <div className="shrink-0">
                      <Badge label={action} backgroundColor="bg-primary-50" textColor="text-primary-700" size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-primary-50/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-error-600 hover:text-error-700">
            <Trash2 className="h-4 w-4" />
            Remove skill
          </button>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="h-10 rounded-lg border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="button" className="h-10 rounded-lg bg-primary-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600" onClick={onClose}>
              Save Skill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSkillPopup;
