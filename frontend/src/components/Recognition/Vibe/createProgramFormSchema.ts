/**
 * Form.io JSON schema for the "Create New Program" form used in the
 * Recognition Admin Dashboard. Submitted to
 * recognition_points.create_recognition_program.
 */
export const CREATE_PROGRAM_FORM_SCHEMA = {
  display: "form",
  components: [
    {
      type: "select",
      key: "program_type",
      label: "Program Type",
      input: true,
      placeholder: "Select program type",
      data: {
        values: [
          { label: "Appreciation", value: "Appreciation" },
          { label: "Award", value: "Award" },
        ],
      },
      defaultValue: "Appreciation",
      validate: { required: true },
    },
    {
      type: "columns",
      key: "nameCodeRow",
      columns: [
        {
          width: 6,
          components: [
            {
              type: "textfield",
              key: "program_name",
              label: "Program Name",
              input: true,
              placeholder: "e.g. Star Performer",
              validate: { required: true },
            },
          ],
        },
        {
          width: 6,
          components: [
            {
              type: "textfield",
              key: "program_code",
              label: "Program Code",
              input: true,
              placeholder: "Unique code, e.g. 2026-STAR-PW",
              validate: { required: true },
            },
          ],
        },
      ],
    },
    {
      type: "select",
      key: "award_type",
      label: "Award Type",
      input: true,
      data: {
        values: [
          { label: "Individual", value: "Individual" },
          { label: "Team", value: "Team" },
        ],
      },
      defaultValue: "Individual",
      // Only relevant for award programs.
      conditional: { show: true, when: "program_type", eq: "Award" },
    },
    {
      type: "columns",
      key: "dateRow",
      columns: [
        {
          width: 6,
          components: [
            {
              type: "datetime",
              key: "start_date",
              label: "Start Date",
              input: true,
              enableTime: false,
              format: "dd-MM-yyyy",
              validate: { required: true },
            },
          ],
        },
        {
          width: 6,
          components: [
            {
              type: "datetime",
              key: "end_date",
              label: "End Date",
              input: true,
              enableTime: false,
              format: "dd-MM-yyyy",
              validate: { required: true },
            },
          ],
        },
      ],
    },
    {
      type: "textarea",
      key: "program_description",
      label: "Description",
      input: true,
      rows: 2,
      placeholder: "Short description of the program",
    },
    {
      type: "textfield",
      key: "values",
      label: "Values (comma separated)",
      input: true,
      placeholder: "Adapt Improve Evolve, Be Honest and Transparent",
    },
    {
      type: "columns",
      key: "flagsRow",
      columns: [
        {
          width: 6,
          components: [
            {
              type: "checkbox",
              key: "is_active",
              label: "Active",
              input: true,
              defaultValue: true,
            },
          ],
        },
        {
          width: 6,
          components: [
            {
              type: "checkbox",
              key: "program_has_reward",
              label: "Has Reward (points)",
              input: true,
              defaultValue: false,
            },
          ],
        },
      ],
    },
    {
      type: "select",
      key: "reward_type",
      label: "Reward Type",
      input: true,
      data: {
        values: [
          { label: "Point Based", value: "Point Based" },
          { label: "Non Point Based", value: "Non Point Based" },
        ],
      },
      defaultValue: "Point Based",
      conditional: { show: true, when: "program_has_reward", eq: true },
    },
    {
      type: "number",
      key: "points_per_recognition",
      label: "Points per Recognition",
      input: true,
      defaultValue: 0,
      conditional: { show: true, when: "program_has_reward", eq: true },
    },
  ],
};
