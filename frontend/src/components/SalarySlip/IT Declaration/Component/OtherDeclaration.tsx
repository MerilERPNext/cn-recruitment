/* eslint-disable @typescript-eslint/no-explicit-any */

import { Form } from "@tsed/react-formio"


const formJson = {
    
        "display": "form",
        "components": [
          {
            "label": "TDS ON OTHER INCOME (QUALIFIED AMOUNT: NO LIMIT)",
            "type": "panel",
            "key": "tdsPanel",
            "components": [
              {
                "label": "Details of TDS",
                "widget": "choicesjs",
                "type": "select",
                "key": "detailsOfTds",
                "data": {
                  "values": [
                    { "label": "192A", "value": "192A" },
                    { "label": "194A", "value": "194A" },
                    { "label": "194C", "value": "194C" },
                    { "label": "194H", "value": "194H" }
                  ]
                },
                "placeholder": "Select Details of TDS"
              },
              {
                "label": "Income",
                "key": "incomeAmount",
                "type": "number",
                "placeholder": "Amount"
              },
              {
                "label": "Tax",
                "key": "taxAmount",
                "type": "number",
                "placeholder": "Amount"
              },
              {
                "label": "TDS Rows",
                "type": "editgrid",
                "key": "tdsRows",
                "addAnother": "Add More",
                "removeRow": "Delete",
                "components": [
                  {
                    "label": "Section of TDS Deduction",
                    "key": "sectionTds",
                    "type": "textfield",
                    "validate": { "required": true }
                  },
                  {
                    "label": "Name of Deductor",
                    "key": "nameDeductor",
                    "type": "textfield",
                    "validate": { "required": true }
                  },
                  {
                    "label": "Address of Deductor",
                    "key": "addressDeductor",
                    "type": "textfield",
                    "validate": { "required": true }
                  },
                  {
                    "label": "TAN of Deductor",
                    "key": "tanDeductor",
                    "type": "textfield",
                    "validate": { "required": true }
                  },
                  {
                    "label": "Amount of Income Received/Credited",
                    "key": "incomeReceived",
                    "type": "number",
                    "validate": { "required": true }
                  },
                  {
                    "label": "Amount of Tax Deducted",
                    "key": "taxDeducted",
                    "type": "number",
                    "validate": { "required": true }
                  }
                ]
              }
            ]
          }
        ]
      }
      


const OtherDeclaration: React.FC = () =>  {
  return (
    <div>
      <h2 className=" base-title mb-2">TDS on Other Income</h2>

      <Form
        form={formJson}
        onSubmit={(data: any) => console.log("FORM DATA:", data)}
      />
    </div>
  )
}
export default OtherDeclaration