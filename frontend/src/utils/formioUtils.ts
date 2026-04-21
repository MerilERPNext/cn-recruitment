import { FormIOComponent } from "../types/formio";

/** Recursively collect keys of all required fields in a formio schema */
export const getRequiredKeys = (components: FormIOComponent[]): string[] => {
    const keys: string[] = [];
    const traverse = (comps?: FormIOComponent[]) => {
        if (!comps || !Array.isArray(comps)) return;
        for (const comp of comps) {
            if (comp.validate && (comp.validate as Record<string, unknown>).required && comp.key) {
                keys.push(comp.key);
            }
            if (comp.components) {
                traverse(comp.components);
            }
            if (comp.columns && Array.isArray(comp.columns)) {
                comp.columns.forEach((col: FormIOComponent) => traverse(col.components));
            }
            if (comp.rows && Array.isArray(comp.rows)) {
                comp.rows.forEach((row: FormIOComponent[]) => {
                    if (Array.isArray(row)) {
                        row.forEach((cell: FormIOComponent) => traverse(cell.components));
                    }
                });
            }
        }
    };
    traverse(components);
    return keys;
};