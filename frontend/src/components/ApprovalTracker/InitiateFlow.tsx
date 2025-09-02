import React from "react";
import FlowCard from "./FlowCard";

const data: Record<string, string[]> = {
  "Business Flows": [
    "Absconding management",
    "BANK ACCOUNT CHANGE",
    "Car lease Flow",
    "CAR LEASE FLOW_101",
    "Confirmation Workflow test(Anam)",
    "Confirmation Workflow test new",
    "Marriage flow umar",
    "Test_Com",
  ],
  "Employee Movements": ["Declaration Test 1"],
  "Other Category": [
    "Abcde",
    "abc testing cwf",
    "Confirmation Workflow 2",
    "Test Appointment Letter CWF",
    "Test CWF",
    "Test Vibe CWF",
  ],
};

const InitiateFlow: React.FC = () => {
  return (
    <div className="space-y-6">
      {Object.entries(data).map(([category, items]) => (
        <FlowCard key={category} category={category} items={items} />
      ))}
    </div>
  );
};

export default InitiateFlow;
