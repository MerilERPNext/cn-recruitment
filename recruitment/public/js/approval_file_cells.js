/**
 * approval_file_cells.js
 *
 * Attachments in the field-approval panels — Pre Offer Field Approval (Job
 * Applicant) and Onboarding Field Approval (Employee Onboarding). A submitted
 * Attach field stores a file path ("/private/files/dummy.pdf"); these render it
 * as the file's name with View and Download, for top-level fields and for Attach
 * columns inside child tables (Education, Work Experience, ...) alike.
 *
 * Shared through `window` because each doctype's scripts are loaded on their own.
 */
;(function () {
    if (window.recruitment_approval_files) return;

    const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i;
    const PDF_RE   = /\.pdf(\?|#|$)/i;
    const FILE_RE  = /^(https?:\/\/|\/files\/|\/private\/files\/)/i;
    // Files on this site. Only these are previewed in place; an external URL
    // only ever opens in a new tab, never inside a desk dialog.
    const LOCAL_FILE_RE = /^(\/files\/|\/private\/files\/)/i;

    // Only a real file path or http(s) URL is a link — whatever the fieldtype.
    // The value comes from the candidate portal, so anything else (a
    // `javascript:` URL in an Attach field) stays plain escaped text.
    function isFile(fieldtype, raw) {
        if (!raw) return false;
        return FILE_RE.test(String(raw).trim());
    }

    function fileName(url) {
        try {
            const path = String(url).split(/[?#]/)[0];
            return decodeURIComponent(path.split("/").filter(Boolean).pop() || url);
        } catch (e) {
            return url;
        }
    }

    function cellHTML(raw, { compact = false } = {}) {
        const trimmed = String(raw).trim();
        if (!FILE_RE.test(trimmed)) return frappe.utils.escape_html(trimmed);
        const url  = frappe.utils.escape_html(trimmed);
        const name = frappe.utils.escape_html(fileName(trimmed));
        const size = compact ? "0.73rem" : "0.83rem";
        return `<span class="apf-file" style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:${size};">
                <span title="${url}" style="word-break:break-all;">📎 ${name}</span>
                <a class="apf-file-view" href="${url}" data-file="${url}"
                   title="${__("View")}" style="white-space:nowrap;">${__("View")}</a>
                <a href="${url}" download="${name}" target="_blank" rel="noopener noreferrer"
                   title="${__("Download")}" style="white-space:nowrap;">${__("Download")}</a>
            </span>`;
    }

    // Preview in place for PDFs and images; every other type opens in a new tab.
    function preview(url) {
        url = String(url || "").trim();
        if (!FILE_RE.test(url)) return;
        if (!LOCAL_FILE_RE.test(url)) {
            window.open(url, "_blank", "noopener,noreferrer");
            return;
        }
        const isPdf = PDF_RE.test(url);
        const isImg = IMAGE_RE.test(url);
        if (!isPdf && !isImg) {
            window.open(url, "_blank", "noopener");
            return;
        }
        const safe = frappe.utils.escape_html(url);
        const d = new frappe.ui.Dialog({
            title: fileName(url),
            size: "large",
            fields: [{ fieldtype: "HTML", fieldname: "body" }],
            primary_action_label: __("Download"),
            primary_action: () => {
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName(url);
                document.body.appendChild(a);
                a.click();
                a.remove();
            },
            secondary_action_label: __("Open in a new tab"),
            secondary_action: () => window.open(url, "_blank", "noopener"),
        });
        d.fields_dict.body.$wrapper.html(
            isPdf
                ? `<iframe src="${safe}" style="width:100%;height:70vh;border:1px solid var(--border-color);border-radius:4px;"></iframe>`
                : `<div style="text-align:center;"><img src="${safe}" style="max-width:100%;max-height:70vh;"></div>`
        );
        d.show();
    }

    // Wire the View links inside a freshly rendered panel.
    function bind($wrapper) {
        $wrapper.find(".apf-file-view").on("click", function (e) {
            // ctrl/cmd/middle-click keep the browser's own "open in a new tab".
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) return;
            e.preventDefault();
            // attr, not data(): jQuery would try to JSON-parse the value.
            preview($(this).attr("data-file"));
        });
    }

    window.recruitment_approval_files = { isFile, fileName, cellHTML, preview, bind };
})();
