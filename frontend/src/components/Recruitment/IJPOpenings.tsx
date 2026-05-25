/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import { Form } from "@tsed/react-formio";
import {
  ijpApplicationSteps,
  ijpApplicationSchemas,
  IJPFormSchemaKeys,
} from "./ijpApplicationFormSchemas";
import {
  Search,
  SlidersHorizontal,
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  CheckCircle2,
  Copy,
  Link2,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const JOBS = [
  {
    id: "job-1",
    code: "REC_0001",
    title: "Senior Frontend Engineer (React)",
    dept: "Engineering",
    loc: "Bangalore, KA, India",
    company: "Acme Corp Pvt. Ltd.",
    remote: "No",
    type: "Full-Time",
    expires: "30-09-2026",
    openSince: "01-04-2026",
    salary: "₹18–26 LPA",
    exp: "4–7 years",
    hiringLead: "Priya Sharma (EMP001)",
    recruiter: "Rahul Mehta",
    desc: "We are seeking a Senior Frontend Engineer to build high-performance React applications, contribute to our shared UI library, and collaborate closely with product managers and designers.",
    reqs: [
      "Extensive experience with React, TypeScript, and TailwindCSS.",
      "Strong understanding of frontend state management (Zustand, Redux, or context).",
      "Knowledge of client-side performance optimization and bundle sizing.",
      "Experience writing robust unit and integration tests.",
    ],
  },
  {
    id: "job-2",
    code: "REC_0002",
    title: "Product Manager (Tech)",
    dept: "Product",
    loc: "Branch Office – Mumbai – MH, Mumbai",
    company: "Acme Corp Pvt. Ltd.",
    remote: "No",
    type: "Full-Time",
    expires: "29-07-2026",
    openSince: "15-03-2026",
    salary: "₹20–28 LPA",
    exp: "3–6 years",
    hiringLead: "Sneha Kapoor (EMP002)",
    recruiter: "Anil Verma",
    desc: "Looking for a Product Manager to lead product execution, design user workflows, and own the roadmap for core employee experiences. You will translate vision into detailed specifications.",
    reqs: [
      "Proven track record of shipping B2B SaaS products.",
      "Excellent communication and cross-functional leadership skills.",
      "Data-driven mindset with experience using Mixpanel or Amplitude.",
      "Technical background (CS degree or engineering experience) preferred.",
    ],
  },
  {
    id: "job-3",
    code: "REC_0003",
    title: "UI/UX Designer",
    dept: "Design",
    loc: "Remote",
    company: "Acme Corp Pvt. Ltd.",
    remote: "Yes",
    type: "Remote / Hybrid",
    expires: "24-08-2026",
    openSince: "10-04-2026",
    salary: "₹12–18 LPA",
    exp: "2–5 years",
    hiringLead: "Kavita Nair (EMP003)",
    recruiter: "Deepak Joshi",
    desc: "Join our creative team to craft intuitive, beautiful user experiences. You will own the design lifecycle from wireframes and user research to high-fidelity prototypes and developer handoff.",
    reqs: [
      "Stunning portfolio showcasing responsive web and mobile interfaces.",
      "Proficiency in Figma, design systems, and component architecture.",
      "Ability to run usability tests and gather actionable feedback.",
      "Understanding of HTML/CSS to coordinate smoothly with engineers.",
    ],
  },
  {
    id: "job-4",
    code: "REC_0004",
    title: "Talent Acquisition Specialist",
    dept: "Human Resources",
    loc: "Prayagraj, Uttar Pradesh, India",
    company: "Acme Corp Pvt. Ltd.",
    remote: "No",
    type: "Full-Time",
    expires: "11-08-2026",
    openSince: "01-05-2026",
    salary: "₹8–12 LPA",
    exp: "2–4 years",
    hiringLead: "Riya Aggarwal (EMP004)",
    recruiter: "Suresh Kumar",
    desc: "Help scale our team by managing the end-to-end recruitment cycle. You will source top talent, conduct phone screenings, manage stakeholders, and design a fantastic candidate experience.",
    reqs: [
      "Experience hiring for technical and business roles in a fast-paced environment.",
      "Expertise in sourcing via LinkedIn Recruiter, GitHub, and other platforms.",
      "Strong negotiation and candidate relationship management skills.",
      "Familiarity with modern ATS platforms (Darwinbox, Greenhouse, etc.).",
    ],
  },
  {
    id: "job-5",
    code: "REC_0005",
    title: "Backend Engineer (NodeJS/Go)",
    dept: "Engineering",
    loc: "Bangalore, KA, India",
    company: "Acme Corp Pvt. Ltd.",
    remote: "No",
    type: "Full-Time",
    expires: "28-08-2026",
    openSince: "20-04-2026",
    salary: "₹16–24 LPA",
    exp: "3–6 years",
    hiringLead: "Arjun Rao (EMP005)",
    recruiter: "Meena Pillai",
    desc: "Build robust REST & GraphQL APIs, scale microservices, and design database schemas to power our high-traffic internal portals and data pipelines.",
    reqs: [
      "Strong skills in Node.js/TypeScript or Go.",
      "Experience with PostgreSQL, Redis, and message queues (RabbitMQ/Kafka).",
      "Familiarity with AWS, Docker, and Kubernetes deployment workflows.",
      "A mindset for writing clean, testable, and maintainable backend code.",
    ],
  },
];


// ─── Step Forms ───────────────────────────────────────────────────────────────
interface StepFormProps {
  onBack: () => void;
  onNext: () => void;
}

interface propContactStep {
  onBack: () => void;
  onNext: () => void;
}
type JobType = (typeof JOBS)[0];

interface propWorkExperienceStepComponent {
  onBack: () => void;
  onNext: () => void;
}

interface propsEducationStepComponent {
  onBack: () => void;
  onNext: () => void;
}

interface propsLastSalaryStepComponent {
  onBack: () => void;
  onSubmit: () => void;
}

interface propsListViewComponents {
  jobs: typeof JOBS;
  appliedIds: string[];
  onSelectJob: (job: (typeof JOBS)[0]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

interface propsDetailViewComponents {
  job: (typeof JOBS)[0];
  appliedIds: string[];
  onBack: () => void;
  onApply: () => void;
}

interface propscomponent {
  job: (typeof JOBS)[0];
  onCancel: () => void;
  onSubmitDone: (jobId: string) => void;
}

// ─── Step Forms ───────────────────────────────────────────────────────────────

// ─── Views ────────────────────────────────────────────────────────────────────

function ListView({
  jobs,
  appliedIds,
  onSelectJob,
  searchQuery,
  setSearchQuery,
}: propsListViewComponents) {
  const { isMobile } = useScreenSize();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="size-5 text-blue-600" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              IJP Openings
            </h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-light">
            Browse and apply for internal job openings within our organizations.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-500">
          <Button variant="outline" size="md" className="p-2 min-w-0 bg-white" disabled>
            <ArrowLeft className="size-4" />
          </Button>
          <Button variant="outline" size="md" className="p-2 min-w-0 bg-white">
            <ArrowRight className="size-4" />
          </Button>
          <span>Show:</span>
          <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs md:text-sm bg-white font-medium text-slate-700 focus:outline-none">
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
          <span className="font-semibold text-slate-700">{jobs.length} Results</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-initial">
            <input
              type="text"
              placeholder="Search Job Code or Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-light"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          </div>
          <Button variant="outline" className="p-2.5 min-w-0 bg-white">
            <SlidersHorizontal className="size-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Render Card List on mobile, Table on desktop */}
      {isMobile ? (
        <div className="flex flex-col gap-4">
          {jobs.map((job) => {
            const applied = job.id ? appliedIds.includes(job.id as string) : false;
            return (
              <Card
                key={job.id}
                radius="xl"
                onClick={() => onSelectJob(job)}
                className="border border-slate-200 hover:border-blue-300 p-5 bg-white space-y-4 cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                      {job.title}
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono">{job.code}</div>
                  </div>
                  {applied && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                      Applied
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 font-light border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{job.dept}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{job.loc.split(",")[0]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="size-3.5 text-slate-400 shrink-0" />
                    <span>Expires: {job.expires}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Job Title &amp; Code
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Remote
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-light text-slate-700">
              {jobs.map((job) => {
                const applied = job.id ? appliedIds.includes(job.id as string) : false;
                return (
                  <tr key={job.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="p-4">
                      <span
                        onClick={() => onSelectJob(job)}
                        className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-2"
                      >
                        {job.title}
                        {applied && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Applied
                          </span>
                        )}
                      </span>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{job.code}</div>
                    </td>
                    <td className="p-4">{job.remote}</td>
                    <td className="p-4">{job.company}</td>
                    <td className="p-4 max-w-[200px] truncate" title={job.loc}>
                      {job.loc}
                    </td>
                    <td className="p-4">{job.dept}</td>
                    <td className="p-4">{job.type}</td>
                    <td className="p-4">{job.expires}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center p-6">
          <Briefcase className="size-12 text-slate-300 mb-3" />
          <Typography variant="bodyMedium" className="font-semibold text-slate-700">
            No Job Openings Found
          </Typography>
          <Typography variant="caption" className="text-slate-400 mt-1 max-w-sm">
            Try adjusting your search keywords to find matching positions.
          </Typography>
        </div>
      )}
    </div>
  );
}

function DetailView({ job, appliedIds, onBack, onApply }: propsDetailViewComponents) {
  const applied = appliedIds.includes(job.id);
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Breadcrumbs */}
      <div className="text-xs text-slate-400 font-light flex items-center gap-1.5">
        <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={onBack}>
          IJP Openings
        </span>
        <span className="opacity-50">/</span>
        <strong className="text-slate-700 font-medium">{job.title} ({job.code})</strong>
      </div>

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
            {job.title} ({job.code})
          </h2>
          <p className="text-xs text-slate-500 font-light">Open since {job.openSince}</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto bg-white">
            Back
          </Button>
          {applied ? (
            <Button
              variant="contain"
              className="bg-emerald-600 hover:bg-emerald-700 cursor-default w-full sm:w-auto"
              disabled
            >
              ✓ Applied
            </Button>
          ) : (
            <Button
              variant="contain"
              onClick={onApply}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Details Grid layout: stacks on mobile, columns on lg */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Details */}
        <div className="flex-grow bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Job Description
            </h3>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-light">
              {job.desc}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Requirements
            </h3>
            <ul className="list-disc pl-5 text-xs md:text-sm text-slate-500 space-y-2 font-light">
              {job.reqs.map((req, idx) => (
                <li key={idx} className="leading-relaxed">
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Specifications */}
        <div className="w-full lg:w-72 shrink-0 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm divide-y divide-slate-100">
          {[
            ["Company", job.company],
            ["Department", job.dept],
            ["Location", job.loc],
            ["Remote Job", job.remote],
            ["Hiring Lead", job.hiringLead],
            ["Recruiter", job.recruiter],
            ["Salary", job.salary],
            ["Experience", job.exp],
            ["Expires on", job.expires],
          ].map(([label, value]) => (
            <div key={label} className="py-3 first:pt-0 last:pb-0 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {label}
              </span>
              <span className="text-xs md:text-sm text-slate-700 font-medium leading-relaxed">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApplyView({ job, onCancel, onSubmitDone }: propscomponent) {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/jobs/jobsapply/id/${job.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFormChange = (changed: any) => {
    setFormData((prev) => ({ ...prev, ...changed.data }));
  };

  const handleNext = () => {
    if (currentStep < ijpApplicationSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmitApplication = () => {
    setSubmitted(true);
    onSubmitDone(job.id);
  };

  const currentSchema =
    ijpApplicationSchemas[ijpApplicationSteps[currentStep].key as IJPFormSchemaKeys];

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 flex flex-col items-center justify-center text-center space-y-5">
        <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="size-9" />
        </div>
        <h4 className="text-xl font-bold text-slate-900">Application Submitted!</h4>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed font-light">
          Your application for{" "}
          <strong className="text-slate-700 font-semibold">{job.title}</strong> has been
          successfully submitted. You can track its live status in the{" "}
          <strong className="text-slate-700 font-semibold">IJP Jobs Applied</strong> portal.
        </p>
        <Button
          variant="contain"
          className="bg-blue-600 hover:bg-blue-700 mt-2"
          onClick={onCancel}
        >
          Back to IJP Openings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
          <div className="space-y-0.5">
            <h2 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
              {job.title}{" "}
              <span className="text-slate-400 font-normal text-sm">({job.code})</span>
            </h2>
            <p className="text-xs text-slate-400 font-light">
              Open since {job.openSince}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={onCancel}
              className="bg-white text-slate-700 border-slate-200 text-sm"
            >
              CANCEL
            </Button>
            <Button
              variant="contain"
              onClick={handleSubmitApplication}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5"
            >
              APPLY
            </Button>
          </div>
        </div>
      </div>

      {/* ── Referral Link Card ──────────────────────────────── */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="size-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-800">Refer a person using link</span>
        </div>
        <p className="text-xs text-slate-400 mb-3 font-light">
          You can use this referral link to share it to anyone
        </p>
        <div className="flex items-center gap-3">
          <input
            readOnly
            value={referralLink}
            className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none truncate"
          />
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-orange-500 hover:text-orange-600 font-bold text-xs uppercase tracking-wide transition-colors shrink-0"
          >
            <Copy className="size-3.5" />
            {copied ? "COPIED!" : "COPY LINK"}
          </button>
        </div>
      </div>

      {/* ── Steps + Form ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[480px]">
          {/* Left Sidebar – Steps */}
          <div className="w-full lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-0 scrollbar-hide">
              {ijpApplicationSteps.map((step, i) => {
                const isActive = i === currentStep;
                const isDone = i < currentStep;
                return (
                  <button
                    key={step.key}
                    onClick={() => setCurrentStep(i)}
                    className={`flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-slate-50 shrink-0 min-w-[140px] lg:min-w-0 ${isActive
                        ? "text-orange-500 font-semibold bg-orange-50/30"
                        : isDone
                          ? "text-emerald-600"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                  >
                    {/* Step circle icon */}
                    <span
                      className={`size-5 rounded-full flex items-center justify-center border-2 shrink-0 text-[10px] ${isActive
                          ? "border-orange-400 text-orange-500"
                          : isDone
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 text-slate-400"
                        }`}
                    >
                      {isDone ? (
                        <svg className="size-3" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : isActive ? (
                        <span className="size-2 rounded-full bg-orange-400 block" />
                      ) : (
                        <svg className="size-3 text-slate-400" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      )}
                    </span>
                    <span className="text-xs truncate">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel – Form.io Form */}
          <div className="flex-1 p-6">
            {/* Section heading */}
            <h3 className="text-base font-bold text-slate-900 mb-5">
              {ijpApplicationSteps[currentStep].label}
            </h3>

            {/* Form.io rendered form */}
            <Form
              form={currentSchema}
              submission={{ data: formData }}
              onChange={handleFormChange}
              onSubmit={handleSubmitApplication}
            />

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="bg-white"
              >
                Previous
              </Button>
              {currentStep < ijpApplicationSteps.length - 1 ? (
                <Button
                  variant="contain"
                  onClick={handleNext}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Save &amp; Next
                </Button>
              ) : (
                <Button
                  variant="contain"
                  onClick={handleSubmitApplication}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function IJPOpenings() {
  const [view, setView] = useState("list"); // "list" | "detail" | "apply"
  const [selectedJob, setSelectedJob] = useState<JobType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedIds, setAppliedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("ijp_applied_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const filteredJobs = JOBS.filter((job) => {
    const q = searchQuery.toLowerCase();
    return job.title.toLowerCase().includes(q) || job.code.toLowerCase().includes(q);
  });
  const handleSelectJob = (job: JobType) => {
    setSelectedJob(job);
    setView("detail");
  };
  const handleApply = () => setView("apply");
  const handleBack = () => setView("list");
  const handleBackToDetail = () => setView("detail");

  const handleSubmitDone = useCallback((jobId: any) => {
    setAppliedIds((prev: any) => {
      const next = [...prev, jobId];
      try {
        localStorage.setItem("ijp_applied_ids", JSON.stringify(next));
      } catch {
        /* empty */
      }
      return next;
    });
  }, []);

  if (view === "detail" && selectedJob) {
    return (
      <DetailView
        job={selectedJob}
        appliedIds={appliedIds}
        onBack={handleBack}
        onApply={handleApply}
      />
    );
  }

  if (view === "apply" && selectedJob) {
    return (
      <ApplyView
        job={selectedJob}
        onCancel={handleBackToDetail}
        onSubmitDone={handleSubmitDone}
      />
    );
  }

  return (
    <ListView
      jobs={filteredJobs}
      appliedIds={appliedIds}
      onSelectJob={handleSelectJob}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}