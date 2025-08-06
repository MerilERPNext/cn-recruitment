/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { Form } from "@tsed/react-formio";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import toast from "react-hot-toast";
import { Employee } from "../../types/employee";

export interface Address {
  name: string;
  address_title: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  state: string;
  country: string;
  pincode: string;
  email_id: string;
  phone: string;
}

export interface AddressInfoData {
  current_address: Address;
  permanent_address: Address;
  emergency_address: Address;
}

export interface AddressInfoProps {
  userAddress: AddressInfoData | undefined;
  user: Employee | null | undefined;
  refetch?: () => void;
}

export const AddressInfo: React.FC<AddressInfoProps> = ({
  userAddress,
  user,
  refetch,
}) => {
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
                  defaultValue: userAddress?.current_address?.address_line1,
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
                          defaultValue: userAddress?.current_address?.pincode,
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
                          defaultValue: userAddress?.current_address?.city,
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
                          defaultValue: userAddress?.current_address?.state,
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
                          defaultValue: userAddress?.current_address?.country,
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
                  defaultValue: userAddress?.permanent_address?.address_line1,
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
                          defaultValue: userAddress?.permanent_address?.pincode,
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
                          defaultValue: userAddress?.permanent_address?.city,
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
                          defaultValue: userAddress?.permanent_address?.state,
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
                          defaultValue: userAddress?.permanent_address?.country,
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
  }, [userAddress]);

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
      <div className="p-4">
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
      </div>
      <div className="sticky bottom-0 bg-white rounded-md border-t shadow-lg py-4 px-4 w-full mt-6 z-50">
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

export default AddressInfo;
