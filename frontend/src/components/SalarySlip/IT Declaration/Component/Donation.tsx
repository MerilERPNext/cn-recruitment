import { Form } from "@tsed/react-formio";


const DonationForm: React.FC = () => {
  const formJson = {
    display: "form",
    components: [
      { label: "NGO Name", key: "ngo", type: "textfield", input: true },
      { label: "Donation Amount", key: "amount", type: "number", input: true },
      {
        label: "Donation Type",
        key: "donation_type",
        type: "select",
        input: true,
        data: {
          values: [
            { label: "50% Deduction", value: "half" },
            { label: "100% Deduction", value: "full" }
          ]
        }
      },
      { label: "Receipt Upload", key: "receipt", type: "file", input: true }
    ]
  };

  return <Form form={formJson} />;
};

export default DonationForm;
