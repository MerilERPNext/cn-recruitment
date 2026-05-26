import { Check, FileText } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "../../shared/atoms/Switch";
import { Typography } from "../../shared/atoms/Typography";
import { mockWizardData } from "./AppraisalCycleWizard";
import WizardShell from "./WizardShell";

const initialLetterTypes = [
  {
    id: "appraisal",
    title: "Appraisal Letter",
    subtitle: "FY26-Appraisal-EN-v3",
    count: 2140,
    active: true,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    iconBorder: "border-blue-200",
  },
  {
    id: "merit",
    title: "Merit / Hike Letter",
    subtitle: "FY26-Merit-EN-v2",
    count: 1820,
    active: true,
    iconColor: "text-green-500",
    iconBg: "bg-green-50",
    iconBorder: "border-green-200",
  },
  {
    id: "promotion",
    title: "Promotion Letter",
    subtitle: "FY26-Promotion-EN-v1",
    count: 184,
    active: true,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-50",
    iconBorder: "border-purple-200",
  },
  {
    id: "bonus",
    title: "Bonus Letter",
    subtitle: "FY26-Bonus-EN-v1",
    count: 1424,
    active: true,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
    iconBorder: "border-orange-200",
  },
  {
    id: "pip",
    title: "PIP Letter",
    subtitle: "PIP-Standard-EN-v4",
    count: 0,
    active: false,
    iconColor: "text-red-500",
    iconBg: "bg-red-50",
    iconBorder: "border-red-200",
  },
  {
    id: "retention",
    title: "Retention Letter",
    subtitle: "Custom — not selected",
    count: 0,
    active: false,
    iconColor: "text-gray-500",
    iconBg: "bg-gray-50",
    iconBorder: "border-gray-200",
  },
];

const initialLanguages = [
  { id: "en", label: "English", count: 1620, active: true },
  { id: "hi", label: "Hindi", count: 384, active: true },
  { id: "ar", label: "Arabic", count: 88, active: true },
  { id: "id", label: "Indonesian", count: 24, active: false },
  { id: "es", label: "Spanish", count: 0, active: false },
];

const waves = [
  {
    id: 1,
    title: "Wave 1 · Sr. Leadership",
    date: "1 Jul 2026 09:00",
    count: 28,
    color: "bg-indigo-500",
  },
  {
    id: 2,
    title: "Wave 2 · People Managers",
    date: "2 Jul 2026 09:00",
    count: 142,
    color: "bg-blue-500",
  },
  {
    id: 3,
    title: "Wave 3 · India Tech (rest)",
    date: "3 Jul 2026 09:00",
    count: 1620,
    color: "bg-sky-500",
  },
  {
    id: 4,
    title: "Wave 4 · India Operations",
    date: "5 Jul 2026 09:00",
    count: 350,
    color: "bg-emerald-500",
  },
];

const LettersRelease = () => {
  const navigate = useNavigate();
  const [letters, setLetters] = useState(initialLetterTypes);
  const [languages, setLanguages] = useState(initialLanguages);
  const [eSignProvider, setEsignProvider] = useState("docusign");
  const [requireEmpEsign, setRequireEmpEsign] = useState(true);
  const [requireMgrEsign, setRequireMgrEsign] = useState(true);

  const toggleLetter = (id: string) => {
    setLetters((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l)),
    );
  };

  const toggleLanguage = (id: string) => {
    setLanguages((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l)),
    );
  };

  const lettersReleaseData = {
    ...mockWizardData,
    activeStepId: "letters-release",
    header: {
      title: "Letters & Release",
      description:
        "Choose letter templates, e-sign provider, and release schedule.",
    },
    validationStatus: "Validation passed",
    nextStepLabel: "Next: Review & Launch",
  };

  return (
    <WizardShell
      data={lettersReleaseData}
      onNext={() =>
        navigate("/webapp/performance-app/appraisal-cycle-wizard/review-launch")
      }
      contentClassName="flex flex-col gap-6 relative pb-8"
    >
      {/* Letter Types Grid */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <Typography
          variant="h3"
          className="text-base font-bold text-gray-900 mb-4"
        >
          Letter types to generate
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {letters.map((letter) => (
            <div
              key={letter.id}
              className={`rounded-xl border p-4 transition-all ${
                letter.active
                  ? "border-gray-200 bg-white shadow-sm"
                  : "border-gray-100 bg-gray-50/50 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                    letter.active
                      ? `${letter.iconBg} ${letter.iconBorder} ${letter.iconColor}`
                      : "bg-white border-gray-200 text-gray-400"
                  }`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <Switch
                  checked={letter.active}
                  onCheckedChange={() => toggleLetter(letter.id)}
                />
              </div>
              <div>
                <Typography
                  variant="bodyMedium"
                  className="font-bold text-gray-900 leading-tight"
                >
                  {letter.title}
                </Typography>
                <Typography
                  variant="caption"
                  className="text-gray-500 block mt-0.5"
                >
                  {letter.subtitle}
                </Typography>
                {letter.count > 0 && letter.active ? (
                  <Typography
                    variant="caption"
                    className="text-gray-600 block mt-2"
                  >
                    Will generate{" "}
                    <span className="font-bold text-gray-900">
                      {letter.count}
                    </span>{" "}
                    letters
                  </Typography>
                ) : (
                  <Typography
                    variant="caption"
                    className="text-gray-400 block mt-2"
                  >
                    Will generate 0 letters
                  </Typography>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Languages & locale */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <Typography
              variant="h3"
              className="text-base font-bold text-gray-900 mb-4"
            >
              Languages & locale
            </Typography>
            <div className="flex flex-wrap gap-3 mb-6">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => toggleLanguage(lang.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                    lang.active
                      ? "border-blue-200 bg-blue-50 text-blue-900"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`relative flex h-4 w-7 shrink-0 items-center rounded-xl transition-colors ${
                      lang.active ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`absolute left-0.5 h-3 w-3 rounded-xl bg-white transition-transform ${
                        lang.active ? "translate-x-3" : "translate-x-0"
                      }`}
                    />
                  </div>
                  <span className="font-semibold">{lang.label}</span>
                  <span
                    className={`text-xs ${lang.active ? "text-blue-500 font-bold" : "text-gray-400 font-medium"}`}
                  >
                    {lang.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Typography
              variant="caption"
              className="font-bold text-gray-700 block mb-1.5"
            >
              Auto-select language based on
            </Typography>
            <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>Employee preferred language (HRIS)</option>
              <option>Location / Country default</option>
              <option>Manual assignment</option>
            </select>
          </div>
        </section>

        {/* e-Signature */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
          <Typography
            variant="h3"
            className="text-base font-bold text-gray-900 mb-4"
          >
            e-Signature
          </Typography>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setEsignProvider("docusign")}
              className={`flex-1 min-w-[120px] rounded-lg border py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                eSignProvider === "docusign"
                  ? "border-blue-500 text-blue-600 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              DocuSign{" "}
              {eSignProvider === "docusign" && (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={() => setEsignProvider("adobe")}
              className={`flex-1 min-w-[120px] rounded-lg border py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                eSignProvider === "adobe"
                  ? "border-blue-500 text-blue-600 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Adobe Sign{" "}
              {eSignProvider === "adobe" && <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setEsignProvider("aadhaar")}
              className={`flex-1 min-w-[120px] rounded-lg border py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                eSignProvider === "aadhaar"
                  ? "border-blue-500 text-blue-600 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Aadhaar e-Sign{" "}
              {eSignProvider === "aadhaar" && <Check className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  requireEmpEsign
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 bg-white group-hover:border-gray-400"
                }`}
              >
                {requireEmpEsign && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={requireEmpEsign}
                onChange={() => setRequireEmpEsign(!requireEmpEsign)}
              />
              <span className="text-sm font-semibold text-gray-800">
                Require employee e-sign on acknowledgment
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  requireMgrEsign
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 bg-white group-hover:border-gray-400"
                }`}
              >
                {requireMgrEsign && (
                  <Check className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={requireMgrEsign}
                onChange={() => setRequireMgrEsign(!requireMgrEsign)}
              />
              <span className="text-sm font-semibold text-gray-800">
                Require manager e-sign on merit letter
              </span>
            </label>
          </div>
        </section>
      </div>

      {/* Release Schedule */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm overflow-hidden">
        <Typography
          variant="h3"
          className="text-base font-bold text-gray-900 mb-1"
        >
          Release schedule
        </Typography>
        <Typography variant="caption" className="text-gray-500 block mb-6">
          Staggered release by BU & manager hierarchy
        </Typography>

        <div className="flex flex-col gap-3 mb-6">
          {waves.map((wave) => (
            <div
              key={wave.id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.5fr_1fr_100px_auto] items-center gap-y-3 gap-x-4 rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4 col-start-1 col-end-2 sm:col-start-1 sm:col-end-2 row-start-1 row-end-2 min-w-0">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${wave.color}`}
                >
                  {wave.id}
                </div>
                <Typography
                  variant="bodyMedium"
                  className="font-bold text-gray-900 truncate"
                >
                  {wave.title}
                </Typography>
              </div>

              <Typography
                variant="bodySmall"
                className="col-start-1 col-end-2 sm:col-start-2 sm:col-end-3 row-start-2 row-end-3 sm:row-start-1 sm:row-end-2 text-gray-600 font-medium pl-9 sm:pl-0 whitespace-nowrap sm:justify-self-center"
              >
                {wave.date}
              </Typography>

              <Typography
                variant="bodyMedium"
                className="col-start-2 col-end-3 sm:col-start-3 sm:col-end-4 row-start-2 row-end-3 sm:row-start-1 sm:row-end-2 font-bold text-gray-900 justify-self-end sm:justify-self-center"
              >
                {wave.count}
              </Typography>

              <button className="col-start-2 col-end-3 sm:col-start-4 sm:col-end-5 row-start-1 row-end-2 sm:row-start-1 sm:row-end-2 rounded-md border border-gray-200 bg-white px-3 sm:px-6 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 justify-self-end">
                Edit
              </button>
            </div>
          ))}
        </div>

        {/* Recall Window Box */}
        <div className="rounded-lg bg-yellow-50/70 p-4 border border-yellow-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Typography
              variant="bodyMedium"
              className="font-bold text-amber-900 block mb-0.5"
            >
              Recall window
            </Typography>
            <Typography variant="caption" className="text-amber-800/80">
              HR Admin can recall a released letter within{" "}
              <span className="font-bold text-amber-900">48 hours</span>;
              recalls beyond require Super Admin.
            </Typography>
          </div>
          <div className="relative shrink-0">
            <input
              type="text"
              value="48"
              readOnly
              className="w-20 rounded-md border border-amber-200 bg-amber-100/50 py-1.5 px-3 text-center text-sm font-bold text-amber-900 focus:outline-none"
            />
          </div>
        </div>
      </section>
    </WizardShell>
  );
};

export default LettersRelease;
