/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { Form } from "@tsed/react-formio";
import { PersonalInfoProps } from "./MyProfile";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import { toast } from "react-hot-toast";

export const ContactInfo: React.FC<PersonalInfoProps> = ({ user, refetch }) => {
  const updateEmployeeMutation = useUpdateFrappeDocument();
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
      await updateEmployeeMutation.mutateAsync({
        doctype: "Employee",
        name: user?.name ?? "",
        data: basicSubmission.data,
      });
      refetch?.();
      toast.success("Employee details updated successfully!");
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Failed to update employee details. Please try again.");
    }
  }, []);

  return (
    <div className="h-full max-w-md mx-auto bg-gray-100 rounded-lg">
      <div className="p-4">
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
      <div className="sticky bottom-0 bg-white rounded-md border-t shadow-lg py-4 px-4 w-full z-50">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 max-h-12 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors items-center justify-center flex"
          >
            {updateEmployeeMutation.isPending ? (
              <div className="w-5 h-5 border-2 my-1 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;
