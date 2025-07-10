import React, { useState } from 'react';
import { FormBuilder } from 'react-formio';

interface DynamicFormBuilderProps {
  initialForm?: any;
  onSave?: (formSchema: any) => void;
  onCancel?: () => void;
  title?: string;
}

const DynamicFormBuilder: React.FC<DynamicFormBuilderProps> = ({
  initialForm,
  onSave,
  onCancel,
  title = "Form Builder"
}) => {
  const [formSchema, setFormSchema] = useState<any>(initialForm || {
    display: 'form',
    components: []
  });

  const handleSave = (schema: any) => {
    console.log('Form schema saved:', schema);
    setFormSchema(schema);
    if (onSave) {
      onSave(schema);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="w-full h-full">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Drag and drop components to build your form
          </p>
        </div>
        
        <div className="p-4">
          <FormBuilder
            form={formSchema}
            onChange={handleSave}
            onCancel={handleCancel}
            options={{
              builder: {
                basic: {
                  components: {
                    textfield: true,
                    textarea: true,
                    email: true,
                    phoneNumber: true,
                    number: true,
                    password: true,
                    checkbox: true,
                    selectboxes: true,
                    select: true,
                    radio: true,
                    button: true,
                    content: true,
                    htmlelement: true
                  }
                },
                advanced: {
                  components: {
                    signature: true,
                    file: true,
                    address: true,
                    datetime: true,
                    day: true,
                    time: true,
                    currency: true,
                    fieldset: true,
                    panel: true,
                    table: true,
                    container: true,
                    datagrid: true,
                    editgrid: true,
                    columns: true,
                    tabs: true,
                    well: true
                  }
                },
                premium: {
                  components: {
                    gdpr: true,
                    location: true,
                    survey: true,
                    nps: true,
                    rating: true,
                    url: true,
                    phoneNumber: true,
                    recaptcha: true,
                    tags: true,
                    tree: true
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DynamicFormBuilder; 