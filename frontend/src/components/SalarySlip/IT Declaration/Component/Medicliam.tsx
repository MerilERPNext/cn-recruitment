import { Form } from "@tsed/react-formio";


const MediclaimForm: React.FC = () =>  {
  const formJson = {
    display: "form",
    components: [
      {
        label: "Policy Holder",
        key: "policy_holder",
        type: "select",
        input: true,
        data: {
          values: [
            { label: "Self", value: "self" },
            { label: "Parents", value: "parents" },
            { label: "Spouse", value: "spouse" },
            { label: "Children", value: "children" }
          ]
        }
      },
      { label: "Premium Amount", key: "premium", type: "number", input: true },
      { label: "Policy Document Upload", key: "policy_doc", type: "file", input: true }
    ]
  };

  return <Form form={formJson} />;
};

export default MediclaimForm;
