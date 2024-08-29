/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import UserMappingSchema from '../../../pgadmin/browser/server_groups/servers/databases/foreign_data_wrappers/foreign_servers/user_mappings/static/js/user_mapping.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('UserMappingSchema', () => {

  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  beforeEach(() => {
    schemaObj = new UserMappingSchema(
      ()=>new MockSchema(),
      {
        role: ()=>[],
      },
      {
        name: 'postgres'
      }
    );
    genericBeforeEach();
  });

  it('create', async () => {
    await getCreateView(schemaObj);
  });

  it('edit', async () => {
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async () => {
    await getPropertiesView(schemaObj, getInitData);
  });
});

