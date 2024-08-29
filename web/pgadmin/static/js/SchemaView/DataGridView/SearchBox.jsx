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

import { SchemaStateContext } from '../SchemaState';

import { DataGridContext } from './context';


export function SearchBox() {
  const schemaState = useContext(SchemaStateContext);
  const {
    accessPath, field, options: { canSearch }
  } = useContext(DataGridContext);

  if (!canSearch) return <></>;

  const searchText = schemaState.state(accessPath.concat('__searchText'));
  const searchTextChange = (value) => {
    schemaState.setState(accessPath.concat('__searchText'), value);
  };

  const searchOptions = field.searchOptions || {
    size: SEARCH_INPUT_SIZE.HALF,
    alignment: SEARCH_INPUT_ALIGNMENT.RIGHT,
  };

  return (
    <SearchInputText
      {...searchOptions}
      searchText={searchText || ''} onChange={searchTextChange}
    />
  );
}
