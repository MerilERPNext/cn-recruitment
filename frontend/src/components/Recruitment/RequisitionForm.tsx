// import React, { useState } from "react";
// import { Form } from "@tsed/react-formio";
// import {
//   requisitionSteps,
//   requisitionFormSchemas,
//   FormSchemaKeys,
// } from "./requisitionFormSchemas";
// import Button from "../shared/atoms/Button";

// const RequisitionForm = () => {
//   const [currentStep, setCurrentStep] = useState(0);
//   const [formData, setFormData] = useState<any>({});

//   const handleNext = () => {
//     if (currentStep < requisitionSteps.length - 1) {
//       setCurrentStep(currentStep + 1);
//     }
//   };

//   const handlePrevious = () => {
//     if (currentStep > 0) {
//       setCurrentStep(currentStep - 1);
//     }
//   };

//   const handleChange = (changed: any) => {
//     setFormData({ ...formData, ...changed.data });
//   };

//   const handleSubmit = (submission: any) => {
//     console.log("Final submission:", { ...formData, ...submission.data });
//     // Handle final form submission - API call here
//   };

//   const getCurrentSchema = () => {
//     const stepKey = requisitionSteps[currentStep].key as FormSchemaKeys;
//     return requisitionFormSchemas[stepKey];
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow">
//       {/* Step Navigation */}
//       <div className="flex mb-8 border-b">
//         {requisitionSteps.map((step, index) => (
//           <div
//             key={step.key}
//             className={`flex-1 text-center pb-4 cursor-pointer ${
//               index === currentStep
//                 ? "text-primary-500 border-b-2 border-primary-500 font-semibold"
//                 : "text-gray-500"
//             }`}
//             onClick={() => setCurrentStep(index)}
//           >
//             {step.label}
//           </div>
//         ))}
//       </div>

//       {/* Form Content */}
//       <div className="mb-6">
//         <h2 className="text-2xl font-semibold mb-6">
//           {requisitionSteps[currentStep].label}
//         </h2>

//         <Form
//           form={getCurrentSchema()}
//           submission={{ data: formData }}
//           onChange={handleChange}
//           onSubmit={
//             currentStep === requisitionSteps.length - 1
//               ? handleSubmit
//               : undefined
//           }
//         />
//       </div>

//       {/* Navigation Buttons */}
//       <div className="flex justify-between mt-8">
//         <Button
//           onClick={handlePrevious}
//           disabled={currentStep === 0}
//           size="md"
//           className={`px-6 py-2 rounded ${
//             currentStep === 0
//               ? "bg-gray-500 text-gray-500 cursor-not-allowed hover:bg-gray-500"
//               : "bg-gray-500 text-white hover:bg-gray-600"
//           }`}
//         >
//           Previous
//         </Button>

//         {currentStep < requisitionSteps.length - 1 ? (
//           <Button size="md" onClick={handleNext} className="px-6 py-2">
//             Next
//           </Button>
//         ) : (
//           <Button
//             size="md"
//             onClick={() => {
//               const form = document.querySelector("form");
//               if (form) {
//                 form.dispatchEvent(
//                   new Event("submit", { cancelable: true, bubbles: true })
//                 );
//               }
//             }}
//             className="px-6 py-2"
//           >
//             Submit
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// };

// export default RequisitionForm;

import { useState } from "react";
import { Form } from "@tsed/react-formio";
import {
  requisitionSteps,
  requisitionFormSchemas,
  FormSchemaKeys,
} from "./requisitionFormSchemas";
import Button from "../shared/atoms/Button";

const RequisitionForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});

  const handleNext = () => {
    if (currentStep < requisitionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (changed: any) => {
    setFormData({ ...formData, ...changed.data });
  };

  const handleSubmit = (submission: any) => {
    console.log("Final submission:", { ...formData, ...submission.data });
    // Handle final form submission - API call here
  };

  const getCurrentSchema = () => {
    const stepKey = requisitionSteps[currentStep].key as FormSchemaKeys;
    return requisitionFormSchemas[stepKey];
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white rounded-lg shadow">
      <div className="mb-8 border-b overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max md:min-w-0">
          {requisitionSteps.map((step, index) => (
            <div
              key={step.key}
              className={`flex-1 min-w-[140px] md:min-w-0 text-center pb-4 px-2 cursor-pointer whitespace-nowrap ${
                index === currentStep
                  ? "text-primary-500 border-b-2 border-primary-500 font-semibold"
                  : "text-gray-500"
              }`}
              onClick={() => setCurrentStep(index)}
            >
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-6">
          {requisitionSteps[currentStep].label}
        </h2>

        <Form
          form={getCurrentSchema()}
          submission={{ data: formData }}
          onChange={handleChange}
          onSubmit={
            currentStep === requisitionSteps.length - 1
              ? handleSubmit
              : undefined
          }
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          size="md"
          // className={`px-4 md:px-6 py-2 rounded ${
          //   currentStep === 0
          //     ? "bg-gray-500 text-gray-500 cursor-not-allowed hover:bg-gray-500"
          //     : "bg-gray-500 text-white hover:bg-gray-600"
          // }`}
        >
          Previous
        </Button>

        {currentStep < requisitionSteps.length - 1 ? (
          <Button size="md" onClick={handleNext} className="px-4 md:px-6 py-2">
            Next
          </Button>
        ) : (
          <Button
            size="md"
            onClick={() => {
              const form = document.querySelector("form");
              if (form) {
                form.dispatchEvent(
                  new Event("submit", { cancelable: true, bubbles: true })
                );
              }
            }}
            className="px-4 md:px-6 py-2"
          >
            Submit
          </Button>
        )}
      </div>
    </div>
  );
};

export default RequisitionForm;
