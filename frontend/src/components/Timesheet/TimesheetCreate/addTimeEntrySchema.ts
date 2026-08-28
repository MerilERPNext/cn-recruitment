export const addTimeEntrySchema = {
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
    },
    {
      type: "columns",
      key: "taskColumns",
      input: false,
      columns: [
        {
          components: [
            {
              type: "select",
              key: "custom_parent_task",
              label: "Task <span class='text-red-500'>*</span>",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/resource/Task?fields=[\"name\",\"subject\",\"project\"]&filters=[[\"project\",\"=\",\"{{ data.project }}\"],[\"is_group\",\"=\",1]]",
              },
              selectValues: "data",
              valueProperty: "name",
              template: "<span>{{ item.subject || item.name }}</span>",
              searchEnabled: true,
              refreshOn: "project",
              clearOnRefresh: true,
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
              label: "Sub Task <span class='text-red-500'>*</span>",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/resource/Task?fields=[\"name\",\"subject\",\"project\"]&filters=[[\"parent_task\",\"=\",\"{{ data.custom_parent_task }}\"],[\"project\",\"=\",\"{{ data.project }}\"],[\"is_group\",\"=\",0]]",
              },
              selectValues: "data",
              valueProperty: "name",
              template: "<span>{{ item.subject || item.name }}</span>",
              searchEnabled: true,
              refreshOn: "custom_parent_task",
              clearOnRefresh: true,
              lazyLoad: false,
              ignoreCache: false,
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
