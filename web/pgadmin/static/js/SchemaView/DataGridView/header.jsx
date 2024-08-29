/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useContext, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/AddOutlined';

import { SCHEMA_STATE_ACTIONS } from 'sources/SchemaView/SchemaState';
import { PgIconButton } from 'sources/components/Buttons';
import CustomPropTypes from 'sources/custom_prop_types';
import gettext from 'sources/gettext';
import { requestAnimationAndFocus } from 'sources/utils';

import { SearchBox } from './SearchBox';
import { DataGridContext } from './context';


export function DataGridHeader({tableEleRef, setRefreshKey}) {
  const {
    accessPath, field, dataDispatch, options, virtualizer, table,
  } = useContext(DataGridContext);
  const {
    addOnTop, canAdd, canAddRow, canEdit, expandEditOnAdd
  } = options;
  const rows = table.getRowModel().rows;

  const label = field.label || '';
  const newRowIndex = useRef(-1);

  const onAddClick = useCallback(() => {

    if(!canAddRow) {
      return;
    }

    const newRow = field.schema.getNewData();

    newRowIndex.current = addOnTop ? 0 : rows.length;

    dataDispatch({
      type: SCHEMA_STATE_ACTIONS.ADD_ROW,
      path: accessPath,
      value: newRow,
      addOnTop: addOnTop
    });

    if (table.__gridChangeSearchText) {
      table.__gridChangeSearchText('');
    }

    setRefreshKey(Date.now());

  }, [canAddRow, rows?.length]);

  useEffect(() => {
    if (newRowIndex.current < -1) return;

    virtualizer.scrollToIndex(newRowIndex.current);

    // Try autofocus on newly added row.
    setTimeout(() => {
      const rowInput = tableEleRef.current?.querySelector(
        `.pgrt-row[data-index="${newRowIndex.current}"] input`
      );

      if(!rowInput) return;

      requestAnimationAndFocus(tableEleRef.current.querySelector(
        `.pgrt-row[data-index="${newRowIndex.current}"] input`
      ));

      expandEditOnAdd && canEdit &&
        rows[newRowIndex.current]?.toggleExpanded(true);

      newRowIndex.current = undefined;
    }, 50);
  }, [rows?.length]);

  return (
    <Box className='DataGridView-gridHeader'>
      {label && <Box className='DataGridView-gridHeader-heading'>{label}</Box>}
      <Box className='DataGridView-gridHeader-middle'
        style={{flex: 1, padding: 0}}>
        <SearchBox setRefreshKey={setRefreshKey} />
      </Box>
      <Box className='DataGridView-grid-controls'>
        { canAdd &&
        <PgIconButton data-test="add-row" title={gettext('Add row')}
          onClick={onAddClick}
          icon={<AddIcon />} className='DataGridView-gridControlsButton'
        />
        }
      </Box>
    </Box>
  );
}

DataGridHeader.propTypes = {
  tableEleRef: CustomPropTypes.ref,
  setRefreshKey: PropTypes.func,
};
