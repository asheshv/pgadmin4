/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext } from 'react';
import PropTypes from 'prop-types';

import {
  SEARCH_INPUT_ALIGNMENT, SEARCH_INPUT_SIZE, SearchInputText,
} from 'sources/components/SearchInputText';
import { DataGridContext } from './context';


export function SearchBox({setRefreshKey}) {
  const { field, options: { canSearch }, table } = useContext(DataGridContext);

  if (!canSearch) return <></>;

  const searchTextChange = (value) => {
    if (table.__gridChangeSearchText) {
      table.__gridChangeSearchText(value);
    }

    setRefreshKey(Date.now());
  };

  const searchOptions = field.searchOptions || {
    size: SEARCH_INPUT_SIZE.HALF,
    alignment: SEARCH_INPUT_ALIGNMENT.RIGHT,
  };

  return (
    <SearchInputText
      {...searchOptions}
      searchText={table.__gridSeachText}
      onChange={searchTextChange}
    />
  );
}

SearchBox.Proptypes = {
  setRefreshKey: PropTypes.func,
};
