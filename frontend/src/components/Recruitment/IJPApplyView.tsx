import React, { useState, useRef } from "react";
import {
  JobType,
  propscomponent,
  propsResumeComponent,
  propsBiographicalStepComponent,
  propContactStep,
  propsAddressStepComponent,
  propWorkExperienceStepComponent,
  propsEducationStepComponent,
  propsLastSalaryStepComponent,
} from "./IJPTypes";
import formatToIndianDate from "../../utils/formatToIndianDate";

const STEPS = [
  "Resume",
  "Biographical",
  "Contact",
  "Address",
  "Work Experience",
  "Education",
  "Last Salary",
];

function ResumeStep({ uploadedFile, onUpload, onNext }: propsResumeComponent) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">Resume</div>
      <div className="mb-5">
        <label className="text-xs text-slate-500 mb-1.5 block font-medium">
          Resume&nbsp;<span className="text-xs text-gray-400">ⓘ</span>
        </label>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/50 transition-colors" onClick={() => inputRef.current?.click()}>
          {uploadedFile ? (
            <div className="flex items-center gap-2 justify-center text-xs text-slate-955">
              <span className="text-xl text-green-500">📄</span>
              <span className="font-semibold">{uploadedFile}</span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">Ready</span>
            </div>
          ) : (
            <>
              <button type="button" className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3.5 py-1.5 rounded-lg text-xs cursor-pointer text-slate-700 font-semibold">
                <span className="text-blue-600">⬆</span> Upload
              </button>
              <div className="text-xs text-gray-400 mt-1.5">(Resume will be parsed)</div>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f.name);
          }}
        />
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function BiographicalStep({ onBack, onNext }: propsBiographicalStepComponent) {
  return (
    <div>
      <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">Biographical</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">First Name</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="First name" /></div>
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Last Name</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="Last name" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Date of Birth</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="date" /></div>
        <div className="mb-5">
          <label className="text-xs text-slate-500 mb-1.5 block font-medium">Gender</label>
          <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400"><option>Select</option><option>Male</option><option>Female</option><option>Other</option></select>
        </div>
      </div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Nationality</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="e.g. Indian" /></div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button className="border border-gray-200 bg-white text-gray-500 px-4 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onBack}>Back</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function ContactStep({ onBack, onNext }: propContactStep) {
  return (
    <div>
      <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">Contact</div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Personal Email</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="email" placeholder="you@example.com" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Mobile</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="+91 XXXXXXXXXX" /></div>
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Alternate Phone</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="Optional" /></div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button className="border border-gray-200 bg-white text-gray-500 px-4 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onBack}>Back</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function AddressStep({ onBack, onNext }: propsAddressStepComponent) {
  return (
    <div>
      <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">Address</div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Address Line 1</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="Street address" /></div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Address Line 2</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="Apartment, suite, etc." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">City</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="City" /></div>
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">State</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="State" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Pin Code</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="000000" /></div>
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Country</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" defaultValue="India" /></div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button className="border border-gray-200 bg-white text-gray-500 px-4 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onBack}>Back</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

// Experience
function WorkExperienceStep({ onBack, onNext }: propWorkExperienceStepComponent) {
  return (
    <div>
      <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">Work Experience</div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Current / Last Employer</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="Company name" /></div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Designation</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="Your role title" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">From</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="date" /></div>
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">To (or present)</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="date" /></div>
      </div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Total Relevant Experience (years)</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="number" min="0" max="40" step="0.5" placeholder="e.g. 3.5" /></div>
      <div className="mb-5">
        <label className="text-xs text-slate-500 mb-1.5 block font-medium">Statement of Purpose</label>
        <textarea className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border resize-y min-h-[80px]" placeholder="Why are you a good fit for this role?" />
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button className="border border-gray-200 bg-white text-gray-500 px-4 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onBack}>Back</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function EducationStep({ onBack, onNext }: propsEducationStepComponent) {
  return (
    <div>
      <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">Education</div>
      <div className="mb-5">
        <label className="text-xs text-slate-500 mb-1.5 block font-medium">Highest Qualification</label>
        <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400">
          <option>Select</option>
          <option>10th</option><option>12th</option><option>Diploma</option>
          <option>B.Tech / B.E.</option><option>B.Sc</option>
          <option>MBA</option><option>M.Tech</option><option>PhD</option>
        </select>
      </div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Institution Name</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="University / College" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Year of Passing</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="number" placeholder="e.g. 2019" /></div>
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Percentage / CGPA</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" placeholder="e.g. 8.5 or 78%" /></div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button className="border border-gray-200 bg-white text-gray-500 px-4 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onBack}>Back</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function LastSalaryStep({ onBack, onSubmit }: propsLastSalaryStepComponent) {
  return (
    <div>
      <div className="text-sm font-semibold mb-5 pb-2.5 border-b border-gray-100 text-[#1a1a2e]">Last Salary</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Current / Last CTC (LPA)</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="number" step="0.1" placeholder="e.g. 12.5" /></div>
        <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Expected CTC (LPA)</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="number" step="0.1" placeholder="e.g. 18" /></div>
      </div>
      <div className="mb-5"><label className="text-xs text-slate-500 mb-1.5 block font-medium">Notice Period (days)</label><input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-semibold outline-none box-border focus:border-blue-400" type="number" placeholder="e.g. 30 or 60" /></div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button className="border border-gray-200 bg-white text-gray-500 px-4 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onBack}>Back</button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onSubmit}>Submit Application</button>
      </div>
    </div>
  );
}

export default function ApplyView({ job, onCancel, onSubmitDone }: propscomponent) {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmitDone(job.name);
  };

  const renderStepContent = () => {
    if (submitted) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-green-600 flex items-center justify-center text-3xl font-semibold">✓</div>
          <div className="text-lg font-semibold text-[#1a1a2e]">Congratulations!</div>
          <p className="text-xs text-gray-500 max-w-[360px] leading-relaxed">
            Your application for <strong>{job.job_title}</strong> has been successfully submitted.
            You can track its live status in the <strong>IJP Jobs Applied</strong> portal.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onCancel}>Back to IJP Openings</button>
        </div>
      );
    }
    switch (STEPS[currentStep]) {
      case "Resume": return <ResumeStep uploadedFile={uploadedFile} onUpload={(fileName) => setUploadedFile(fileName)} onNext={goNext} />;
      case "Biographical": return <BiographicalStep onBack={goBack} onNext={goNext} />;
      case "Contact": return <ContactStep onBack={goBack} onNext={goNext} />;
      case "Address": return <AddressStep onBack={goBack} onNext={goNext} />;
      case "Work Experience": return <WorkExperienceStep onBack={goBack} onNext={goNext} />;
      case "Education": return <EducationStep onBack={goBack} onNext={goNext} />;
      case "Last Salary": return <LastSalaryStep onBack={goBack} onSubmit={handleSubmit} />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-full overflow-hidden text-sm text-[#1a1a2e] px-2">
      <div className="text-xs text-gray-500 mb-5">
        <span className="text-gray-500 cursor-pointer no-underline hover:underline" onClick={onCancel}>Internal Job Movement</span>
        <span className="mx-1.5 opacity-50">/</span>
        <strong>{job.job_title} ({job.opening_code || job.name})</strong>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3 mb-4 w-full max-w-full">
        <div className="min-w-0 flex-1 pr-2">
          <span className="text-lg font-semibold text-[#1a1a2e] block md:inline truncate">{job.job_title} ({job.opening_code || job.name})</span>
          <span className="text-xs text-gray-500 md:ml-2.5 block md:inline mt-1 md:mt-0">(Open since {job.posted_on ? formatToIndianDate(job.posted_on) : ""})</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="border border-gray-200 bg-white text-gray-500 px-4 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={onCancel}>Cancel</button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white border-none px-5 py-1.5 rounded-lg cursor-pointer text-xs font-semibold" onClick={submitted ? onCancel : handleSubmit}>Apply</button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-full">
        {!submitted && (
          <div className="w-full md:w-52 shrink-0 bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs font-semibold mb-3 text-gray-700">Apply for IJP</div>
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-1.5 scrollbar-hide">
              {STEPS.map((step, i) => {
                const active = i === currentStep;
                const done = i < currentStep;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs whitespace-nowrap md:whitespace-normal shrink-0 md:shrink ${
                      active
                        ? "text-blue-600 font-semibold bg-blue-50/50"
                        : done
                        ? "text-emerald-800 font-normal hover:bg-slate-50"
                        : "text-gray-500 font-normal hover:bg-slate-50"
                    }`}
                    onClick={() => setCurrentStep(i)}
                  >
                    <div className={`w-[22px] h-[22px] rounded-full border-1.5 flex items-center justify-center text-[11px] shrink-0 ${
                      active
                        ? "border-blue-600 text-blue-600 font-semibold"
                        : done
                        ? "border-green-500 bg-emerald-100 text-emerald-800 font-semibold"
                        : "border-gray-300 text-gray-400 font-normal"
                    }`}>
                      {done ? "✓" : active ? "→" : "○"}
                    </div>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 min-w-0">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
