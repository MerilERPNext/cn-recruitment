import React, { useMemo } from "react";
// @ts-expect-error ignore
import { Form } from "@tsed/react-formio";
import { PersonalInfoProps } from "./MyProfile";

export const PersonalInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  const personalInfoForm = useMemo(() => {
    const fullName = [user?.first_name, user?.middle_name, user?.last_name]
      .filter(Boolean)
      .join(" ");

    return {
      components: [
        {
          type: "panel",
          key: "personalPanel",
          title: "Personal Info",
          hideLabel: true,
          components: [
            {
              type: "fieldset",
              key: "personalInfo",
              hideLabel: true,
              components: [
                {
                  type: "textfield",
                  key: "fullName",
                  label: "Full Name",
                  input: true,
                  validate: { required: true },
                  customClass: "px-2",
                  defaultValue: fullName ?? "",
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
                          placeholder: "Male",
                          defaultValue: user?.gender ?? "",
                          data: {
                            values: [
                              { value: "male", label: "Male" },
                              { value: "female", label: "Female" },
                              { value: "other", label: "Other" },
                            ],
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
                {
                  type: "textfield",
                  key: "nationality",
                  label: "Nationality",
                  input: true,
                  validate: { required: true },
                  customClass: "px-2 pb-2",
                  placeholder: "India",
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
            {
              type: "button",
              action: "submit",
              label: "Save Changes",
              theme: "primary",
              customClass: "my-6 w-full black",
            },
          ],
        },
      ],
    };
  }, [user]);

  return (
    <div className="address-form-container max-w-md mx-auto rounded-lg bg-gray-100 shadow-md">
      <Form
        key={user?.employee || "loading"}
        form={personalInfoForm}
        options={{
          builder: { styles: false },
          submitButton: false,
          formClass: "space-y-6",
          rowClass: "flex flex-col",
          labelClass: "mb-1 font-medium text-gray-700",
          inputClass:
            "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
          validateOnInit: false,
          validateOnBlur: false,
          validateOnChange: false,
        }}
        className="space-y-6"
        onSubmit={(submission: { data: never }) =>
          console.log("Form data:", submission?.data)
        }
      />
    </div>
  );
};

export default PersonalInfo;
