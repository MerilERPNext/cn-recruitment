/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef } from "react";
import "../../formio.custom.css";
import toast from "react-hot-toast";
import {
  useAddAttendanceAssignment,
  useAllIpRestrictions,
  useAllShiftBlocks,
  useAllShiftLocations,
  useAllWeekOffs,
  usePoliciesForEmployees,
  useShiftsForEmployees,
} from "../../hooks/useAttendance";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import CircularLoader from "../shared/atoms/CircularLoader";
import Button from "../shared/atoms/Button";
import { useTargetUser } from "../../context/ViewedUserContext";
import { Employee } from "../../types/employee";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

interface AttendanceAssignmentsProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
  onClose: () => void;
  open?: boolean;
  employees?: Employee[];
}

const AttendanceAssignments = ({
  onClose,
  open = true,
  employees = [],
}: AttendanceAssignmentsProps) => {
  const formInstance = useRef<any>(null);
  const { targetEmployeeId } = useTargetUser();

  const { data: currentEmployee } = useCurrentEmployeeAllDetails();

  // Use either the passed list or single employee from context
  const targetEmployees = employees.length > 0
    ? employees
    : targetEmployeeId || currentEmployee?.employee
      ? [{ employee: targetEmployeeId || currentEmployee?.employee }] as Partial<Employee>[]
      : [];

  const employeeIdForContext = employees.length > 0 ? employees[0].employee : (targetEmployeeId || currentEmployee?.employee);
  const { data: shifts } = useShiftsForEmployees(employeeIdForContext || "");
  const { data: policies } = usePoliciesForEmployees(employeeIdForContext || "");

  const { data: weekOffs } = useAllWeekOffs();
  const { data: ipRestrictions } = useAllIpRestrictions();
  const { data: geoFencingRestrictions } = useAllShiftLocations();
  const { data: allShiftBlocks } = useAllShiftBlocks();
  const mutation = useAddAttendanceAssignment();
  const overtimeForm = {
    // ... (rest of the form schema remains the same, skipping for brevity but keeping structure)
    display: "form",
    components: [
      {
        type: "panel",
        key: "attendance_assignments",
        label: "Attendance Assignments",
        hideLabel: true,
        customClass: "border-0",
        components: [
          {
            label: "Enable Web Clockin",
            key: "enable_web_clockin",
            type: "checkbox",
            input: true,
            customClass: "mb-4",
            defaultValue: false,
          },
          {
            label: "Enable Check In",
            key: "enable_check_in",
            type: "checkbox",
            input: true,
            customClass: "mb-4",
            defaultValue: false,
          },
          {
            label: "Allow self-enrollment for face recognition",
            key: "allow_self_enroll",
            type: "checkbox",
            input: true,
            customClass: "mb-4",
            defaultValue: false,
            customConditional: "show = !!data.enable_check_in ;",
          },
          {
            label: "IP Restriction",
            key: "ip_restriction",
            type: "select",
            input: true,
            placeholder: "Select Ip Restriction",
            customClass: "mb-4",
            // validate: { required: true },
            multiple: true,
            data: {
              values:
                ipRestrictions?.data?.map((item) => ({
                  label: `${item.name}`,
                  value: item.name,
                })) || [],
            },
            customConditional: "show = !!data.enable_web_clockin ;",
          },
          {
            label: "Geofencing Restriction",
            key: "geofencing_restriction",
            type: "select",
            input: true,
            placeholder: "Select Geofencing Restriction",
            customClass: "mb-4",
            validate: { required: true },
            multiple: true,
            data: {
              values:
                geoFencingRestrictions?.data?.map((item) => ({
                  label: `${item.location_name}`,
                  value: item.name,
                })) || [],
            },
            customConditional: "show = !!data.enable_check_in ;",
          },
          {
            label: "Use Shift Blocks",
            key: "use_shift_blocks",
            type: "checkbox",
            input: true,
            customClass: "mb-4",
            defaultValue: false,
          },
          {
            label: "Shift Name",
            key: "shift",
            type: "select",
            input: true,
            placeholder: "Shift  Name",
            customClass: "mb-4",
            validate: { required: true },
            data: {
              values: (Array.isArray(shifts) ? shifts : []).map((item) => ({
                label: `<div>
                    <div>${item?.[1] ?? "--"} (${item?.[0] ?? "--"})</div>
                    <div style="font-size:0.85em;color:#6b7280;margin-top:2px;">
                      ${item?.[4] ?? "--"} - ${item?.[5] ?? "--"}
                    </div>
                  </div>`,
                value: item?.[0],
              }))
            }
          },
          {
            label: "Shift Block",
            key: "shift_block",
            type: "select",
            input: true,
            placeholder: "Select Shift Block",
            customClass: "mb-4",
            validate: { required: true },
            data: {
              values:
                allShiftBlocks?.data?.map((item) => ({
                  label: `${item.name}`,
                  value: item.name,
                })) || [],
            },
            customConditional: "show = data.use_shift_blocks ;",
          },
          {
            label: "Weekly Off Name",
            key: "weekly_off",
            type: "select",
            input: true,
            placeholder: "Weekly Off",
            customClass: "mb-4",
            validate: { required: true },
            data: {
              values:
                weekOffs?.data?.map((item) => ({
                  label: `${item?.weekly_off} (${item.name})`,
                  value: item.name,
                })) || [],
            },
            customConditional: "show = !data.use_shift_blocks ;",
          },
          {
            label: "Policy Name",
            key: "policy_name",
            type: "select",
            input: true,
            placeholder: "Policy Name",
            customClass: "mb-4",
            validate: { required: true },
            data: {
              values: (Array.isArray(policies) ? policies : []).map((item) => ({
                label: `${item?.[1] ?? "--"} - ${item?.[0] ?? "--"}`,
                value: item?.[0],
              }))
            },
          },
          {
            label: "Effective From",
            key: "effective_from",
            type: "datetime",
            input: true,
            widget: { type: "calendar", minDate: new Date() },
            datePicker: {
              minDate: new Date(),
            },
            format: "dd-MM-yyyy",
            defaultValue: new Date(),
            placeholder: "dd-mm-yyyy",
            customClass: "mb-4",
            enableTime: false,
          },
        ],
      },
    ],
  };

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit();
      const submissionData = submission?.data || {};
      console.log(submission)
      const mappedData = {
        enable_web_clockin: submissionData.enable_web_clockin ? 1 : 0,
        enable_check_in: submissionData.enable_check_in ? 1 : 0,
        use_shift_blocks: submissionData.use_shift_blocks ? 1 : 0,
        shift: submissionData.shift || "none",
        weekly_off: submissionData.weekly_off || "none",
        policy_name: submissionData.policy_name || "none",
        effective_from: submissionData.effective_from?.split("T")[0] || "none",
      };
      if (targetEmployees.length > 0) {
        const promises = targetEmployees.map((emp) =>
          mutation.mutateAsync({
            employee: emp.employee || "",
            data: mappedData,
          }, {
            onError: (err) => {
              onClose()
              const error = errorResponseFormater(err)
              toast.error(error);
            }
          })
        );

        await Promise.all(promises);
        toast.success(`${targetEmployees.length} attendance assignments updated.`);
        onClose();
      } else {
        toast.error("No employees selected.");
      }
    } catch (err) {
      toast.error("Please correct the errors in the form.");
      console.warn("Form submission error -", err);
    }
  };
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center md:p-4 ">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { onClose() }} />
      <div className="relative w-full max-w-md bg-white md:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Attendance Assignments
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form.io Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <Form
            form={overtimeForm}
            onFormReady={(instance: any) => {
              formInstance.current = instance;
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              formClass: "space-y-6",
              rowClass: "flex flex-col md:flex-row md:space-x-4",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
              validateOnInit: true,
              validateOnBlur: true,
              validateOnChange: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="bg-white py-4 px-6 border-t border-gray-200">
          <Button
            size="md"
            onClick={handleSubmit}
            className="w-full rounded-lg py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            {mutation?.isPending ? (
              <CircularLoader size="sm" color="white" />
            ) : (
              "Update Assignments"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceAssignments;
