declare module '@tsed/react-formio' {
  import { ComponentType } from 'react';
  
  export interface FormProps {
    form: any;
    [key: string]: any;
  }
  
  export const Form: ComponentType<FormProps>;
} 