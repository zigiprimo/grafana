import { css, cx } from '@emotion/css';
import { useCombobox, useMultipleSelection } from 'downshift';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { DataSourceInstanceSettings, GrafanaTheme2, SelectableValue } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { Button, Field, Icon, Input, Label, RadioButtonGroup, Stack, Tooltip, useStyles2 } from '@grafana/ui';
import { DashboardPicker } from 'app/core/components/Select/DashboardPicker';
import { useQueryParams } from 'app/core/hooks/useQueryParams';
import { PromAlertingRuleState, PromRuleType } from 'app/types/unified-alerting-dto';

import { logInfo, LogMessages } from '../../Analytics';
import { useRulesFilter } from '../../hooks/useFilteredRules';
import { RuleHealth } from '../../search/rulesSearchParser';
import { alertStateToReadable } from '../../utils/rules';
import { HoverCard } from '../HoverCard';

import { MultipleDataSourcePicker } from './MultipleDataSourcePicker';

const ViewOptions: SelectableValue[] = [
  {
    icon: 'folder',
    label: 'Grouped',
    value: 'grouped',
  },
  {
    icon: 'list-ul',
    label: 'List',
    value: 'list',
  },
  {
    icon: 'heart-rate',
    label: 'State',
    value: 'state',
  },
];

const RuleTypeOptions: SelectableValue[] = [
  {
    label: 'Alert ',
    value: PromRuleType.Alerting,
  },
  {
    label: 'Recording ',
    value: PromRuleType.Recording,
  },
];

const RuleHealthOptions: SelectableValue[] = [
  { label: 'Ok', value: RuleHealth.Ok },
  { label: 'No Data', value: RuleHealth.NoData },
  { label: 'Error', value: RuleHealth.Error },
];

interface RulesFilerProps {
  onFilterCleared?: () => void;
}

const RuleStateOptions = Object.entries(PromAlertingRuleState).map(([key, value]) => ({
  label: alertStateToReadable(value),
  value,
}));

const RulesFilter = ({ onFilterCleared = () => undefined }: RulesFilerProps) => {
  const styles = useStyles2(getStyles);
  const [queryParams, setQueryParams] = useQueryParams();
  const { filterState, hasActiveFilters, searchQuery, setSearchQuery, updateFilters } = useRulesFilter();

  // This key is used to force a rerender on the inputs when the filters are cleared
  const [filterKey, setFilterKey] = useState<number>(Math.floor(Math.random() * 100));
  const dataSourceKey = `dataSource-${filterKey}`;
  const queryStringKey = `queryString-${filterKey}`;

  const searchQueryRef = useRef<HTMLInputElement | null>(null);
  const { handleSubmit, register, setValue } = useForm<{ searchQuery: string }>({ defaultValues: { searchQuery } });
  const { ref, ...rest } = register('searchQuery');

  useEffect(() => {
    setValue('searchQuery', searchQuery);
  }, [searchQuery, setValue]);

  const handleDataSourceChange = (dataSourceValue: DataSourceInstanceSettings, action: 'add' | 'remove') => {
    const dataSourceNames =
      action === 'add'
        ? [...filterState.dataSourceNames].concat([dataSourceValue.name])
        : filterState.dataSourceNames.filter((name) => name !== dataSourceValue.name);

    updateFilters({
      ...filterState,
      dataSourceNames,
    });

    setFilterKey((key) => key + 1);
  };

  const handleDashboardChange = (dashboardUid: string | undefined) => {
    updateFilters({ ...filterState, dashboardUid });
  };

  const clearDataSource = () => {
    updateFilters({ ...filterState, dataSourceNames: [] });
    setFilterKey((key) => key + 1);
  };

  const handleAlertStateChange = (value: PromAlertingRuleState) => {
    logInfo(LogMessages.clickingAlertStateFilters);
    updateFilters({ ...filterState, ruleState: value });
  };

  const handleViewChange = (view: string) => {
    setQueryParams({ view });
  };

  const handleRuleTypeChange = (ruleType: PromRuleType) => {
    updateFilters({ ...filterState, ruleType });
  };

  const handleRuleHealthChange = (ruleHealth: RuleHealth) => {
    updateFilters({ ...filterState, ruleHealth });
  };

  const handleClearFiltersClick = () => {
    setSearchQuery(undefined);
    onFilterCleared();

    setTimeout(() => setFilterKey(filterKey + 1), 100);
  };

  const searchIcon = <Icon name={'search'} />;
  return (
    <div className={styles.container}>
      <Stack direction="column" gap={1}>
        <Stack direction="row" gap={1} wrap="wrap">
          <Field
            className={styles.dsPickerContainer}
            label={
              <Label htmlFor="data-source-picker">
                <Stack gap={0.5}>
                  <span>Search by data sources</span>
                  <Tooltip
                    content={
                      <div>
                        <p>
                          Data sources containing configured alert rules are Mimir or Loki data sources where alert
                          rules are stored and evaluated in the data source itself.
                        </p>
                        <p>
                          In these data sources, you can select Manage alerts via Alerting UI to be able to manage these
                          alert rules in the Grafana UI as well as in the data source where they were configured.
                        </p>
                      </div>
                    }
                  >
                    <Icon id="data-source-picker-inline-help" name="info-circle" size="sm" />
                  </Tooltip>
                </Stack>
              </Label>
            }
          >
            <MultipleDataSourcePicker
              key={dataSourceKey}
              alerting
              noDefault
              placeholder="All data sources"
              current={filterState.dataSourceNames}
              onChange={handleDataSourceChange}
              onClear={clearDataSource}
            />
          </Field>

          <Field
            className={styles.dashboardPickerContainer}
            label={<Label htmlFor="filters-dashboard-picker">Dashboard</Label>}
          >
            {/* The key prop is to clear the picker value */}
            {/* DashboardPicker doesn't do that itself when value is undefined */}
            <DashboardPicker
              inputId="filters-dashboard-picker"
              key={filterState.dashboardUid ? 'dashboard-not-defined' : 'dashboard-defined'}
              value={filterState.dashboardUid}
              onChange={(value) => handleDashboardChange(value?.uid)}
              isClearable
              cacheOptions
            />
          </Field>

          <div>
            <Label>State</Label>
            <RadioButtonGroup
              options={RuleStateOptions}
              value={filterState.ruleState}
              onChange={handleAlertStateChange}
            />
          </div>
          <div>
            <Label>Rule type</Label>
            <RadioButtonGroup options={RuleTypeOptions} value={filterState.ruleType} onChange={handleRuleTypeChange} />
          </div>
          <div>
            <Label>Health</Label>
            <RadioButtonGroup
              options={RuleHealthOptions}
              value={filterState.ruleHealth}
              onChange={handleRuleHealthChange}
            />
          </div>
        </Stack>
        <Stack direction="column" gap={1}>
          <Stack direction="row" gap={1}>
            <form
              className={styles.searchInput}
              onSubmit={handleSubmit((data) => {
                setSearchQuery(data.searchQuery);
                searchQueryRef.current?.blur();
              })}
            >
              <Field
                label={
                  <Label htmlFor="rulesSearchInput">
                    <Stack gap={0.5}>
                      <span>Search</span>
                      <HoverCard content={<SearchQueryHelp />}>
                        <Icon name="info-circle" size="sm" tabIndex={0} />
                      </HoverCard>
                    </Stack>
                  </Label>
                }
              >
                <Input
                  id="rulesSearchInput"
                  key={queryStringKey}
                  prefix={searchIcon}
                  ref={(e) => {
                    ref(e);
                    searchQueryRef.current = e;
                  }}
                  {...rest}
                  placeholder="Search"
                  data-testid="search-query-input"
                />
              </Field>
              <input type="submit" hidden />
            </form>
            <div>
              <Label>View as</Label>
              <RadioButtonGroup
                options={ViewOptions}
                value={String(queryParams['view'] ?? ViewOptions[0].value)}
                onChange={handleViewChange}
              />
            </div>
          </Stack>
          {hasActiveFilters && (
            <div>
              <Button fullWidth={false} icon="times" variant="secondary" onClick={handleClearFiltersClick}>
                Clear filters
              </Button>
            </div>
          )}
        </Stack>
      </Stack>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      marginBottom: theme.spacing(1),
    }),
    dsPickerContainer: css({
      width: theme.spacing(60),
      flexGrow: 0,
      margin: 0,
    }),
    dashboardPickerContainer: css({
      minWidth: theme.spacing(50),
    }),
    searchInput: css({
      flex: 1,
      margin: 0,
    }),
  };
};

function SearchQueryHelp() {
  const styles = useStyles2(helpStyles);

  return (
    <div>
      <div>Search syntax allows to query alert rules by the parameters defined below.</div>
      <hr />
      <div className={styles.grid}>
        <div>Filter type</div>
        <div>Expression</div>
        <HelpRow title="Datasources" expr="datasource:mimir datasource:prometheus" />
        <HelpRow title="Folder/Namespace" expr="namespace:global" />
        <HelpRow title="Group" expr="group:cpu-usage" />
        <HelpRow title="Rule" expr='rule:"cpu 80%"' />
        <HelpRow title="Labels" expr="label:team=A label:cluster=a1" />
        <HelpRow title="State" expr="state:firing|normal|pending" />
        <HelpRow title="Type" expr="type:alerting|recording" />
        <HelpRow title="Health" expr="health:ok|nodata|error" />
        <HelpRow title="Dashboard UID" expr="dashboard:eadde4c7-54e6-4964-85c0-484ab852fd04" />
      </div>
    </div>
  );
}

function HelpRow({ title, expr }: { title: string; expr: string }) {
  const styles = useStyles2(helpStyles);

  return (
    <>
      <div>{title}</div>
      <code className={styles.code}>{expr}</code>
    </>
  );
}

const helpStyles = (theme: GrafanaTheme2) => ({
  grid: css({
    display: 'grid',
    gridTemplateColumns: 'max-content auto',
    gap: theme.spacing(1),
    alignItems: 'center',
  }),
  code: css({
    display: 'block',
    textAlign: 'center',
  }),
});

export default RulesFilter;

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
