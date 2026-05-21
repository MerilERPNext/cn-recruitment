import React, { useState, useEffect, useCallback } from "react";

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

const STEPS = [
  "Resume",
  "Biographical",
  "Contact",
  "Address",
  "Work Experience",
  "Education",
  "Last Salary",
];

// ─── Inline Styles ────────────────────────────────────────────────────────────

const S = {
  // Layout
  page: { padding: "1.5rem", background: "#f5f6f8", minHeight: "100vh", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#1a1a2e" },
  pageTitle: { fontSize: 20, fontWeight: 600, marginBottom: "1.25rem", color: "#1a1a2e" },

  // Toolbar
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: 12, flexWrap: "wrap" },
  toolbarLeft: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#6b7280" },
  toolbarRight: { display: "flex", alignItems: "center", gap: 8 },
  showSelect: { border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 8px", fontSize: 13, background: "#fff", color: "#374151" },
  searchBox: { display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#fff" },
  searchInput: { border: "none", outline: "none", padding: "7px 12px", fontSize: 13, background: "transparent", color: "#374151", width: 230 },
  searchBtn: { background: "none", border: "none", padding: "7px 10px", cursor: "pointer", color: "#9ca3af" },
  filterBtn: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 10px", background: "#fff", cursor: "pointer", color: "#6b7280" },

  // Table
  tableWrap: { background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#6b7280", textAlign: "left", whiteSpace: "nowrap", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", color: "#374151" },
  jobLink: { color: "#c0392b", fontWeight: 600, cursor: "pointer", textDecoration: "none" },
  jobCode: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  appliedBadge: { fontSize: 10, background: "#d1fae5", color: "#065f46", padding: "2px 7px", borderRadius: 4, marginLeft: 6, fontWeight: 600 },

  // Breadcrumb
  breadcrumb: { fontSize: 13, color: "#6b7280", marginBottom: "1.25rem" },
  breadLink: { color: "#6b7280", cursor: "pointer", textDecoration: "none" },
  breadSep: { margin: "0 6px", opacity: 0.5 },

  // Job header card
  jobHeader: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 12 },
  jobHeaderTitle: { fontSize: 17, fontWeight: 600, color: "#1a1a2e" },
  jobHeaderDate: { fontSize: 13, color: "#6b7280", marginLeft: 10 },
  headerActions: { display: "flex", gap: 8 },

  // Buttons
  btnBack: { border: "1px solid #e5e7eb", background: "#fff", color: "#374151", padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontSize: 13 },
  btnApply: { background: "#c0392b", color: "#fff", border: "none", padding: "7px 20px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  btnApplyDisabled: { background: "#27ae60", color: "#fff", border: "none", padding: "7px 20px", borderRadius: 7, cursor: "default", fontSize: 13, fontWeight: 600 },
  btnCancel: { border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", padding: "7px 16px", borderRadius: 7, cursor: "pointer", fontSize: 13 },
  btnNext: { background: "#c0392b", color: "#fff", border: "none", padding: "7px 20px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 },

  // Detail body
  detailBody: { display: "flex", gap: "1rem" },
  detailMain: { flex: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.25rem" },
  detailSidebar: { width: 240, flexShrink: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.25rem" },
  sidebarField: { marginBottom: "1.25rem" },
  sidebarLabel: { fontSize: 11, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" },
  sidebarValue: { fontSize: 13, color: "#374151", lineHeight: 1.6 },
  detailDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.7, marginBottom: 14 },
  reqList: { paddingLeft: 18 },
  reqItem: { fontSize: 13, color: "#6b7280", marginBottom: 5, lineHeight: 1.5 },
  reqTitle: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 },

  // Apply layout
  applyBody: { display: "flex", gap: "1rem" },
  applySidebar: { width: 210, flexShrink: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem" },
  applyMain: { flex: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem" },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: "1.25rem", paddingBottom: 10, borderBottom: "1px solid #f3f4f6", color: "#1a1a2e" },

  // Stepper
  step: (active: any, done: any) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "8px 6px",
    borderRadius: 7, cursor: "pointer", fontSize: 13,
    color: active ? "#c0392b" : done ? "#065f46" : "#6b7280",
    fontWeight: active ? 600 : 400,
  }),
  stepIcon: (active: any, done: any) => ({
    width: 22, height: 22, borderRadius: "50%",
    border: `1.5px solid ${active ? "#c0392b" : done ? "#27ae60" : "#d1d5db"}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, flexShrink: 0,
    background: done ? "#d1fae5" : "transparent",
    color: active ? "#c0392b" : done ? "#065f46" : "#9ca3af",
  }),

  // Form elements
  formGroup: { marginBottom: "1.25rem" },
  formLabel: { fontSize: 12, color: "#6b7280", marginBottom: 5, display: "block", fontWeight: 500 },
  formInput: { width: "100%", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 10px", fontSize: 13, background: "#fff", color: "#374151", outline: "none", boxSizing: "border-box" },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  // Upload
  uploadZone: { border: "1.5px dashed #e5e7eb", borderRadius: 10, padding: "2rem", textAlign: "center", cursor: "pointer", background: "#f9fafb" },
  uploadBtn: { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #e5e7eb", background: "#fff", padding: "6px 14px", borderRadius: 7, fontSize: 13, cursor: "pointer", color: "#374151" },
  uploadNote: { fontSize: 12, color: "#9ca3af", marginTop: 6 },
  uploadedFile: { display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontSize: 13, color: "#374151" },
  fileIcon: { fontSize: 20, color: "#27ae60" },
  fileBadge: { fontSize: 11, background: "#d1fae5", color: "#065f46", padding: "2px 6px", borderRadius: 4 },

  // Step nav
  stepNav: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" },

  // Success
  successState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", textAlign: "center", gap: "1rem" },
  successIcon: { width: 56, height: 56, borderRadius: "50%", background: "#d1fae5", color: "#27ae60", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon() {
  return (
    <span style={{ marginLeft: 4, opacity: 0.45, fontSize: 11 }}>⇅</span>
  );
}

// ─── Prop Types ───────────────────────────────────────────────────────────────

interface propsResumeComponent {
  uploadedFile: string | null;
  onUpload: (fileName: string) => void;
  onNext: () => void;
}

interface propsBiographicalStepComponent {
  onBack: () => void;
  onNext: () => void;
}

interface propContactStep {
  onBack: () => void;
  onNext: () => void;
}

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
  onSelectJob: (job: any) => void;
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

function ResumeStep({ uploadedFile, onUpload, onNext }: propsResumeComponent) {
  const inputRef = React.useRef(null);
  return (
    <div>
      <div style={S.sectionTitle}>Resume</div>
      <div style={S.formGroup}>
        <label style={S.formLabel}>
          Resume&nbsp;<span style={{ fontSize: 12, color: "#9ca3af" }}>ⓘ</span>
        </label>
        <div style={S.uploadZone} onClick={() => inputRef.current?.click()}>
          {uploadedFile ? (
            <div style={S.uploadedFile}>
              <span style={S.fileIcon}>📄</span>
              <span>{uploadedFile}</span>
              <span style={S.fileBadge}>Ready</span>
            </div>
          ) : (
            <>
              <button type="button" style={S.uploadBtn}>
                <span style={{ color: "#c0392b" }}>⬆</span> Upload
              </button>
              <div style={S.uploadNote}>(Resume will be parsed)</div>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f.name);
          }}
        />
      </div>
      <div style={S.stepNav}>
        <button style={S.btnNext} onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function BiographicalStep({ onBack, onNext }: propsBiographicalStepComponent) {
  return (
    <div>
      <div style={S.sectionTitle}>Biographical</div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>First Name</label><input style={S.formInput} placeholder="First name" /></div>
        <div style={S.formGroup}><label style={S.formLabel}>Last Name</label><input style={S.formInput} placeholder="Last name" /></div>
      </div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>Date of Birth</label><input style={S.formInput} type="date" /></div>
        <div style={S.formGroup}>
          <label style={S.formLabel}>Gender</label>
          <select style={S.formInput}><option>Select</option><option>Male</option><option>Female</option><option>Other</option></select>
        </div>
      </div>
      <div style={S.formGroup}><label style={S.formLabel}>Nationality</label><input style={S.formInput} placeholder="e.g. Indian" /></div>
      <div style={S.stepNav}>
        <button style={S.btnCancel} onClick={onBack}>Back</button>
        <button style={S.btnNext} onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function ContactStep({ onBack, onNext }: propContactStep) {
  return (
    <div>
      <div style={S.sectionTitle}>Contact</div>
      <div style={S.formGroup}><label style={S.formLabel}>Personal Email</label><input style={S.formInput} type="email" placeholder="you@example.com" /></div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>Mobile</label><input style={S.formInput} placeholder="+91 XXXXXXXXXX" /></div>
        <div style={S.formGroup}><label style={S.formLabel}>Alternate Phone</label><input style={S.formInput} placeholder="Optional" /></div>
      </div>
      <div style={S.stepNav}>
        <button style={S.btnCancel} onClick={onBack}>Back</button>
        <button style={S.btnNext} onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function AddressStep({ onBack, onNext }) {
  return (
    <div>
      <div style={S.sectionTitle}>Address</div>
      <div style={S.formGroup}><label style={S.formLabel}>Address Line 1</label><input style={S.formInput} placeholder="Street address" /></div>
      <div style={S.formGroup}><label style={S.formLabel}>Address Line 2</label><input style={S.formInput} placeholder="Apartment, suite, etc." /></div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>City</label><input style={S.formInput} placeholder="City" /></div>
        <div style={S.formGroup}><label style={S.formLabel}>State</label><input style={S.formInput} placeholder="State" /></div>
      </div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>Pin Code</label><input style={S.formInput} placeholder="000000" /></div>
        <div style={S.formGroup}><label style={S.formLabel}>Country</label><input style={S.formInput} defaultValue="India" /></div>
      </div>
      <div style={S.stepNav}>
        <button style={S.btnCancel} onClick={onBack}>Back</button>
        <button style={S.btnNext} onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function WorkExperienceStep({ onBack, onNext }: propWorkExperienceStepComponent) {
  return (
    <div>
      <div style={S.sectionTitle}>Work Experience</div>
      <div style={S.formGroup}><label style={S.formLabel}>Current / Last Employer</label><input style={S.formInput} placeholder="Company name" /></div>
      <div style={S.formGroup}><label style={S.formLabel}>Designation</label><input style={S.formInput} placeholder="Your role title" /></div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>From</label><input style={S.formInput} type="date" /></div>
        <div style={S.formGroup}><label style={S.formLabel}>To (or present)</label><input style={S.formInput} type="date" /></div>
      </div>
      <div style={S.formGroup}><label style={S.formLabel}>Total Relevant Experience (years)</label><input style={S.formInput} type="number" min="0" max="40" step="0.5" placeholder="e.g. 3.5" /></div>
      <div style={S.formGroup}>
        <label style={S.formLabel}>Statement of Purpose</label>
        <textarea style={{ ...S.formInput, resize: "vertical", minHeight: 80 }} placeholder="Why are you a good fit for this role?" />
      </div>
      <div style={S.stepNav}>
        <button style={S.btnCancel} onClick={onBack}>Back</button>
        <button style={S.btnNext} onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function EducationStep({ onBack, onNext }: propsEducationStepComponent) {
  return (
    <div>
      <div style={S.sectionTitle}>Education</div>
      <div style={S.formGroup}>
        <label style={S.formLabel}>Highest Qualification</label>
        <select style={S.formInput}>
          <option>Select</option>
          <option>10th</option><option>12th</option><option>Diploma</option>
          <option>B.Tech / B.E.</option><option>B.Sc</option>
          <option>MBA</option><option>M.Tech</option><option>PhD</option>
        </select>
      </div>
      <div style={S.formGroup}><label style={S.formLabel}>Institution Name</label><input style={S.formInput} placeholder="University / College" /></div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>Year of Passing</label><input style={S.formInput} type="number" placeholder="e.g. 2019" /></div>
        <div style={S.formGroup}><label style={S.formLabel}>Percentage / CGPA</label><input style={S.formInput} placeholder="e.g. 8.5 or 78%" /></div>
      </div>
      <div style={S.stepNav}>
        <button style={S.btnCancel} onClick={onBack}>Back</button>
        <button style={S.btnNext} onClick={onNext}>Save &amp; Next</button>
      </div>
    </div>
  );
}

function LastSalaryStep({ onBack, onSubmit }: propsLastSalaryStepComponent) {
  return (
    <div>
      <div style={S.sectionTitle}>Last Salary</div>
      <div style={S.formRow}>
        <div style={S.formGroup}><label style={S.formLabel}>Current / Last CTC (LPA)</label><input style={S.formInput} type="number" step="0.1" placeholder="e.g. 12.5" /></div>
        <div style={S.formGroup}><label style={S.formLabel}>Expected CTC (LPA)</label><input style={S.formInput} type="number" step="0.1" placeholder="e.g. 18" /></div>
      </div>
      <div style={S.formGroup}><label style={S.formLabel}>Notice Period (days)</label><input style={S.formInput} type="number" placeholder="e.g. 30 or 60" /></div>
      <div style={S.stepNav}>
        <button style={S.btnCancel} onClick={onBack}>Back</button>
        <button style={S.btnNext} onClick={onSubmit}>Submit Application</button>
      </div>
    </div>
  );
}

// ─── Views ────────────────────────────────────────────────────────────────────

function ListView({ jobs, appliedIds, onSelectJob, searchQuery, setSearchQuery }: propsListViewComponents) {
  return (
    <div style={S.page}>
      <div style={S.pageTitle}>IJP Openings</div>
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <button style={{ ...S.btnBack, padding: "4px 8px", opacity: 0.4 }} disabled>‹</button>
          <button style={{ ...S.btnBack, padding: "4px 8px" }}>›</button>
          <span>Show :</span>
          <select style={S.showSelect}><option>10</option><option>25</option><option>50</option></select>
          <span style={{ color: "#6b7280" }}>{jobs.length} Results</span>
        </div>
        <div style={S.toolbarRight}>
          <div style={S.searchBox}>
            <input
              style={S.searchInput}
              type="text"
              placeholder="Search by Job Code or Job Title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button style={S.searchBtn}>🔍</button>
          </div>
          <button style={S.filterBtn}>⚙</button>
        </div>
      </div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Job Title &amp; Job Code <SortIcon /></th>
              <th style={S.th}>Remote Job <SortIcon /></th>
              <th style={S.th}>Company Name <SortIcon /></th>
              <th style={S.th}>Location <SortIcon /></th>
              <th style={S.th}>Department And Business Unit <SortIcon /></th>
              <th style={S.th}>Employee Type <SortIcon /></th>
              <th style={S.th}>Expires on <SortIcon /></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job: { id: React.Key | null | undefined; title: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; code: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; remote: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; company: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; loc: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; dept: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; type: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; expires: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }) => {
              const applied = appliedIds.includes(job.id);
              return (
                <tr key={job.id} style={{ background: "#fff" }}>
                  <td style={S.td}>
                    <span
                      style={S.jobLink}
                      onClick={() => onSelectJob(job)}
                    >
                      {job.title}
                      {applied && <span style={S.appliedBadge}>Applied</span>}
                    </span>
                    <div style={S.jobCode}>{job.code}</div>
                  </td>
                  <td style={S.td}>{job.remote}</td>
                  <td style={S.td}>{job.company}</td>
                  <td style={{ ...S.td, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.loc}</td>
                  <td style={S.td}>{job.dept}</td>
                  <td style={S.td}>{job.type}</td>
                  <td style={S.td}>{job.expires}</td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...S.td, textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
                  No jobs found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailView({ job, appliedIds, onBack, onApply }: propsDetailViewComponents) {
  const applied = appliedIds.includes(job.id);
  return (
    <div style={S.page}>
      <div style={S.breadcrumb}>
        <span style={S.breadLink} onClick={onBack}>Internal Job Movement</span>
        <span style={S.breadSep}>/</span>
        <strong>{job.title} ({job.code})</strong>
      </div>
      <div style={S.jobHeader}>
        <div>
          <span style={S.jobHeaderTitle}>{job.title} ({job.code})</span>
          <span style={S.jobHeaderDate}>(Open since {job.openSince})</span>
        </div>
        <div style={S.headerActions}>
          <button style={S.btnBack} onClick={onBack}>‹ Back</button>
          {applied ? (
            <button style={S.btnApplyDisabled} disabled>✓ Applied</button>
          ) : (
            <button style={S.btnApply} onClick={onApply}>Apply</button>
          )}
        </div>
      </div>
      <div style={S.detailBody}>
        <div style={S.detailMain}>
          <p style={S.detailDesc}>{job.desc}</p>
          <p style={S.reqTitle}>Requirements:</p>
          <ul style={S.reqList}>
            {job.reqs.map((r: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, i: React.Key | null | undefined) => (
              <li key={i} style={S.reqItem}>{r}</li>
            ))}
          </ul>
        </div>
        <div style={S.detailSidebar}>
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
            <div key={label} style={S.sidebarField}>
              <div style={S.sidebarLabel}>{label}</div>
              <div style={S.sidebarValue}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApplyView({ job, onCancel, onSubmitDone }: propscomponent) {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmitDone(job.id);
  };

  const renderStepContent = () => {
    if (submitted) {
      return (
        <div style={S.successState}>
          <div style={S.successIcon}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Congratulations!</div>
          <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 360, lineHeight: 1.7 }}>
            Your application for <strong>{job.title}</strong> has been successfully submitted.
            You can track its live status in the <strong>IJP Jobs Applied</strong> portal.
          </p>
          <button style={S.btnApply} onClick={onCancel}>Back to IJP Openings</button>
        </div>
      );
    }
    switch (STEPS[currentStep]) {
      case "Resume": return <ResumeStep uploadedFile={uploadedFile} onUpload={setUploadedFile} onNext={goNext} />;
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
    <div style={S.page}>
      <div style={S.breadcrumb}>
        <span style={S.breadLink} onClick={onCancel}>Internal Job Movement</span>
        <span style={S.breadSep}>/</span>
        <strong>{job.title} ({job.code})</strong>
      </div>
      <div style={S.jobHeader}>
        <div>
          <span style={S.jobHeaderTitle}>{job.title} ({job.code})</span>
          <span style={S.jobHeaderDate}>(Open since {job.openSince})</span>
        </div>
        <div style={S.headerActions}>
          <button style={S.btnCancel} onClick={onCancel}>Cancel</button>
          <button style={S.btnApply} onClick={submitted ? onCancel : handleSubmit}>Apply</button>
        </div>
      </div>
      <div style={S.applyBody}>
        {!submitted && (
          <div style={S.applySidebar}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#374151" }}>Apply for IJP</div>
            {STEPS.map((step, i) => {
              const active = i === currentStep;
              const done = i < currentStep;
              return (
                <div
                  key={step}
                  style={S.step(active, done)}
                  onClick={() => setCurrentStep(i)}
                >
                  <div style={S.stepIcon(active, done)}>
                    {done ? "✓" : active ? "→" : "○"}
                  </div>
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ ...S.applyMain, flex: 1 }}>
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function IJPOpenings() {
  const [view, setView] = useState("list"); // "list" | "detail" | "apply"
  const [selectedJob, setSelectedJob] = useState(null);
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

  const handleSelectJob = (job: React.SetStateAction<null>) => { setSelectedJob(job); setView("detail"); };
  const handleApply = () => setView("apply");
  const handleBack = () => setView("list");
  const handleBackToDetail = () => setView("detail");

  const handleSubmitDone = useCallback((jobId: any) => {
    setAppliedIds((prev: any) => {
      const next = [...prev, jobId];
      try { localStorage.setItem("ijp_applied_ids", JSON.stringify(next)); } catch { }
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