/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { Form } from "@tsed/react-formio";
import { PersonalInfoProps } from "./MyProfile";

export const AddressInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  const addressForm = useMemo(() => {
    return {
      components: [
        {
          type: "panel",
          key: "addressPanel",
          title: "Address Info",
          hideLabel: true,
          customClass: "bg-white rounded-lg shadow-md",
          components: [
            {
              type: "fieldset",
              key: "currentAddress",
              legend: "Current Address",
              customClass: "px-2 py-2",
              components: [
                {
                  type: "textarea",
                  key: "current_address",
                  label: "Address",
                  defaultValue: user?.current_address,
                  placeholder: "Enter your full address",
                  input: true,
                },
                {
                  type: "columns",
                  columns: [
                    {
                      width: 6,
                      components: [
                        {
                          type: "textfield",
                          key: "currentPinCode",
                          label: "Pin Code",
                          placeholder: "e.g. 110001",
                          input: true,
                        },
                      ],
                    },
                    {
                      width: 6,
                      components: [
                        {
                          type: "textfield",
                          key: "currentCity",
                          label: "City",
                          placeholder: "e.g. New Delhi",
                          input: true,
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "columns",
                  columns: [
                    {
                      components: [
                        {
                          type: "textfield",
                          key: "currentState",
                          label: "State",
                          placeholder: "e.g. Delhi",
                          input: true,
                        },
                      ],
                    },
                    {
                      components: [
                        {
                          type: "textfield",
                          key: "currentCountry",
                          label: "Country",
                          placeholder: "e.g. India",
                          input: true,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "checkbox",
              key: "sameAsCurrent",
              label: "Same as current",
              input: true,
              customClass: "px-2",
            },
            {
              type: "fieldset",
              key: "permanentAddress",
              legend: "Permanent Address",
              components: [
                {
                  type: "textarea",
                  key: "permanentFullAddress",
                  label: "Address",
                  placeholder: "Enter your full address",
                  input: true,
                  calculateValue:
                    "value = data.sameAsCurrent ? data.currentFullAddress : value",
                },
                {
                  type: "columns",
                  columns: [
                    {
                      components: [
                        {
                          type: "textfield",
                          key: "permanentPinCode",
                          label: "Pin Code",
                          placeholder: "e.g. 110001",
                          input: true,
                          calculateValue:
                            "value = data.sameAsCurrent ? data.currentPinCode : value",
                        },
                      ],
                    },
                    {
                      components: [
                        {
                          type: "textfield",
                          key: "permanentCity",
                          label: "City",
                          placeholder: "e.g. New Delhi",
                          input: true,
                          calculateValue:
                            "value = data.sameAsCurrent ? data.currentCity : value",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "columns",
                  columns: [
                    {
                      components: [
                        {
                          type: "textfield",
                          key: "permanentState",
                          label: "State",
                          placeholder: "e.g. Delhi",
                          input: true,
                          calculateValue:
                            "value = data.sameAsCurrent ? data.currentState : value",
                        },
                      ],
                    },
                    {
                      components: [
                        {
                          type: "textfield",
                          key: "permanentCountry",
                          label: "Country",
                          placeholder: "e.g. India",
                          input: true,
                          calculateValue:
                            "value = data.sameAsCurrent ? data.currentCountry : value",
                        },
                      ],
                    },
                  ],
                },
              ],
              customClass: "px-2 py-2",
            },
            {
              type: "button",
              action: "submit",
              label: "Save Changes",
              theme: "primary",
              customClass: "my-3 w-full px-2",
            },
          ],
        },
      ],
    };
  }, [user]);

  return (
    <div className="address-form-container rounded-xl max-w-md mx-auto bg-gray-100">
      <Form
        form={addressForm}
        options={{
          submitButton: false,
          rowClass: "flex 1234567 flex-nowrap bg-red-200",
        }}
        onSubmit={(submission: any) =>
          console.log("Address form submitted:", submission)
        }
      />
    </div>
  );
};

export default AddressInfo;
