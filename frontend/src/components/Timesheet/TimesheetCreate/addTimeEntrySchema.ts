export const addTimeEntrySchema = {
  components: [
    {
      type: "columns",
      key: "projectTaskColumns",
      input: false,
      columns: [
        {
          components: [
            {
              type: "select",
              key: "project",
              label: "Project <span class='text-red-500'>*</span>",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/resource/Project?fields=[\"name\",\"project_name\"]",
              },
              selectValues: "data",
              valueProperty: "name",
              template: "<span>{{ item.project_name || item.name }}</span>",
              searchEnabled: true,
              lazyLoad: false,
              ignoreCache: false,
            }
          ],
          width: 6,
          offset: 0,
          push: 0,
          pull: 0,
          size: "md"
        },
        {
          components: [
            {
              type: "select",
              key: "task",
              label: "Task <span class='text-red-500'>*</span>",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/resource/Task?fields=[\"name\",\"subject\",\"project\"]&filters=[[\"project\",\"=\",\"{{ data.project }}\"]]",
              },
              selectValues: "data",
              valueProperty: "name",
              template: "<span>{{ item.subject || item.name }}</span>",
              searchEnabled: true,
              refreshOn: "project",
              clearOnRefresh: true,
              lazyLoad: false,
              ignoreCache: false,
              customRefresh: "return !!data.project;",
              redrawOn: "project",
            }
          ],
          width: 6,
          offset: 0,
          push: 0,
          pull: 0,
          size: "md"
        }
      ]
    }
  ],
};
