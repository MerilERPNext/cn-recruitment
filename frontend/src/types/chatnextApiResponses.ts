/* ----------------------------------
 * Common / Utility Types
 * ---------------------------------- */

export interface AuditInfo {
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
}

export interface Position {
    x: number;
    y: number;
}

/* ----------------------------------
 * Trigger Category
 * ---------------------------------- */

export interface FunnelTriggerCategory extends AuditInfo {
    name: string;
    catagory: string;
    info: string | null;
    doctype: "Funnel Trigger Category";
}

/* ----------------------------------
 * Trigger Metadata
 * ---------------------------------- */

export interface TriggerMetadata {
    selectData?: {
        page_type?: {
            label: string;
        };
    };
}

/* ----------------------------------
 * Data Object (parsed version of `data`)
 * ---------------------------------- */

export interface TriggerDataObject {
    name_of_action: string;
    page_type: "doctype" | string;
    node_label: string;
    submit: boolean;
    doctype: string;
    show_as_button: boolean;
    visiblity_condition: boolean;
    button_label: string;

    // Optional / conditional fields
    variable_path_for_output?: string;
    doc_field?: string;
    field_values?: string;
    trigger_category?: string;
    execute_current_node_as_trigger_user?: boolean;
    execute_current_node_as_user?: string;
    metadata?: TriggerMetadata;
}

/* ----------------------------------
 * Main Trigger Type
 * ---------------------------------- */

export interface ChatNextAssistantTrigger extends AuditInfo {
    name: string;
    type: "chatnext_assistant_trigger";
    element_type: "Trigger";

    id: string;
    parent: string;
    parentfield: string;
    parenttype: "Funnel Published";
    funnel_name: string;

    name_of_action: string;
    button_label: string;

    data: string; // raw JSON string from backend
    data_obj: TriggerDataObject;

    position: Position;

    // Flow graph fields
    targethandle: string | null;
    target: string | null;
    sourcehandle: string | null;
    source: string | null;

    // Optional trigger category info
    trigger_category_name?: string;
    trigger_category?: FunnelTriggerCategory;
}

/* ----------------------------------
 * API Response Type
 * ---------------------------------- */

export type AssistantTriggerResponse = ChatNextAssistantTrigger[];
