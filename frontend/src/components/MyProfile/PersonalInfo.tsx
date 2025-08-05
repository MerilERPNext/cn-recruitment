/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useRef } from "react";
import { Form } from "@tsed/react-formio";
import { PersonalInfoProps } from "./MyProfile";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import { useGenderTypes } from "../../hooks/useEmployee";
import toast from "react-hot-toast";

export const PersonalInfo: React.FC<PersonalInfoProps> = ({
  user,
  refetch,
}) => {
  const updateEmployeeMutation = useUpdateFrappeDocument();
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
                      width: 6,
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
                          placeholder: "15-08-1990",
                          flatpickr: { appendTo: ".address-form-container" },
                          autofocus: false,
                        },
                      ],
                    },
                    {
                      width: 6,
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
                      width: 6,
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
                      width: 6,
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
                              { value: "B+", label: "B+" },
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
    <div className="address-form-container h-full max-w-md mx-auto bg-gray-100 rounded-lg">
      <div className="p-4">
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
      <div className="sticky bottom-0 bg-white rounded-md border-t shadow-lg py-4 px-4 w-full z-50">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;
