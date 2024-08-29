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
    this.searchVal = '';
  }

  onTable({table, options}) {
    if (!options.canSearch) {
      table.setOptions((prev) => ({
        ...prev,
        state: {
          ...prev.state,
          globalFilter: this.serachVal,
        }
      }));

      table.__gridSeachText = this.searchVal = '';
      table.__gridChangeSearchText = null;

      return;
    }

    const instance = this;
    table.__gridSeachText = this.searchVal;
    table.setOptions((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        globalFilter: table.__gridSeachText,
      }
    }));
    table.__gridChangeSearchText = (text) => {
      table.__gridSeachText = instance.searchVal = text;
    };
  }
}
