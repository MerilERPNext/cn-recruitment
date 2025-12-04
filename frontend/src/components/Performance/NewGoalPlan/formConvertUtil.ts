// formConvertUtil.ts
// usage: applyFieldConfigs(schemaClone, goalAttributesArray, subGoalAttributesArray)

export interface AttributeConfig {
  fieldname: string;
  attribute_name?: string;
  is_enable?: boolean;
  is_mandatory?: boolean;
  is_editable?: boolean;
  needs_approval?: boolean;
}

export interface FormioComponent {
  key?: string;
  type?: string;
  hidden?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  validate?: {
    required?: boolean;
    [key: string]: any;
  };
  components?: FormioComponent[];
  columns?: { components?: FormioComponent[] }[];
  rows?: { components?: FormioComponent[] }[][];
  [key: string]: any; // allow extra Form.io properties
}

export interface FormioSchema {
  components?: FormioComponent[];
  [key: string]: any;
}

// -------------------------------------------------------
// helpers
// -------------------------------------------------------

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

function capitalize(s: string): string {
  return s && s[0].toUpperCase() + s.slice(1);
}

// -------------------------------------------------------
// build candidate schema keys for an API fieldname
// -------------------------------------------------------

function candidatesForAttr(fieldname: string): string[] {
  if (!fieldname) return [];

  const snake = fieldname.toLowerCase();
  const camel = snakeToCamel(snake);
  const pascal = capitalize(camel);

  const candidates = new Set<string>([
    snake,
    camel,
    pascal,
    `sub${pascal}`,
    `sub${camel}`,
    `sub_${snake}`,
    snake.replace(/description$/, "desc"),
    snake.replace(/desc$/, "description"),
    snake.replace(/title$/, "name"),
    camel.replace(/Pillar$/, "Pillar"),
  ]);

  // extra normalizations
  if (snake.endsWith("_title") || snake === "title") {
    candidates.add("title");
    candidates.add("subGoalTitle");
    candidates.add("subGoalName");
    candidates.add("name");
    candidates.add("subName");
  }
  if (snake === "description") {
    candidates.add("desc");
    candidates.add("description");
    candidates.add("subGoalDesc");
  }
  if (snake === "start_date") {
    candidates.add("startDate");
    candidates.add("subStartDate");
  }
  if (snake === "end_date") {
    candidates.add("endDate");
    candidates.add("subEndDate");
  }
  if (snake === "scorecard_pillar") {
    candidates.add("scorecardPillar");
    candidates.add("scorecard_pillar");
  }
  if (snake === "target_type") {
    candidates.add("target_type");
    candidates.add("targetType");
  }
  if (snake === "target") {
    candidates.add("target");
    candidates.add("subTarget");
  }
  if (snake === "metric") {
    candidates.add("metric");
    candidates.add("metric_options");
  }

  return [...candidates];
}

// -------------------------------------------------------
// Map attributes to possible component keys
// -------------------------------------------------------

function buildAttrMap(attrs: AttributeConfig[] = []): Map<string, AttributeConfig> {
  const map = new Map<string, AttributeConfig>();
  if (!Array.isArray(attrs)) return map;

  for (const a of attrs) {
    if (!a?.fieldname) continue;

    const fn = a.fieldname;
    const candidates = candidatesForAttr(fn);

    candidates.push(fn);

    for (const k of candidates) {
      map.set(k, a);
    }

    map.set(fn, a);
    map.set(snakeToCamel(fn), a);
  }

  return map;
}

// -------------------------------------------------------
// Main Transformer
// -------------------------------------------------------

export function applyFieldConfigs(
  schema: FormioSchema,
  goalAttrs: AttributeConfig[] = [],
  subAttrs: AttributeConfig[] = []
): FormioSchema {
  if (!schema) return schema;

  const goalMap = buildAttrMap(goalAttrs);
  const subMap = buildAttrMap(subAttrs);

  if (goalMap.size === 0 && subMap.size === 0) return schema;

  // find attribute config for component key
  function findAttrForKey(key: string, inSub: boolean): AttributeConfig | undefined {
    if (!key) return undefined;

    if (inSub && subMap.has(key)) return subMap.get(key);
    if (!inSub && goalMap.has(key)) return goalMap.get(key);

    const altKeys = [
      key,
      camelToSnake(key),
      snakeToCamel(key),
      key.replace(/^sub/i, ""),
      key.replace(/^subGoal/i, ""),
      key.replace(/^sub_/i, ""),
    ];

    for (const k of altKeys) {
      if (inSub && subMap.has(k)) return subMap.get(k);
      if (!inSub && goalMap.has(k)) return goalMap.get(k);

      if (inSub && goalMap.has(k)) return goalMap.get(k);
      if (!inSub && subMap.has(k)) return subMap.get(k);
    }

    return undefined;
  }

  // apply rules from attribute config
  function applyAttrToComponent(comp: FormioComponent, attr: AttributeConfig) {
    if (typeof attr.is_enable === "boolean") {
      comp.hidden = !attr.is_enable;
    }
    if (typeof attr.is_mandatory === "boolean") {
      comp.validate = comp.validate || {};
      comp.validate.required = attr.is_mandatory;
    }
    if (typeof attr.is_editable === "boolean") {
      if (!attr.is_editable) {
        comp.disabled = true;
        comp.readOnly = true;
      } else {
        comp.disabled = false;
        comp.readOnly = false;
      }
    }
  }

  // recursive component walker
  function walk(node: any, inSub = false): void {
    if (!node) return;

    if (node.type === "editgrid" && (node.key === "subGoals" || /subgoals/i.test(node.key))) {
      inSub = true;
    }

    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, inSub));
      return;
    }

    if (node.key) {
      const attr = findAttrForKey(node.key, inSub);
      if (attr) applyAttrToComponent(node, attr);
    }

    if (node.components) {
      node.components.forEach((c: FormioComponent) => walk(c, inSub));
    }

    if (node.columns) {
      node.columns.forEach((col: any) => col.components && walk(col.components, inSub));
    }

    if (node.rows) {
      node.rows.forEach((row: any[]) =>
        row.forEach((cell) => cell.components && walk(cell.components, inSub))
      );
    }

    if (node.type === "editgrid" && Array.isArray(node.components)) {
      node.components.forEach((c: FormioComponent) => walk(c, true));
    }
  }

  walk(schema.components || schema);

  return schema;
}
