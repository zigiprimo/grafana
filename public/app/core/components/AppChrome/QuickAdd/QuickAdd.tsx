import React, { useMemo } from 'react';

import { reportInteraction } from '@grafana/runtime';
import { Menu, Dropdown, Button } from '@grafana/ui';
import { useSelector } from 'app/types';

import { findCreateActions } from './utils';

export interface Props {}

export const QuickAdd = ({}: Props) => {
  const navBarTree = useSelector((state) => state.navBarTree);
  const createActions = useMemo(() => findCreateActions(navBarTree), [navBarTree]);

  const MenuActions = () => {
    return (
      <Menu>
        {createActions.map((createAction, index) => (
          <Menu.Item
            key={index}
            url={createAction.url}
            label={createAction.text}
            onClick={() => reportInteraction('grafana_menu_item_clicked', { url: createAction.url, from: 'quickadd' })}
          />
        ))}
      </Menu>
    );
  };

  return createActions.length > 0 ? (
    <>
      <Dropdown overlay={MenuActions} placement="bottom-end">
        <Button variant="secondary" size="sm" icon="plus">
          New
        </Button>
      </Dropdown>
    </>
  ) : null;
};
