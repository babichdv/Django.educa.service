export const TABLES_CONFIG = {
  ItemGroups: {
    title: 'Группы товаров',
    apiEndpoint: 'item-groups',
    fields: {
      name: {
        label: 'Название',
        type: 'text',
        required: true
      },
      orderValue: {
        label: 'Порядок',
        type: 'number',
        required: true
      }
    },
    columns: ['name', 'orderValue']
  },
  ItemUnit: {
    title: 'Единицы товаров',
    apiEndpoint: 'item-units',
    fields: {
      name: {
        label: 'Название',
        type: 'text',
        required: true
      },
      price: {
        label: 'Цена',
        type: 'number',
        required: true
      },
      measureUnit: {
        label: 'Ед. измерения',
        type: 'select',
        relation: 'measure-units',
        required: true
      },
      dependence: {
        label: 'Группа товаров',
        type: 'select',
        relation: 'itemgroups',
        required: true
      },
      orderValue: {
        label: 'Порядок',
        type: 'number',
        required: true
      }
    },
    columns: ['name', 'price', 'measureUnit', 'dependence', 'orderValue']
  }
};