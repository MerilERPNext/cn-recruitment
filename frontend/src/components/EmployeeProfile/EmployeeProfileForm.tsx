import { useRef, useEffect, useState } from "react";
import { Form } from "@tsed/react-formio";
import ProfileGridSkeleton from "./ProfileSkeleton";
import { useParams } from "react-router-dom";
import {
  useGetEmployeeDetailsByEmpId,
  useGetEmployeeFieldPermissions,
} from "../../hooks/useEmployee";
import { convertToFormioWithLayout } from "./FrappeToFormIoConverter";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import CircularLoader from "../shared/atoms/CircularLoader";
import toast from "react-hot-toast";

const EmployeeProfileForm: React.FC = () => {
  const { id: employeeId } = useParams<{ id: string }>();
  const [schema, setSchema] = useState(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstance = useRef<any>(null);
  const employee = useGetEmployeeDetailsByEmpId(employeeId || "");
  const mutation = useUpdateFrappeDocument();
  const { data: fieldPermissions } = useGetEmployeeFieldPermissions({
    doctype: "Employee",
    docname: employeeId,
    all_fields: 0,
    detailed: 1,
    include_breaks: 1,
  });

  useEffect(() => {
    if (!fieldPermissions || !employee?.data) return;

    const schema = convertToFormioWithLayout(fieldPermissions, employee?.data);
    setSchema(schema);
  }, [fieldPermissions, employee?.data]);

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit();
      const submissionData = submission?.data || {};
      // Here we convert the file object to a simple URL and return other values as they were
      const formattedData = Object.entries(submissionData).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc: { [key: string]: any }, [key, value]) => {
          if (key === "branch") {
            return acc;
          }

          if (Array.isArray(value) && !value.length) {
            acc[key] = "";
          } else if (
            Array.isArray(value) &&
            (value[0]?.storage === "customBase64" ||
              value[0]?.storage === "url")
          ) {
            acc[key] = value[0]?.url;
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );

      if (employeeId) {
        mutation.mutate(
          {
            doctype: "Employee",
            name: employeeId,
            data: formattedData,
          },
          {
            onSuccess() {
              employee.refetch();
              toast.success("Updated data successfully.");
            },
            onError(err) {
              toast.error("Failed to update data.");
              console.warn("Form submission error -", err);
            },
          }
        );
      }
    } catch (err) {
      toast.error("Failed to update data.");

      console.warn("Form submission error -", err);
    }
  };

  if (!schema || !employee?.data) {
    return <ProfileGridSkeleton />;
  }

  return (
    <div className="p-2">
      <Form
        className={"profile-form"}
        form={schema}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onFormReady={(instance: any) => {
          formInstance.current = instance;
        }}
        options={{
          builder: { styles: false },
          submitButton: false,
          alerts: false,
          disableOnSubmit: true,
          rowClass: "flex flex-col md:flex-row md:space-x-4",
          labelClass: "mb-1 font-medium text-gray-700",
          inputClass:
            "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
          validateOnInit: true,
          validateOnBlur: true,
          validateOnChange: false,
          disableOnInit: mutation.isPending,
          formClass: mutation.isPending ? "form-disabled" : "space-y-6",
        }}
      />
      <div className="w-full bg-white py-2 ">
        <button
          onClick={handleSubmit}
          disabled={mutation?.isPending}
          className="w-full rounded-lg py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors hidden"
        >
          {mutation?.isPending || employee.isLoading ? (
            <CircularLoader size="sm" color="white" />
          ) : (
            "Update"
          )}{" "}
        </button>
      </div>
    </div>
  );
};

export default EmployeeProfileForm;
