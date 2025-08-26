/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { Form } from "@tsed/react-formio";
import { PersonalInfoProps } from "./MyProfile";
import { useUpdateCurrentEmployeeProfile } from "../../hooks/useEmployee";

export const ContactInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  const { updateEmployeeMutation } = useUpdateCurrentEmployeeProfile();
  const formContactInfoInstance = useRef<any>(null);
  const contactInfoForm = useMemo(() => {
    return {
      type: "form",
      display: "form",
      components: [
        {
          type: "panel",
          key: "contactPanel",
          title: "Contact Information",
          hideLabel: true,
          customClass: "bg-white rounded-lg shadow-md mb-6",
          components: [
            {
              type: "fieldset",
              key: "contactInfo",
              legend: "Contact Information",
              customClass: "px-2",
              components: [
                {
                  type: "textfield",
                  key: "cell_number",
                  label: "Mobile Number",
                  input: true,
                  defaultValue: user?.cell_number,
                  validate: { required: true, pattern: "^\\+?[0-9\\- ]+$" },
                  placeholder: "+1 (555) 123-4567",
                },
                {
                  type: "email",
                  key: "personal_email",
                  label: "Personal Email ID",
                  input: true,
                  defaultValue: user?.personal_email,
                  validate: { required: true },
                  placeholder: "jane.doe@example.com",
                },
                {
                  type: "email",
                  key: "company_email",
                  label: "Office Email ID",
                  input: true,
                  disabled: true,
                  defaultValue: user?.company_email,
                  placeholder: "jane.doe@company.com",
                },
                {
                  type: "textfield",
                  key: "custom_whatsapp_no",
                  label: "WhatsApp Number (Optional)",
                  input: true,
                  placeholder: "Enter WhatsApp Number",
                },
                {
                  type: "email",
                  key: "custom_emergency_email",
                  label: "Emergency Email (Optional)",
                  input: true,
                  placeholder: "Enter Emergency Email",
                  customClass: "pb-2",
                },
              ],
            },
          ],
        },
      ],
    };
  }, [user]);

  const handleSubmit = useCallback(async () => {
    try {
      const basicSubmission = await formContactInfoInstance.current.submit();
      const formData = basicSubmission.data as Record<string, any>;
      const jsonData = Object.entries(formData).map(([field, value]) => ({
        field,
        new: value,
      }));

      const payload = {
        employee_code: user?.employee ?? "",
        json_data: jsonData,
      };
      await updateEmployeeMutation.mutateAsync(payload);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  }, [user]);

  return (
    <div className="h-full">
      <div className="p-4 md:p-8">
        {/* Header - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block border-b border-gray-200 pb-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Contact Information
          </h2>
          <p className="text-gray-600">
            Manage your contact details and communication preferences
          </p>
        </div>

        {/* Form Container */}
        <div className="max-w-full md:max-w-4xl md:mx-auto">
          <Form
            form={contactInfoForm}
            onFormReady={(instance: any) =>
              (formContactInfoInstance.current = instance)
            }
            options={{
              submitButton: false,
            }}
          />
        </div>

        {/* Submit Button */}
        <div className="p-1 sticky bottom-0 left-0 right-0 bg-white border-t md:mt-8 flex justify-center md:justify-end md:w-full md:p-0 z-10">
          <button
            onClick={handleSubmit}
            disabled={updateEmployeeMutation.isPending}
            className="w-full md:w-auto px-8 py-3 rounded-xl bg-black text-white font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {updateEmployeeMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;