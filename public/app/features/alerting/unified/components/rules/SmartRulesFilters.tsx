import { css, cx } from '@emotion/css';
import { useMultipleSelection, useCombobox } from 'downshift';
import React, { useState, useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { useStyles2, Button, Stack } from '@grafana/ui';

const filterHints = ['dashboard', 'datasource', 'namespace', 'group', 'rule', 'label'];

interface FilterExpression {
  filter: string;
  value: string;
}

export function SmartRulesFilter() {
  const styles = useStyles2(getSmartStyles);

  // const [selectedFilters, setSelectedFilters] = useState<FilterExpression[]>([]);
  const [inputValue, setInputValue] = useState<string | undefined>();
  // const [selectedFilter, setSelectedFilter] = useState<string | undefined>(undefined);
  // const [items, setItems] = useState<FilterExpression[]>(filterHints.map((hint) => ({ filter: hint, value: '' })));

  const items: FilterExpression[] = useMemo(() => {
    if (!inputValue) {
      return filterHints.map((hint) => ({ filter: hint, value: '' }));
    } else if (inputValue.startsWith('datasource:')) {
      const filterValue = inputValue.replace('datasource:', '');
      const datasources = getDataSourceSrv().getList({ alerting: true });

      return datasources
        .filter((ds) => ds.name.includes(filterValue))
        .map((ds) => ({ filter: 'datasource', value: ds.name }));
    }

    return filterHints.filter((hint) => hint.startsWith(inputValue ?? '')).map((hint) => ({ filter: hint, value: '' }));
  }, [inputValue]);

  const { getDropdownProps, getSelectedItemProps, selectedItems, setSelectedItems } =
    useMultipleSelection<FilterExpression>({});

  const { getInputProps, getToggleButtonProps, getMenuProps, getItemProps, isOpen, highlightedIndex } =
    useCombobox<FilterExpression>({
      items,
      itemToString: (item) => (item ? `${item.filter}:${item.value}` : ''),
      inputValue,
      stateReducer(state, actionAndChanges) {
        const { changes, type } = actionAndChanges;

        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
            if (changes.inputValue && filterHints.map((hint) => `${hint}:`).includes(changes.inputValue)) {
              return {
                ...changes,
                isOpen: true,
              };
            }
            return changes;
          default:
            return changes;
        }
      },
      onStateChange: ({ inputValue: newInputValue, type, selectedItem: newSelectedItem }) => {
        switch (type) {
          case useCombobox.stateChangeTypes.InputKeyDownEnter:
          case useCombobox.stateChangeTypes.ItemClick:
          case useCombobox.stateChangeTypes.InputBlur:
            if (newSelectedItem) {
              if (filterHints.includes(newSelectedItem.filter) && newSelectedItem.value === '') {
                // setSelectedFilter(newSelectedItem.filter);
                setInputValue(`${newSelectedItem.filter}:`);
              } else {
                setSelectedItems([...selectedItems, newSelectedItem]);
                setInputValue('');
              }
            } else {
              // User-provided value and pressed enter
              if (inputValue && inputValue.includes(':')) {
                const [filter, value] = inputValue.split(':');
                setSelectedItems([...selectedItems, { filter, value }]);
                setInputValue('');
              }
            }
            break;

          case useCombobox.stateChangeTypes.InputChange:
            setInputValue(newInputValue);
            break;
          default:
            break;
        }
      },
    });

  return (
    <div>
      <Stack direction="row" alignItems="center">
        <Stack gap={1} flex={1} wrap="wrap">
          {selectedItems.map((selectedItem, index) => {
            const { filter, value } = selectedItem;
            return (
              <div
                key={`${filter}:${value}`}
                className={styles.selectedItem}
                {...getSelectedItemProps({ selectedItem, index })}
              >
                {filter}:{value}
              </div>
            );
          })}
          <input className={styles.input} {...getDropdownProps(getInputProps())} />
        </Stack>
        <Button
          aria-label="toggle menu"
          fill="text"
          variant="secondary"
          className={styles.arrow}
          {...getDropdownProps(getToggleButtonProps())}
        >
          &#8595;
        </Button>
      </Stack>
      <ul className={cx(styles.items, { [styles.hidden]: !isOpen })} {...getMenuProps()}>
        {isOpen &&
          items.map((item, index) => (
            <li
              key={`${item.filter}:${item.value}`}
              className={cx(styles.item, { [styles.highlightedItem]: highlightedIndex === index })}
              {...getItemProps({ item, index })}
            >
              {item.filter}:{item.value}
            </li>
          ))}
      </ul>
    </div>
  );
}

const getSmartStyles = (theme: GrafanaTheme2) => ({
  input: css({
    flex: 1,
    outline: 'none',
  }),
  arrow: css({
    fill: theme.colors.text.primary,
  }),
  items: css({
    position: 'absolute',
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    // padding: theme.spacing(1),
    listStyle: 'none',
    overflowY: 'scroll',
  }),
  item: css({
    padding: theme.spacing(1),
  }),
  selectedItem: css({
    background: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.pill,
    padding: theme.spacing(0.5, 1),
    ...theme.typography.bodySmall,
  }),
  highlightedItem: css({
    background: theme.colors.background.secondary,
  }),
  hidden: css({
    display: 'none',
  }),
});
