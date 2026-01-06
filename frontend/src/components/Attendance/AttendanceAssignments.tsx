/* eslint-disable @typescript-eslint/no-explicit-any */
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useRef } from "react";
import { createPortal } from "react-dom";
import "../../formio.custom.css";
import toast from "react-hot-toast";
import { useShiftTypes } from "../../hooks/useShift";
import {
  useAddAttendanceAssignment,
  useAllAttendancePolicies,
  useAllIpRestrictions,
  useAllShiftBlocks,
  useAllShiftLocations,
  useAllWeekOffs,
} from "../../hooks/useAttendance";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import CircularLoader from "../shared/atoms/CircularLoader";
import Button from "../shared/atoms/Button";

interface AttendanceAssignmentsProps {
  onSuccess?: (data?: any) => void;
  onCancel?: () => void;
  onClose: () => void;
  open?: boolean;
}

const AttendanceAssignments = ({
  onClose,
  open = true,
}: AttendanceAssignmentsProps) => {
  const formInstance = useRef<any>(null);

  const { data: shiftList } = useShiftTypes();
  const { data: attendancePolicy } = useAllAttendancePolicies();
  const { data: weekOffs } = useAllWeekOffs();
  const { data: ipRestrictions } = useAllIpRestrictions();
  const { data: geoFencingRestrictions } = useAllShiftLocations();
  const { data: allShiftBlocks } = useAllShiftBlocks();
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name || ""
  );
  const mutation = useAddAttendanceAssignment();
  const overtimeForm = {
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
            validate: { required: true },
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
                  label: `${item.name}`,
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
              values:
                shiftList?.data?.map((item) => ({
                  label: `${item.name}`,
                  value: item.name,
                })) || [],
            },
            customConditional: "show = !data.use_shift_blocks ;",
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
                  label: `${item.name}`,
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
              values:
                attendancePolicy?.data?.map((item) => ({
                  label: `${item.name}`,
                  value: item.name,
                })) || [],
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

      // Map all fields with proper boolean conversion and default values
      const mappedData = {
        enable_web_clockin: submissionData.enable_web_clockin ? 1 : 0,
        enable_check_in: submissionData.enable_check_in ? 1 : 0,
        use_shift_blocks: submissionData.use_shift_blocks ? 1 : 0,
        shift: submissionData.shift || "none",
        weekly_off: submissionData.weekly_off || "none",
        policy_name: submissionData.policy_name || "none",
        effective_from: submissionData.effective_from?.split("T")[0] || "none",
      };

      if (currentEmployee?.employee) {
        mutation.mutate(
          {
            employee: currentEmployee?.employee,
            data: mappedData,
          },
          {
            onSuccess() {
              toast.success("Form submitted successfully.");
              onClose();
            },
          }
        );
      }
    } catch (err) {
      // If form is invalid, prevent API call
      toast.error("Please fill in all required fields.");
      console.warn("Form submission error -", err);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-w-full overflow-hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
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
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <Button
            size="md"
            onClick={() => {
              handleSubmit();
            }}
            className="w-full rounded-lg py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            {mutation?.isPending ? (
              <CircularLoader size="sm" color="white" />
            ) : (
              "Update"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AttendanceAssignments;
