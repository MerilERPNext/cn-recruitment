import { useState } from "react";
import StagesLibraryAside from "./components/Stages/StagesLibraryAside";
import StagesTimelineCard from "./components/Stages/StagesTimelineCard";
import type { StageOption, StageRow } from "./components/Stages/types";

const stageRows: StageRow[] = [
  {
    id: 1,
    title: "Self-Review",
    sla: "7d",
    dueDate: "21 May 2026",
    visibility: "Aggregated",
    formTemplate: "Form template A",
    ratingScale: "5-pt descriptive",
    managerVisible: true,
  },
  {
    id: 2,
    title: "Peer Nomination",
    sla: "4d",
    dueDate: "25 May 2026",
    visibility: "Visible to manager",
    formTemplate: "Form template A",
    ratingScale: "5-pt descriptive",
    managerVisible: true,
  },
  {
    id: 3,
    title: "Peer Review",
    sla: "7d",
    dueDate: "1 Jun 2026",
    visibility: "Aggregated",
    formTemplate: "Form template A",
    ratingScale: "5-pt descriptive",
    managerVisible: true,
  },
  {
    id: 4,
    title: "Manager (L1) Review",
    sla: "10d",
    dueDate: "12 Jun 2026",
    visibility: "Visible to manager",
    formTemplate: "Form template A",
    ratingScale: "5-pt descriptive",
    managerVisible: true,
  },
  {
    id: 5,
    title: "Skip (L2) Review",
    sla: "5d",
    dueDate: "17 Jun 2026",
    visibility: "Visible to manager",
    formTemplate: "Form template A",
    ratingScale: "5-pt descriptive",
    managerVisible: false,
  },
];

const visibilityOptions: StageOption[] = [
  { label: "Visible to manager", value: "Visible to manager" },
  { label: "Aggregated", value: "Aggregated" },
  { label: "Fully anonymous", value: "Fully anonymous" },
  { label: "—", value: "—" },
];

const formOptions: StageOption[] = [
  { label: "Form template A", value: "Form template A" },
  { label: "Probation form", value: "Probation form" },
  { label: "—", value: "—" },
];

const ratingOptions: StageOption[] = [
  { label: "5-pt descriptive", value: "5-pt descriptive" },
  { label: "1-10 numeric", value: "1-10 numeric" },
  { label: "—", value: "—" },
];

const availableStages = [
  "Subordinate / Upward Review",
  "360° Multi-source",
  "HR Pre-Review",
  "HR Sign-off",
];

const templates = [
  "Standard 5-stage",
  "Tech-style continuous",
  "Probation 90-day",
  "Project-based",
];

const Stages = () => {
  const [stages, setStages] = useState(stageRows);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);

  return (
    <>
      <div className="min-w-0">
        <StagesTimelineCard
          formOptions={formOptions}
          ratingOptions={ratingOptions}
          stages={stages}
          setStages={setStages}
          visibilityOptions={visibilityOptions}
        />
      </div>

      <StagesLibraryAside
        availableStages={availableStages}
        onTemplateSelect={setSelectedTemplate}
        selectedTemplate={selectedTemplate}
        templates={templates}
      />
    </>
  );
};

export default Stages;
