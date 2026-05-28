import { useState, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import {
  requisitionSteps,
  requisitionFormSchemas,
  FormSchemaKeys,
} from "./requisitionFormSchemas";
import Button from "../shared/atoms/Button";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useCreateJobRequisition } from "../../hooks/useRecruitment";
import {
  JobRequisitionFormData,
  CreateJobRequisitionPayload,
  PositionDetail,
  ReplacementPositionDetail,
} from "../../types/recruitment";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import FrappeAPI from "../../utils/frappeAPI";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Helper: map an existing requisition (API shape) → JobRequisitionFormData
// ---------------------------------------------------------------------------
function mapRequisitionToFormData(req: any): Partial<JobRequisitionFormData> {
  const positions = req.custom_position_details || [];
  const newPositions = positions.filter((p: any) => p.vacancy_type !== "Replacement");
  const replacementPositions = positions.filter((p: any) => p.vacancy_type === "Replacement");
  const isReplacement = replacementPositions.length > 0 && newPositions.length === 0;

  // Work experience reverse-map
  let custom_work_experience_range: string | undefined;
  const exp = req.custom_work_experience;
  if (exp === "Fresher") custom_work_experience_range = "Fresher";
  else if (exp === "1 - 3 Years") custom_work_experience_range = "1 - 3 Years";
  else if (exp === "4 - 5 years") custom_work_experience_range = "4 - 5 Years";
  else if (exp === "5 - 10 years") custom_work_experience_range = "5 - 10 Years";
  else custom_work_experience_range = exp;

  return {
    company: req.company,
    department: req.department,
    designation: req.designation,
    functional_area: req.custom_functional_area,
    hiring_manager: req.requested_by,
    hiring_lead: req.custom_hiring_lead,
    custom_division: req.custom_division,
    location: req.custom_location,
    reason_for_requesting: req.reason_for_requesting,
    description: req.description,
    job_description_template: req.custom_job_description_template,
    additional_roles_responsibilities: req.custom_additional_roles__responsibilities,

    // Position
    position_type: isReplacement ? "replacement" : "new",
    number_of_new_positions: isReplacement ? undefined : req.no_of_positions,
    number_of_replacement_positions: isReplacement ? req.no_of_positions : undefined,
    positions: newPositions.map((p: any, i: number) => ({
      position_number: i + 1,
      location: p.location,
      functional_area: p.functional_area,
      reporting_manager: p.reporting_manager,
      employee_type: p.employee_type,
    })),
    replacement_positions: replacementPositions.map((p: any, i: number) => ({
      position_number: i + 1,
      location: p.location,
      replacement_for: p.replacement_for,
      reporting_manager: p.reporting_manager,
      employee_type: p.employee_type,
    })),

    // Requirements
    custom__employee_type: req.custom__employee_type,
    employment_type: req.custom_employment_type_link,
    custom_work_experience_range,
    experience_from: req.custom_experience_range_from,
    experience_to: req.custom_experience_range_to,
    experience_unit: req.custom_experience_unit,
    custom_preferred_notice_period: req.custom_preferred_notice_period,
    preferred_company: req.custom_preferred_company,
    custom_other_preferred_companies: req.custom_other_preferred_companies,
    custom_qualifications: req.custom_qualifications,
    additional_skills: req.custom_additional_skills,
    custom_skills: req.custom_skills,
    custom_assign_to_recruiter: req.custom_assign_to_recruiter,
    custom_pre_screened_candidates: req.custom_pre_screened_candidates,

    // Compensation
    salary_currency: req.custom_salary_range_currency,
    salary_min: req.custom_salary_range_min,
    salary_max: req.custom_salary_range_max,
    salary_timeframe: req.custom_salary_timeframe,
    expected_compensation: req.expected_compensation ? Number(req.expected_compensation) : undefined,

    // Dates
    recruitment_start_date: req.posting_date,
    expected_by: req.expected_by,
  } as Partial<JobRequisitionFormData>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const RequisitionForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const createJobRequisition = useCreateJobRequisition();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Detect edit mode from navigation state
  const existingRequisition: any | null = (location.state as any)?.requisition ?? null;
  const isEditMode = Boolean(existingRequisition);

  const [formData, setFormData] = useState<JobRequisitionFormData>({} as JobRequisitionFormData);
  const [isUpdating, setIsUpdating] = useState(false);

  // Pre-populate for edit mode
  useEffect(() => {
    if (isEditMode && existingRequisition) {
      const mapped = mapRequisitionToFormData(existingRequisition);
      setFormData(mapped as JobRequisitionFormData);
    }
  }, [isEditMode]);

  // Always set employee defaults (only when not overridden by edit data)
  useEffect(() => {
    if (currentEmployee?.name && !isEditMode) {
      setFormData((prev: any) => ({
        ...prev,
        hiring_manager: currentEmployee.name,
        company: currentEmployee.company,
      }));
    }
  }, [currentEmployee, isEditMode]);

  const handleNext = () => {
    if (currentStep < requisitionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (changed: any) => {
    const newData = { ...formData, ...changed.data };
    // Handle dynamic row generation for positions
    if (changed.changed?.component?.key === "number_of_new_positions") {
      const count = parseInt(changed.data.number_of_new_positions) || 0;
      if (count > 0) {
        newData.positions = Array.from({ length: count }, (_, i) => ({
          position_number: i + 1,
          location: newData.positions?.[i]?.location || "",
          functional_area: newData.positions?.[i]?.functional_area || "",
          reporting_manager: newData.positions?.[i]?.reporting_manager || "",
          employee_type: newData.positions?.[i]?.employee_type || "",
        }));
      }
    }

    if (changed.changed?.component?.key === "number_of_replacement_positions") {
      const count = parseInt(changed.data.number_of_replacement_positions) || 0;
      if (count > 0) {
        newData.replacement_positions = Array.from(
          { length: count },
          (_, i) => ({
            position_number: i + 1,
            location: newData.replacement_positions?.[i]?.location || "",
            replacement_for:
              newData.replacement_positions?.[i]?.replacement_for || "",
            reporting_manager:
              newData.replacement_positions?.[i]?.reporting_manager || "",
            employee_type:
              newData.replacement_positions?.[i]?.employee_type || "",
          }),
        );
      }
    }

    setFormData(newData);
  };

  const buildPayload = (finalData: any): CreateJobRequisitionPayload => {
    let custom_work_experience: string | undefined = undefined;
    let custom_work_experience_range: string | undefined = undefined;

    const expVal = finalData.custom_work_experience_range;
    if (expVal === "Fresher") {
      custom_work_experience = "Fresher";
    } else if (expVal === "1 - 3 Years") {
      custom_work_experience = "1 - 3 Years";
      custom_work_experience_range = "1 - 3 years";
    } else if (expVal === "4 - 5 Years") {
      custom_work_experience = "4 - 5 years";
      custom_work_experience_range = "3 - 5 years";
    } else if (expVal === "5 - 10 Years") {
      custom_work_experience = "5 - 10 years";
      custom_work_experience_range = "5 - 10 years";
    }

    return {
      requested_by: currentEmployee?.employee || currentEmployee?.name,
      company: finalData.company,
      department: finalData.department,
      designation: finalData.designation,
      requested_by_designation: finalData.designation,
      custom_functional_area: finalData.functional_area,
      custom_experience_range_from: finalData.experience_from?.toString(),
      custom_experience_range_to: finalData.experience_to?.toString(),
      custom_experience_unit: finalData.experience_unit,
      custom_hiring_lead: finalData.hiring_lead,
      custom_salary_range_currency: finalData.salary_currency,
      custom_salary_range_min: finalData.salary_min,
      custom_salary_range_max: finalData.salary_max,
      custom_salary_timeframe: finalData.salary_timeframe,
      posting_date: finalData.recruitment_start_date
        ? new Date(finalData.recruitment_start_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      requested_by_dept: finalData.department,
      custom_type_of_position:
        finalData.position_type === "new" ? "New" : "Replacement",
      no_of_positions:
        finalData.position_type === "new"
          ? finalData.number_of_new_positions
          : finalData.number_of_replacement_positions,
      custom_additional_roles__responsibilities:
        finalData.additional_roles_responsibilities,
      custom_additional_skills: finalData.additional_skills,
      custom_division: finalData.custom_division,
      status: finalData.status,
      expected_compensation: finalData.expected_compensation
        ? Number(finalData.expected_compensation)
        : undefined,
      expected_by: finalData.expected_by
        ? new Date(finalData.expected_by).toISOString().split("T")[0]
        : undefined,
      custom_employment_type: ["Full Time", "Part Time", "Contract", "Intern", "Freelance"].includes(
        finalData.custom__employee_type || ""
      )
        ? finalData.custom__employee_type
        : undefined,
      custom_employment_type_link: finalData.employment_type,
      custom__employee_type: finalData.custom__employee_type,
      custom_location: finalData.location,
      custom_work_experience,
      custom_work_experience_range,
      custom_preferred_notice_period: finalData.custom_preferred_notice_period,
      custom_preferred_company: finalData.preferred_company,
      custom_other_preferred_companies: finalData.custom_other_preferred_companies,
      custom_qualifications: finalData.custom_qualifications,
      custom_job_description_template: finalData.job_description_template,
      description: finalData.description,
      reason_for_requesting: finalData.reason_for_requesting,
      custom_skills: finalData.custom_skills,
      custom_assign_to_recruiter: finalData.custom_assign_to_recruiter,
      custom_pre_screened_candidates: finalData.custom_pre_screened_candidates,
      custom_position_details:
        finalData.position_type === "new"
          ? (finalData.positions || []).map((pos: PositionDetail) => ({
            vacancy_type: "New",
            location: pos.location,
            reporting_manager: pos.reporting_manager,
            employee_type: pos.employee_type,
            functional_area: pos.functional_area,
          }))
          : (finalData.replacement_positions || []).map((pos: ReplacementPositionDetail) => ({
            vacancy_type: "Replacement",
            location: pos.location,
            replacement_for: pos.replacement_for,
            reporting_manager: pos.reporting_manager,
            employee_type: pos.employee_type,
          })),
    };
  };

  const handleSubmit = async (submission: any) => {
    const finalData = { ...formData, ...submission.data };
    const payload = buildPayload(finalData);

    if (isEditMode) {
      // UPDATE flow
      setIsUpdating(true);
      try {
        await FrappeAPI.callMethod(
          "recruitment.api.job_requisition.update_job_requisition",
          {
            name: existingRequisition.name,
            payload,
          }
        );
        toast.success("Requisition updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["job-requisitions"] });
        navigate("/webapp/recruitment/requisition");
      } catch (error: any) {
        console.error("Error updating job requisition:", error);
        toast.error(error?.message || "Failed to update requisition. Please try again.");
      } finally {
        setIsUpdating(false);
      }
    } else {
      // CREATE flow
      try {
        await createJobRequisition.mutateAsync(payload);
        toast.success("Job requisition created successfully!");
        navigate("/webapp/recruitment/requisition");
      } catch (error) {
        console.error("Error creating job requisition:", error);
      }
    }
  };

  const getCurrentSchema = () => {
    const stepKey = requisitionSteps[currentStep].key as FormSchemaKeys;
    return requisitionFormSchemas[stepKey];
  };

  const isBusy = isUpdating || createJobRequisition.isPending;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white rounded-lg shadow">
      {/* Edit mode banner */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-3 py-2 border rounded-md hover:bg-gray-100 transition"
        >
          <X />
        </button>
      </div>
      {isEditMode && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          <span className="text-base text-gray-500"><Edit /></span>
          <span>
            Editing requisition{" "}
            <span className="font-semibold">{existingRequisition.name}</span>
            {" — "}{existingRequisition.designation}, {existingRequisition.department}
          </span>
        </div>
      )}

      <div className="mb-8 border-b overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max md:min-w-0">
          {requisitionSteps.map((step, index) => (
            <div
              key={step.key}
              className={`flex-1 min-w-[140px] md:min-w-0 text-center pb-4 px-2 cursor-pointer whitespace-nowrap ${index === currentStep
                ? "text-primary-500 border-b-2 border-primary-500 font-semibold"
                : "text-gray-500"
                }`}
              onClick={() => setCurrentStep(index)}
            >
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-6">
          {requisitionSteps[currentStep].label}
        </h2>

        <Form
          form={getCurrentSchema()}
          submission={{ data: formData }}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          size="md"
        >
          Previous
        </Button>

        {currentStep < requisitionSteps.length - 1 ? (
          <Button size="md" onClick={handleNext} className="px-4 md:px-6 py-2">
            Next
          </Button>
        ) : (
          <Button
            size="md"
            onClick={() => {
              handleSubmit({ data: formData });
            }}
            disabled={isBusy}
            className="px-4 md:px-6 py-2"
          >
            {isBusy
              ? isEditMode ? "Saving..." : "Submitting..."
              : isEditMode ? "Save Changes" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RequisitionForm;