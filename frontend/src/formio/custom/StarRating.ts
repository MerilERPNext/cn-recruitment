// @ts-ignore
import FieldComponent from "formiojs/components/_classes/field/Field";

export default class StarRating extends (FieldComponent as any) {
  static schema(...extend: any[]) {
    return FieldComponent.schema(
      {
        type: "starrating",
        label: "Rating",
        key: "rating",
        input: true,
        numStars: 5,
        shape: "star", // "star" | "circle" | "dropdown"
        defaultValue: 0,
        disabled: false,

        /** NEW: items now supports description */
        items: undefined, // [{ label, value, description }]
      },
      ...extend
    );
  }

  static get builderInfo() {
    return {
      title: "Rating",
      icon: "star",
      group: "basic",
      weight: 40,
      schema: StarRating.schema(),
    };
  }

  get defaultSchema() {
    return StarRating.schema();
  }

  /** handle form readOnly */
  isInputDisabled() {
    return (
      this.component.disabled === true ||
      this.options?.readOnly === true ||
      this.root?.options?.readOnly === true
    );
  }

  /**
   * Convert items to [{ label, value, description }]
   */
  getItems(): Array<{ label: string; value: any; description?: string }> {
    const compItems = Array.isArray(this.component.items)
      ? this.component.items.map((it: any) => {
        if (typeof it === "string" || typeof it === "number") {
          return { label: String(it), value: it, description: "" };
        }
        return {
          label: it?.label ?? String(it?.value ?? ""),
          value: it?.value ?? it?.label ?? "",
          description: it?.description ?? "",
        };
      })
      : null;

    if (compItems && compItems.length > 0) {
      return compItems;
    }

    // fallback based on numStars
    const numStars = this.component.numStars || 5;
    return Array.from({ length: numStars }).map((_, i) => {
      const v = i + 1;
      return {
        label: String(v),
        value: v,
        description: "", // default empty
      };
    });
  }

  getActiveIndex(items: Array<{ value: any }>) {
    const val = this.dataValue;
    return items.findIndex((it) => it.value == val);
  }

  render() {
    const items = this.getItems();
    const activeIndex = this.getActiveIndex(items);
    const activeItem = items[activeIndex] ?? null;
    const shape = this.component.shape || "star";
    const disabled = this.isInputDisabled();

    let html = "";

    if (shape === "dropdown") {
      html = `
        <select class="rating-select" ${disabled ? "disabled" : ""} 
          style="padding:8px;border-radius:6px;border:1px solid #d1d5db;min-width:120px;">
          ${items
          .map(
            (it, i) =>
              `<option value="${String(it.value)}" ${i === activeIndex ? "selected" : ""}>${this.t(
                it.label
              )}</option>`
          )
          .join("")}
        </select>
      `;
    } else if (shape === "star") {
      html = items
        .map((it, i) => {
          const filled = i <= activeIndex && activeIndex >= 0;
          return `
            <span 
              class="rating-item"
              data-value="${String(it.value)}"
              data-label="${this.t(it.label)}"
              title="${this.t(it.label)}"
              style="
                cursor:${disabled ? "not-allowed" : "pointer"};
                font-size:28px;
                display:inline-flex;
                flex-direction:column;
                align-items:center;
                margin-right:6px;
                color:${filled ? "#facc15" : "#d1d5db"};
              "
            >
              <span style="line-height:1;">★</span>
              <span style="font-size:11px;margin-top:4px;color:${filled ? "#92400e" : "#6b7280"
            };">${this.t(it.label)}</span>
            </span>
          `;
        })
        .join("");
    } else {
      // circle shape
      html = items
        .map((it, i) => {
          const selected = i <= activeIndex && activeIndex >= 0;
          return `
            <span 
              class="rating-item"
              data-value="${String(it.value)}"
              data-label="${this.t(it.label)}"
              style="
                cursor:${disabled ? "not-allowed" : "pointer"};
                width:40px;height:40px;
                display:inline-flex;align-items:center;justify-content:center;
                border-radius:50%;
                margin-right:8px;
                border:2px solid ${selected ? "#3b82f6" : "#d1d5db"};
                background:${selected ? "#3b82f622" : "white"};
                color:${selected ? "#1e40af" : "#6b7280"};
              "
            >${this.t(it.label)}</span>`;
        })
        .join("");
    }

    /** NEW: add description area */
    const descriptionHtml = activeItem?.description
      ? `<div class="rating-description" style="margin-top:8px;font-size:13px;color:#4b5563;">
           ${this.t(activeItem.description)}
         </div>`
      : `<div class="rating-description" style="margin-top:8px;font-size:13px;color:#9ca3af;"></div>`;

    return super.render(`
      <div class="rating-container">
        ${html}
        ${descriptionHtml}
      </div>
    `);
  }

  attach(element: HTMLElement) {
    super.attach(element);

    const disabled = this.isInputDisabled();
    const items = element.querySelectorAll(".rating-item");
    const select = element.querySelector(".rating-select") as HTMLSelectElement | null;
    const descBox = element.querySelector(".rating-description") as HTMLElement;

    const updateDescription = () => {
      const itemsArr = this.getItems();
      const idx = this.getActiveIndex(itemsArr);
      const item = itemsArr[idx];
      descBox.innerHTML = item?.description ? this.t(item.description) : "";
    };

    if (!disabled) {
      if (select) {
        select.addEventListener("change", (evt: any) => {
          const val = evt.target.value;
          const matched = this.getItems().find((it) => String(it.value) === val);
          this.setValue(matched ? matched.value : val);
          updateDescription();
          this.redraw();
        });
      } else {
        items.forEach((item: Element) => {
          if (!(item as any).__rating_listener_added) {
            item.addEventListener("click", () => {
              const val = (item as HTMLElement).dataset.value;
              const matched = this.getItems().find((it) => String(it.value) === String(val));
              this.setValue(matched ? matched.value : val);
              updateDescription();
              this.redraw();
            });
            (item as any).__rating_listener_added = true;
          }
        });
      }
    }

    return element;
  }
}
