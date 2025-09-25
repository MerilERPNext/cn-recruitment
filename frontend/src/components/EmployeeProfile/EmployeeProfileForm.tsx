import { useRef, useEffect, useState } from "react";
import { Form } from "@tsed/react-formio";
import ProfileGridSkeleton from "./ProfileSkeleton";
import { useParams } from "react-router-dom";
import { useGetAllEmployeeFields } from "../../hooks/useEmployee";
import { convertToFormioWithLayout } from "./FrappeToFormIoConverter";

const EmployeeProfileForm: React.FC = () => {
  const { id: employeeId } = useParams<{ id: string }>();
  const [schema, setSchema] = useState(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstance = useRef<any>(null);

  const { data: employeeFields } = useGetAllEmployeeFields(employeeId || "");

  useEffect(() => {
    if (!employeeFields) return;

    const schema = convertToFormioWithLayout(employeeFields);
    setSchema(schema);
  }, [employeeFields]);

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit();
      const submissionData = submission?.data || {};
      console.log(submissionData);
    } catch (err) {
      console.warn("Form submission error -", err);
    }
  };

  if (!schema) {
    return <ProfileGridSkeleton />;
  }

  return (
    <div className="py-8 px-4">
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
      <div className="w-full bg-white py-2 ">
        <button
          onClick={handleSubmit}
          className="w-full rounded-lg py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  );
};

export default EmployeeProfileForm;
