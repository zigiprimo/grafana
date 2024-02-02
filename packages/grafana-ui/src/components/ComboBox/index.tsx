import { css } from '@emotion/css';
import { useFloating, flip, shift, autoUpdate } from '@floating-ui/react';
import { useCombobox } from 'downshift';
import React, { useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes';

interface ComboBoxItem {
  value: string;
  label: string;
}

interface ComboBoxProps {
  options?: ComboBoxItem[];
  value?: string;
  onChange?(value: string): void;
}

export function ComboBox({ options }: ComboBoxProps) {
  const styles = useStyles2(getStyles);
  const [inputValue, setInputValue] = React.useState('');

  const filteredOptions = useMemo(() => {
    const phraseLowerCase = inputValue.toLowerCase();

    return (options ?? []).filter((v) => v.label.toLowerCase().includes(phraseLowerCase));
  }, [options, inputValue]);

  let {
    isOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
  } = useCombobox({
    onInputValueChange({ inputValue }) {
      setInputValue(inputValue ?? '');
    },
    items: filteredOptions,
    itemToString(item) {
      return item ? item.label : '';
    },
  });

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom',
    open: isOpen,
    middleware: [flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  return (
    <div>
      <div className={styles.inputBox} ref={refs.setReference}>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label {...getLabelProps()}>Select user:</label>
        <div>
          <input placeholder="Best book ever" {...getInputProps()} />
          <button aria-label="toggle menu" type="button" {...getToggleButtonProps()}>
            {isOpen ? <>&#8593;</> : <>&#8595;</>}
          </button>
        </div>
      </div>

      <ul {...getMenuProps()} ref={refs.setFloating} style={floatingStyles} className={styles.list}>
        {isOpen &&
          filteredOptions.map((item, index) => (
            <li
              style={{
                fontWeight: selectedItem === item ? 'bold' : 'normal',
                color: highlightedIndex === index ? 'blue' : 'inherit',
              }}
              key={item.value}
              {...getItemProps({ item, index })}
            >
              <span>{item.label}</span>
              <span>{item.value}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    inputBox: css({
      display: 'inline-block',
      background: theme.colors.background.primary,
    }),
    list: css({
      background: theme.colors.background.secondary,
      width: 'max-content',
      position: 'absolute',
      top: 0,
      left: 0,
      maxHeight: 300,
      overflow: 'auto',
    }),
  };
}
