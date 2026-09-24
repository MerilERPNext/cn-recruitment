import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchableSelect from "../shared/SearchableSelect";
import { pdfFormsService, pdfTranslate as __ } from "../../services/pdfFormsService";

export default function PDFLinkField({ doctype, value, onChange, id, disabled = false }: { doctype: string; value: string; onChange: (value: string) => void; id?: string; disabled?: boolean }) {
  const options = useQuery({ queryKey: ["pdf-link-options", doctype], queryFn: () => pdfFormsService.linkOptions(doctype), staleTime: 300000 });
  const search = useCallback((text: string) => pdfFormsService.linkOptions(doctype, text), [doctype]);
  return <div><SearchableSelect id={id} portal={false} options={options.data || []} value={value} onChange={onChange} onSearch={search} placeholder={`${__("Search")} ${doctype}…`} disabled={disabled} />
    {value && !disabled && <button type="button" className="mt-1 text-xs text-gray-500 underline" onClick={() => onChange("")}>{__("Clear selection")}</button>}
    {options.isError && <p role="alert" className="mt-1 text-xs text-error">{__("Unable to load options. Try searching again.")}</p>}
  </div>;
}
