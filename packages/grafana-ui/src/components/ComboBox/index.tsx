import { css } from '@emotion/css';
import { useFloating, flip, shift, autoUpdate, useMergeRefs } from '@floating-ui/react';
import { useCombobox } from 'downshift';
import React, { useMemo } from 'react';
import { useMeasure } from 'react-use';
import { FixedSizeList, ListChildComponentProps } from 'react-window';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes';
import { IconButton } from '../IconButton/IconButton';
import { Input } from '../Input/Input';

const ROW_HEIGHT = 30;
const LIST_MAX_HEIGHT = 300;

interface ComboBoxItem {
  value: string;
  label: string;
}

interface ComboBoxProps {
  options?: ComboBoxItem[];
  value?: string;
  onChange?(value: string | undefined): void;
  labelId: string;
  inputId: string;
}

interface VirtualData {
  items: ComboBoxItem[];
  highlightedIndex: number;
  getItemProps: any; // JOSH TODO
  selectedItem: ComboBoxItem | undefined;
}

export function ComboBox({ value, onChange, options, labelId, inputId }: ComboBoxProps) {
  const [measureInputRef, { width }] = useMeasure();
  const styles = useStyles2(getStyles);

  const [inputValue, setInputValue] = React.useState('');

  const filteredOptions = useMemo(() => {
    if (!inputValue) {
      return options ?? [];
    }

    const phraseLowerCase = inputValue.toLowerCase();

    const [filtered] = measure('combobox-filter', () =>
      (options ?? []).filter((v) => v.label.toLowerCase().includes(phraseLowerCase))
    );

    return filtered;
  }, [options, inputValue]);

  const selectedItem = useMemo(() => {
    const [selected] = measure('combobox-selectedItem', () => (options ?? []).find((v) => v.value === value));
    return selected;
  }, [options, value]);

  let { isOpen, getToggleButtonProps, getMenuProps, getInputProps, highlightedIndex, getItemProps } = useCombobox({
    // isOpen: true,

    labelId,
    inputId,

    items: filteredOptions,
    itemToString(item) {
      return item ? item.label : '';
    },

    selectedItem: selectedItem || null,
    onSelectedItemChange: ({ selectedItem }) => {
      onChange && onChange(selectedItem?.value);
    },

    onInputValueChange({ inputValue }) {
      setInputValue(inputValue ?? '');
    },
  });

  const { refs: floatingRefs, floatingStyles } = useFloating({
    placement: 'bottom',
    open: isOpen,
    middleware: [flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const inputRef = useMergeRefs([floatingRefs.setReference, measureInputRef]);

  const menuProps = getMenuProps({
    ref: floatingRefs.setFloating,
  });
  // const menuRef = useMergeRefs([refs.setFloating, downshiftMenuRef]);

  // JOSH TODO: less hard coding? Can we AutoSizer this?
  const listHeight = Math.min(LIST_MAX_HEIGHT, filteredOptions.length * ROW_HEIGHT);

  const virtualData = useMemo(() => {
    return {
      highlightedIndex,
      getItemProps,
      selectedItem,
      items: filteredOptions,
    };
  }, [highlightedIndex, getItemProps, selectedItem, filteredOptions]);

  // JOSH TODO: still getting `the ref prop "ref" from getMenuProps was not applied correctly on your element.`

  return (
    <div>
      <div className={styles.inputBox}>
        <Input
          {...getInputProps({ ref: inputRef })}
          suffix={
            <IconButton
              aria-label="toggle menu"
              variant="secondary"
              {...getToggleButtonProps()}
              name={isOpen ? 'arrow-up' : 'arrow-down'}
            ></IconButton>
          }
        />
      </div>

      {isOpen && (
        // TODO: fix nesting of fixedsizelist inside ul
        <ul {...menuProps} className={styles.floatingList} style={{ ...floatingStyles, width, height: listHeight }}>
          <FixedSizeList
            className={styles.virtualList}
            height={listHeight}
            width={width}
            itemSize={ROW_HEIGHT}
            itemCount={filteredOptions.length}
            itemData={virtualData}
          >
            {Row}
          </FixedSizeList>
        </ul>
      )}
    </div>
  );
}

function Row({ index, data, style }: ListChildComponentProps<VirtualData>) {
  const { items, highlightedIndex, getItemProps, selectedItem } = data;
  const item = items[index];

  return (
    <div
      {...getItemProps({
        index,
        item,
      })}
      style={{
        ...style,
        outline: highlightedIndex === index ? '2px solid blue' : 'none',
        fontWeight: selectedItem === item ? 'bold' : 'normal',
        height: ROW_HEIGHT,
      }}
    >
      {item.label} / {item.value}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    inputBox: css({
      // display: 'inline-block',
    }),
    floatingList: css({
      margin: 0,
      padding: 0,
      background: theme.components.input.background,
      border: `1px solid ${theme.components.input.borderColor}`,
      position: 'absolute',
      top: 0,
      left: 0,
      height: 300,
      overflow: 'none',
    }),
    virtualList: css({}),
  };
}

function measure<T>(id: string, fn: () => T): [T, PerformanceMeasure] {
  const startId = `${id}-start`;
  const endId = `${id}-end`;
  const measureId = `${id}-duration`;

  performance.mark(startId);
  const result = fn();
  performance.mark(endId);
  const measurement = performance.measure(measureId, startId, endId);
  console.log(measureId, measurement.duration, 'ms');

  return [result, measurement];
}
