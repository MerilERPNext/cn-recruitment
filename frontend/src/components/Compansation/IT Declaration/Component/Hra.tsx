import { Form } from "@tsed/react-formio";


const HRAForm = () => {
  const formJson = {
    display: "form",
    components: [
      { label: "Monthly Rent", key: "monthly_rent", type: "number", input: true },
      { label: "Landlord Name", key: "landlord_name", type: "textfield", input: true },
      { label: "Landlord PAN", key: "landlord_pan", type: "textfield", input: true },
      { label: "Rent Receipt Upload", key: "rent_receipt", type: "file", input: true }
    ]
  };

  return <Form form={formJson} />;
};

export default HRAForm;
