/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../utils/frappeAPI";

export const getDifinitionNameForSeparation = async (): Promise<string> => {
  const response = (await FrappeAPI.callMethod(
    "nextai.funnel.doctype.funnel_task.assistant_api.get_chatnext_assistant_private_doc_trigger_list",
    { doctype: "Employee" }
  )) ;
  return response as string;
};


export const getChatAssistantData = async (
doctype_name: string,
document_name: string, 
definition_name: string, 
l: string,
) => {
  const response = FrappeAPI.callMethod('nextai.funnel.doctype.funnel_task.triggers.chatnext_assistant_trigger.trigger' ,
   {
    definition_name: definition_name,
    variables:{
        doctype: doctype_name,
        docname: document_name,
        l:l,
    }
    },
  );

  return response as any;
};
