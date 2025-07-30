/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { Form } from "@tsed/react-formio";
import { PersonalInfoProps } from "./MyProfile";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import toast from "react-hot-toast";

export const AddressInfo: React.FC<PersonalInfoProps> = ({ user, refetch }) => {
  const updateEmployeeMutation = useUpdateFrappeDocument();
  const formAddressInstance = useRef<any>(null);

  const addressForm = useMemo(() => {
    return {
      type: "form",
      display: "form",
      components: [
        {
          customClass: "bg-white rounded-lg shadow-md px-4 mb-6",
          components: [
            {
              type: "fieldset",
              key: "currentAddress",
              legend: "Current Address",
              customClass: "py-2",
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
            },
            {
              type: "fieldset",
              key: "permanent_address",
              legend: "Permanent Address",
              customClass: "py-2 mb-6",
              components: [
                {
                  type: "textarea",
                  key: "permanent_address",
                  label: "Address",
                  placeholder: "Enter your full address",
                  input: true,
                  defaultValue: user?.permanent_address,
                  calculateValue:
                    "value = data.sameAsCurrent ? data.current_address : value",
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
                          customClass: "pb-2",
                          calculateValue:
                            "value = data.sameAsCurrent ? data.currentCountry : value",
                        },
                      ],
                    },
                  ],
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
      const basicSubmission = await formAddressInstance.current.submit();
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
    <div className="h-full address-form-container max-w-md mx-auto bg-gray-100 rounded-lg">
      <Form
        form={addressForm}
        options={{
          submitButton: false,
          rowClass: "flex 1234567 flex-nowrap bg-red-200",
        }}
        onFormReady={(instance: any) =>
          (formAddressInstance.current = instance)
        }
      />
      <div className="sticky bottom-0 bg-white rounded-md border-t shadow-lg py-4 px-4 w-full mt-6 z-50">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-3xl bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressInfo;
