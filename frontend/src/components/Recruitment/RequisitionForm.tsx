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
import { useNavigate } from "react-router-dom";
import { formatDateToDDMMYYYY } from "../../utils/helperUtils";

const RequisitionForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const createJobRequisition = useCreateJobRequisition();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<JobRequisitionFormData>({} as JobRequisitionFormData);

  useEffect(() => {
    if (currentEmployee?.name) {
      setFormData((prev: any) => ({
        ...prev,
        hiring_manager: currentEmployee.name,
        company: currentEmployee.company,
      }));
    }
  }, [currentEmployee]);

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

  const handleSubmit = async (submission: any) => {
    const finalData = { ...formData, ...submission.data };

    // Transform form data to API format
    const transformedData: CreateJobRequisitionPayload = {
      requested_by: finalData.hiring_manager,
      company: finalData.company,
      department: finalData.department,
      designation: finalData.designation,
      custom_functional_area: finalData.functional_area,
      custom_experience_range_from: finalData.experience_from?.toString(),
      custom_experience_range_to: finalData.experience_to?.toString(),
      custom_experience_unit: finalData.experience_unit,
      custom_hiring_lead: finalData.hiring_lead,
      custom_salary_range_currency: finalData.salary_currency,
      custom_salary_range_min: finalData.salary_min,
      custom_salary_range_max: finalData.salary_max,
      custom_salary_timeframe: finalData.salary_timeframe,
      posting_date: formatDateToDDMMYYYY(finalData.recruitment_start_date),
      // ? new Date(finalData.recruitment_start_date).toISOString().split("T")[0]
      // : new Date().toISOString().split("T")[0],
      requested_by_dept: finalData.department,
      custom_type_of_position:
        finalData.position_type === "new" ? "New" : "Replacement",
      no_of_positions:
        finalData.position_type === "new"
          ? finalData.number_of_new_positions
          : finalData.number_of_replacement_positions,
      custom_comments__instructions: finalData.comments_instructions || "",
      custom_cost_centre: finalData.cost_centre,
      custom_designation_change: finalData.designation_change,
      custom_additional_roles__responsibilities:
        finalData.additional_roles_responsibilities,
      custom_additional_skills: finalData.additional_skills,

      // New fields mapping
      custom_division: finalData.custom_division,
      status: finalData.status,
      expected_compensation: finalData.expected_compensation ? Number(finalData.expected_compensation) : undefined,
      expected_by: formatDateToDDMMYYYY(finalData.expected_by),
      custom_employment_type: finalData.custom_employment_type,
      custom_employment_type_link: finalData.custom_employment_type_link,
      custom_location: finalData.custom_location,
      custom_work_experience_range: finalData.custom_work_experience_range,
      custom_preferred_notice_period: finalData.custom_preferred_notice_period,
      custom_preferred_company: finalData.custom_preferred_company,
      custom_other_preferred_companies: finalData.custom_other_preferred_companies,
      custom_qualifications: finalData.custom_qualifications,
      custom_job_description_template: finalData.custom_job_description_template,
      description: finalData.description,
      reason_for_requesting: finalData.reason_for_requesting,
      custom_skills: finalData.custom_skills,
      custom_assign_to_recruiter: finalData.custom_assign_to_recruiter,
      custom_pre_screened_candidates: finalData.custom_pre_screened_candidates,

      // Transform positions array
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

    try {
      await createJobRequisition.mutateAsync(transformedData);
      toast.success("Job requisition created successfully!");
      navigate("/webapp/recruitment/requisition");
    } catch (error) {
      console.error("Error creating job requisition:", error);
    }
  };

  const getCurrentSchema = () => {
    const stepKey = requisitionSteps[currentStep].key as FormSchemaKeys;
    return requisitionFormSchemas[stepKey];
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white rounded-lg shadow">
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
            disabled={createJobRequisition.isPending}
            className="px-4 md:px-6 py-2"
          >
            {createJobRequisition.isPending ? "Submitting..." : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RequisitionForm;