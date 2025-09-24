// import HRLetters from "./HRLetters";
import HeaderBar from "../HeaderBar";
import { useNavigate, useParams } from "react-router-dom";
import { useGetAllEmployeeFields } from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";

import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useEffect, useState } from "react";
import { Form } from "@tsed/react-formio";
import { convertToFormioWithLayout } from "./FrappeToFormIoConverter";

export interface PersonalInfoProps {
  user: Employee | null | undefined;
  refetch?: () => void;
}

const EmployeeProfile: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { id: employeeId } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const [schema, setSchema] = useState(null);

  const { data: employeeFields } = useGetAllEmployeeFields(employeeId || "");
  useEffect(() => {
    if (!employeeFields) return;

    const schema = convertToFormioWithLayout(employeeFields);
    setSchema(schema);
  }, [employeeFields]);
  const mobileLayout = (
    <div className="bg-white font-sans scroll-smooth">
      <div className="bg-white shadow">
        <HeaderBar title="Employee Profile" onBack={() => navigate(-1)} />
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
              {schema && <Form className={"profile-form"} form={schema} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="My Profile">
      <div className="flex h-full bg-gray-50">
        {/* Profile Sidebar */}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
              {schema && <Form className={"profile-form"} form={schema} />}
            </div>
          </div>
        </div>
      </div>
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default EmployeeProfile;
