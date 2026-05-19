
// use this when storing formSchema in states
export interface FormIOComponent {
    key: string;
    type: string;
    label?: string;
    input?: boolean;
    components?: FormIOComponent[];
    [key: string]: unknown; // allows Form.io custom props
}

// Full form schema
export interface FormIOSchema {
    display: "form" | "wizard" | "pdf";
    components: FormIOComponent[];
}

export interface FormIoChangeObj {
    changes: {
        components: FormIOComponent,
        value: unknown,
    };
    data: Record<string, unknown>;
    isValid: boolean;
}