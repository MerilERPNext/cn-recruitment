
export interface GenericFormSchema {
    title: string;
    name: string;
    path: string;
    display: string;
    components: GenericSchemaComponent[];
}

export interface GenericSchemaComponent {
    type: string;
    key: string;
    label?: string;
    components?: GenericSchemaComponent[];
    data?: {
        values?: string[];
        url?: string;
    };
    dataSrc?: string;
    valueProperty?: string;
    selectValues?: string;
    refreshOn?: string;
    // allow other unknown properties like validate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export const transformSchemaWithRequired = (
    baseSchema: GenericFormSchema,
    requiredMap: Record<string, boolean>, // {fieldvalue: boolean} 
    keyAliasMap: Record<string, string> = {} // {schemaKey<informIO>: feildsvalue<in_doctype>}
): GenericFormSchema => {
    if (!baseSchema) return baseSchema;

    // deep clone to avoid mutating original schema
    const cloned = JSON.parse(JSON.stringify(baseSchema)) as GenericFormSchema;

    const applyToComponents = (components?: GenericSchemaComponent[]) => {
        if (!components) return;

        components.forEach((comp) => {
            const formKey = comp.key;

            /**
             * Resolve actual required key:
             * 1. Use alias map if exists
             * 2. Fallback to component key
             */
            const resolvedRequiredKey =
                (formKey && keyAliasMap[formKey]) || formKey;

            if (
                resolvedRequiredKey &&
                requiredMap[resolvedRequiredKey]
            ) {
                // ensure validate exists
                if (!comp.validate) {
                    comp.validate = {};
                }

                // mark required
                comp.validate.required = true;

                // append red asterisk to label (avoid duplication)
                if (typeof comp.label === "string") {
                    const asteriskHtml =
                        "<span style='color:red;margin-left:3px;'>*</span>";

                    if (!comp.label.includes(asteriskHtml)) {
                        comp.label = `${comp.label} ${asteriskHtml}`;
                    }
                }
            }

            // recurse for nested components
            if (Array.isArray(comp.components)) {
                applyToComponents(comp.components);
            }

            // columns layout
            if (Array.isArray(comp.columns)) {
                comp.columns.forEach((col: { components?: GenericSchemaComponent[] }) =>
                    applyToComponents(col.components)
                );
            }

            // rows layout
            if (Array.isArray(comp.rows)) {
                comp.rows.forEach((row) =>
                    row.forEach((cell: { components?: GenericSchemaComponent[] }) =>
                        applyToComponents(cell.components)
                    )
                );
            }
        });
    };

    applyToComponents(cloned.components);
    return cloned;
};
