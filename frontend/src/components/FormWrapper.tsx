import React, { useRef, useEffect } from "react";
import { Form } from "react-formio";
import "../components/formio/formio.css";

interface FormWrapperProps {
  form: any;
  onSubmit: (data: any) => void;
  initialData?: any;
  className?: string;
  loading?: boolean;
  readOnly?: boolean;
  onFormReady?: (formInstance: any) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  form,
  onSubmit,
  initialData,
  className = "",
  loading = false,
  readOnly = false,
  onFormReady,
}) => {
  const formRef = useRef<any>(null);

  useEffect(() => {
    if (formRef.current?.formio && initialData && Object.keys(initialData).length > 0) {
      const formInstance = formRef.current.formio;
      
      console.log('Populating form with initial data:', initialData);
      
      // Set form data
      formInstance.submission = {
        data: initialData
      };
      
      // Update individual components
      Object.keys(initialData).forEach((key) => {
        const component = formInstance.getComponent(key);
        if (component) {
          component.setValue(initialData[key]);
          component.redraw();
        }
      });
      
      // Redraw the entire form
      formInstance.redraw();
      
      // Call custom onFormReady callback if provided
      if (onFormReady) {
        onFormReady(formInstance);
      }
    }
  }, [initialData, onFormReady]);

  return (
    <div className={`formio-wrapper ${className}`}>
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading form...</span>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="formio-form">
              <Form
                ref={formRef}
                form={form}
                onSubmit={onSubmit}
                submission={{ data: initialData || {} }}
                options={{
                  readOnly: readOnly,
                  noAlerts: true,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormWrapper;