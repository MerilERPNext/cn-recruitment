import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  distribution,
  employees,
  generatePastelColor,
  ratingColorIndex,
  ratingOptions,
  ratingTextColor,
} from "./mockData";
import type { CalibratedRatings, Rating } from "./types";

const SessionHeader = lazy(
  () => import("./components/Calibrator/SessionHeader"),
);
const DistributionSummary = lazy(
  () => import("./components/Calibrator/DistributionSummary"),
);
const MobileEmployeeCards = lazy(
  () => import("./components/Calibrator/MobileEmployeeCards"),
);
const EmployeeCalibrationTable = lazy(
  () => import("./components/Calibrator/EmployeeCalibrationTable"),
);
const ManagerOverride = lazy(
  () => import("./components/Calibrator/ManagerOverride"),
);

const sectionFallback = (
  <div className="min-h-[120px] rounded-md border border-gray-200 bg-white shadow-sm" />
);

const CalibratorSession = () => {
  const navigate = useNavigate();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [calibratedRatings, setCalibratedRatings] = useState<CalibratedRatings>(
    employees.reduce<CalibratedRatings>(
      (acc, employee) => ({ ...acc, [employee.id]: employee.calibrated }),
      {},
    ),
  );
  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0];

  const openOverride = (employeeId: number) => {
    setSelectedEmployeeId(employeeId);
    setOverrideOpen(true);
  };

  const openBoxGrid = () => {
    navigate("/webapp/performance-app/calibrator/box-grid");
  };

  const updateRating = (employeeId: number, rating: Rating) => {
    setCalibratedRatings((current) => ({
      ...current,
      [employeeId]: rating,
    }));
  };

  const saveOverride = () => {
    navigate("/webapp/performance-app/calibrator/box-grid", {
      state: {
        savedOverride: {
          employeeName: selectedEmployee.name,
          from:
            selectedEmployee.name === "Vikram Rao"
              ? "Inconsistent"
              : selectedEmployee.managerSuggested,
          to:
            selectedEmployee.name === "Vikram Rao"
              ? "Effective"
              : calibratedRatings[selectedEmployee.id],
        },
      },
    });
  };

  return (
    <div className="min-h-dvh bg-[#f4f7fb] font-sans text-gray-900">
      <main className="mx-auto flex  flex-col gap-3 p-3 sm:gap-4 sm:p-4">
        <Suspense fallback={sectionFallback}>
          <SessionHeader
            getBadgeColor={generatePastelColor}
            onOpenBoxGrid={openBoxGrid}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <DistributionSummary distribution={distribution} />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <MobileEmployeeCards
            calibratedRatings={calibratedRatings}
            employees={employees}
            getBadgeColor={generatePastelColor}
            onOpenOverride={openOverride}
            onRatingChange={updateRating}
            ratingColorIndex={ratingColorIndex}
            ratingOptions={ratingOptions}
            ratingTextColor={ratingTextColor}
          />
        </Suspense>

        <Suspense fallback={sectionFallback}>
          <EmployeeCalibrationTable
            calibratedRatings={calibratedRatings}
            employees={employees}
            getBadgeColor={generatePastelColor}
            onOpenOverride={openOverride}
            onRatingChange={updateRating}
            ratingColorIndex={ratingColorIndex}
            ratingOptions={ratingOptions}
            ratingTextColor={ratingTextColor}
          />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <ManagerOverride
          employee={selectedEmployee}
          open={overrideOpen}
          rating={calibratedRatings[selectedEmployee.id]}
          onClose={() => setOverrideOpen(false)}
          onRatingChange={(rating) => updateRating(selectedEmployee.id, rating)}
          onSaveOverride={saveOverride}
        />
      </Suspense>
    </div>
  );
};

export default CalibratorSession;
