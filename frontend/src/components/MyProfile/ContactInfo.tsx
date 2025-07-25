/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {useMemo} from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import {Form} from "@tsed/react-formio";
import {PersonalInfoProps} from "./MyProfile";

export const ContactInfo: React.FC<PersonalInfoProps> = ({ user }) => {
  const contactInfoForm = useMemo(() => {
    return {
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
                  key: "whatsapp_number",
                  label: "WhatsApp Number (Optional)",
                  input: true,
                  placeholder: "Enter WhatsApp Number",
                },
                {
                  type: "email",
                  key: "emergency_email",
                  label: "Emergency Email (Optional)",
                  input: true,
                  placeholder: "Enter Emergency Email",
                  customClass: "pb-2",
                },
                {
                  type: "button",
                  action: "submit",
                  label: "Save Changes",
                  theme: "primary",
                  customClass: "my-3 w-full",
                },
              ],
            },
          ],
        },
      ],
    };
  }, [user]);

  return (
    <div className="max-w-md mx-auto bg-gray-100 rounded-lg">
      <Form
        form={contactInfoForm}
        options={{
          submitButton: false,
        }}
        onSubmit={(submission: any) => {
          console.log("Contact Info saved:", submission.data);
        }}
      />
    </div>
  );
};

export default ContactInfo;
