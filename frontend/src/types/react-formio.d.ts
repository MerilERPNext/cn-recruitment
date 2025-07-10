declare module 'react-formio' {
  import { Component } from 'react';

  export interface FormSubmission {
    data: Record<string, unknown>;
    form: {
      name: string;
      path: string;
    };
  }

  export interface FormComponent {
    type: string;
    key: string;
    label: string;
    [key: string]: unknown;
  }

  export interface FormSchema {
    display: string;
    title?: string;
    name?: string;
    path?: string;
    components: FormComponent[];
  }

  export interface FormProps {
    form: FormSchema;
    submission?: Record<string, unknown>;
    onSubmit?: (submission: FormSubmission) => void;
    onCancel?: () => void;
    onChange?: (submission: FormSubmission) => void;
    onComponentChange?: (component: FormComponent) => void;
    options?: Record<string, unknown>;
    readOnly?: boolean;
    noAlerts?: boolean;
    language?: string;
    theme?: string;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    fileService?: Record<string, unknown>;
    fileOptions?: Record<string, unknown>;
    actions?: unknown[];
    submissionUrl?: string;
    submissionMethod?: 'POST' | 'PUT' | 'PATCH';
    submissionHeaders?: Record<string, string>;
    validationRules?: Record<string, unknown>;
    components?: Record<string, unknown>;
    permissions?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  }

  export class Form extends Component<FormProps> {}

  export interface FormBuilderProps {
    form: FormSchema;
    onChange?: (schema: FormSchema) => void;
    onCancel?: () => void;
    options?: Record<string, unknown>;
  }

  export class FormBuilder extends Component<FormBuilderProps> {}
} 