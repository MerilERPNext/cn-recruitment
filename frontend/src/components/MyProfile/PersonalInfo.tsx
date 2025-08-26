/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useRef } from "react";
import { Form } from "@tsed/react-formio";
import { PersonalInfoProps } from "./MyProfile";
import {
  useGenderTypes,
  useUpdateCurrentEmployeeProfile,
} from "../../hooks/useEmployee";

export const PersonalInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  const { updateEmployeeMutation } = useUpdateCurrentEmployeeProfile();
  const formPersonalInfoInstance = useRef<any>(null);

  const { data: genderTypes } = useGenderTypes();

  const personalInfoForm = useMemo(() => {
    return {
      type: "form",
      display: "form",
      components: [
        {
          type: "panel",
          key: "personalPanel",
          title: "Personal Info",
          hideLabel: true,
          customClass: "bg-white rounded-lg shadow-md mb-6",
          components: [
            {
              type: "fieldset",
              key: "personalInfo",
              hideLabel: true,
              components: [
                {
                  type: "textfield",
                  key: "employee_name",
                  label: "Full Name",
                  input: true,
                  disabled: true,
                  validate: { required: true },
                  customClass: "px-2",
                  defaultValue: user?.employee_name ?? "",
                  placeholder: "John Doe",
                  autofocus: false,
                },
                {
                  type: "columns",
                  customClass: "px-2",
                  columns: [
                    {
                      components: [
                        {
                          type: "datetime",
                          key: "date_of_birth",
                          label: "Date of Birth",
                          disabled: true,
                          enableTime: false,
                          input: true,
                          defaultValue: user?.date_of_birth ?? "",
                          validate: { required: true },
                          placeholder: "1990-08-15",
                          dateFormate: "dd-MM-yyyy",
                          flatpickr: { appendTo: ".address-form-container" },
                          autofocus: false,
                        },
                      ],
                    },
                    {
                      components: [
                        {
                          type: "select",
                          key: "gender",
                          label: "Gender",
                          input: true,
                          validate: { required: true },
                          placeholder: "Eg.. Male",
                          defaultValue: user?.gender ?? "",
                          data: {
                            values: genderTypes?.data.map((s) => ({
                              label: s?.name,
                              value: s?.name,
                            })),
                          },
                          customClass: "appearance-none",
                          autofocus: false,
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "columns",
                  customClass: "px-2",
                  columns: [
                    {
                      components: [
                        {
                          type: "select",
                          key: "marital_status",
                          label: "Marital Status",
                          input: true,
                          validate: { required: true },
                          placeholder: "Eg. Single",
                          defaultValue: user?.marital_status ?? "",
                          data: {
                            values: [
                              { value: "Married", label: "Married" },
                              { value: "Single", label: "Single" },
                              { value: "Divorced", label: "Divorced" },
                              { value: "Widowed", label: "Widowed" },
                            ],
                          },
                          customClass: "appearance-none",
                          autofocus: false,
                        },
                      ],
                    },
                    {
                      components: [
                        {
                          type: "select",
                          key: "blood_group",
                          label: "Blood Group",
                          input: true,
                          placeholder: "A+",
                          defaultValue: user?.blood_group ?? "",
                          data: {
                            values: [
                              { value: "A+", label: "A+" },
                              { value: "A-", label: "A-" },
                              { value: "B+", label: "B-" },
                              { value: "B-", label: "B-" },
                              { value: "O+", label: "O+" },
                              { value: "O-", label: "O-" },
                              { value: "AB+", label: "AB+" },
                              { value: "AB-", label: "AB-" },
                            ],
                          },
                          customClass: "appearance-none",
                          autofocus: false,
                        },
                      ],
                    },
                  ],
                },
              ],
              customClass: "rounded-lg mb-6",
              autofocus: false,
            },
            {
              type: "fieldset",
              key: "emergencyPanel",
              legend: "Emergency Contact",
              hideLabel: true,
              customClass: "rounded-lg px-2",
              components: [
                {
                  type: "textfield",
                  key: "person_to_be_contacted",
                  label: "Name",
                  input: true,
                  validate: { required: true },
                  defaultValue: user?.person_to_be_contacted ?? "",
                  placeholder: "John Doe",
                  autofocus: false,
                },
                {
                  type: "textfield",
                  key: "emergency_phone_number",
                  label: "Number",
                  input: true,
                  validate: { required: true },
                  customClass: "pb-2",
                  defaultValue: user?.emergency_phone_number ?? "",
                  placeholder: "+1 (555) 123-4567",
                  autofocus: false,
                },
              ],
            },
          ],
        },
      ],
    };
  }, [user, genderTypes]);

  const handleSubmit = useCallback(async () => {
    try {
      const basicSubmission = await formPersonalInfoInstance.current.submit();
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
    <div className="address-form-container h-full b">
      <div className="p-4 md:p-8">
        {/* Header - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block border-b border-gray-200 pb-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Personal Information
          </h2>
          <p className="text-gray-600">
            Update your personal details and emergency contact information
          </p>
        </div>

        {/* Form Container with centered alignment for desktop */}
        <div className="max-w-full md:max-w-4xl md:mx-auto">
          <Form
            key={user?.employee || "loading"}
            form={personalInfoForm}
            onFormReady={(instance: any) =>
              (formPersonalInfoInstance.current = instance)
            }
            options={{
              submitButton: false,
            }}
          />
        </div>

        {/* Submit Button - Adjusting for full-width on mobile */}
        <div className="mt-8 flex justify-center md:flex md:justify-end w-full md:w-auto">
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

export default PersonalInfo;