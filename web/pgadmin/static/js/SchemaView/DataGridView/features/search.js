/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {
  booleanEvaluator, registerOptionEvaluator
} from '../../options';

import Feature from './feature';


registerOptionEvaluator('canSearch', booleanEvaluator, false, ['collection']);


export default class GlobalSearch extends Feature {
  constructor() {
    super();
  }

  onTable({table, options}) {

    if (!options.canSearch) {
      const searchText = '';

      table.setOptions((prev) => ({
        ...prev,
        state: {
          ...prev.state,
          globalFilter: searchText,
        }
      }));

      return;
    }

    const searchText = this.schemaState.state(
      this.accessPath.concat('__searchText')
    );

    table.setOptions((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        globalFilter: searchText,
      }
    }));
  }
}
