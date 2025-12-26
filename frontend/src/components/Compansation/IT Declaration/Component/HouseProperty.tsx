import React from 'react';
import { Form } from '@tsed/react-formio';


const section24FormJSON = {
  display: "form",
  components: [
    {
      label: "SECTION 24 - INTEREST PAID ON HOUSING LOAN FOR LET-OUT PROPERTY",
      type: "panel",
      key: "section24",
      components: [
        {
          label: "Type of mode",
          widget: "choicesjs",
          type: "select",
          key: "typeOfMode",
          placeholder: "Home Loan Interest Paid for Let-out Property",
          data: {
            values: [
              { label: "Home Loan Interest Paid for Let-out Property", value: "homeLoanLetOut" }
            ]
          }
        },
        {
          label: "Amount",
          key: "amount",
          type: "number",
          placeholder: "Amount"
        },
        {
          type: "editgrid",
          label: "Loan Details",
          key: "loanRows",
          addAnother: "Add More",
          removeRow: "Delete",
          components: [
            { label: "Loan Sanction Date", key: "loanSanctionDate", type: "textfield" },
            { label: "Name of Lender", key: "nameLender", type: "textfield" },
            { label: "PAN of Lender", key: "panLender", type: "textfield" },
            {
              label: "House property type",
              widget: "choicesjs",
              type: "select",
              key: "housePropertyType",
              data: { values: [{ label: "NEW", value: "new" }, { label: "OLD", value: "old" }] }
            },
            {
              label: "Possession completed",
              widget: "choicesjs",
              type: "select",
              key: "possessionCompleted",
              data: { values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] }
            },
            { label: "Rental income from let out property", key: "rentalIncome", type: "number" },
            { key: "municipalTaxes", type: "number" },
            { label: "Standard deduction", key: "standardDeduction", type: "number" },
            { label: "Net rent value", key: "netRentValue", type: "number" },
            { label: "Interest on housing Loans", key: "interestHousing", type: "number" },
            { label: "Income/Loss", key: "incomeLoss", type: "number" },
            { label: "Percentage Contribution", key: "percentageContribution", type: "number", placeholder: "100" }
          ]
        }
      ]
    }
  ]
};

const HouseProperty: React.FC = () => {

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Form submitted');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1 className=' base-title'>
        House Property Declaration
      </h1>

     

      {/* 👇 Form.io form starts here */}
      <div style={{ marginTop: 40 }}>
        <Form form={section24FormJSON} />
      </div>

    </form>
  );
};

export default HouseProperty;
