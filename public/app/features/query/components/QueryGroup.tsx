import { css } from '@emotion/css';
import React, { PureComponent, useState } from 'react';
import { DropEvent, FileRejection } from 'react-dropzone';
import { connect } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Unsubscribable } from 'rxjs';

import {
  CoreApp,
  DataFrameJSON,
  dataFrameToJSON,
  DataQuery,
  DataSourceApi,
  DataSourceInstanceSettings,
  getDefaultTimeRange,
  LoadingState,
  PanelData,
  DataSourceRef,
  GrafanaTheme2,
} from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { DataSourcePicker, getDataSourceSrv, locationService } from '@grafana/runtime';
import {
  Button,
  HorizontalGroup,
  Modal,
  stylesFactory,
  VerticalGroup,
  Card,
  TagList,
  FileDropzone,
  FileDropzoneDefaultChildren,
  CustomScrollbar,
  InlineFormLabel,
  LinkButton,
  useStyles2,
  Input,
  Icon,
} from '@grafana/ui';
import { PluginHelp } from 'app/core/components/PluginHelp/PluginHelp';
import config from 'app/core/config';
import { backendSrv } from 'app/core/services/backend_srv';
import { addQuery, queryIsEmpty } from 'app/core/utils/query';
import * as DFImport from 'app/features/dataframe-import';
import { DataSourcePickerWithHistory } from 'app/features/datasource-drawer/DataSourcePickerWithHistory';
import { dataSource as expressionDatasource } from 'app/features/expressions/ExpressionDatasource';
import { DashboardQueryEditor, isSharedDashboardQuery } from 'app/plugins/datasource/dashboard';
import { GrafanaQuery, GrafanaQueryType } from 'app/plugins/datasource/grafana/types';
import { QueryGroupDataSource, QueryGroupOptions } from 'app/types';

import { discardPanelChanges } from '../../dashboard/components/PanelEditor/state/actions';
import { PanelQueryRunner } from '../state/PanelQueryRunner';
import { updateQueries } from '../state/updateQueries';

import { GroupActionComponents } from './QueryActionComponent';
import { QueryEditorRows } from './QueryEditorRows';
import { QueryGroupOptionsEditor } from './QueryGroupOptions';

export interface Props {
  queryRunner: PanelQueryRunner;
  options: QueryGroupOptions;
  onOpenQueryInspector?: () => void;
  onRunQueries: () => void;
  onOptionsChange: (options: QueryGroupOptions) => void;
}

interface State {
  dataSource?: DataSourceApi;
  dsSettings?: DataSourceInstanceSettings;
  queries: DataQuery[];
  helpContent: React.ReactNode;
  isLoadingHelp: boolean;
  isPickerOpen: boolean;
  isAddingMixed: boolean;
  data: PanelData;
  isHelpOpen: boolean;
  defaultDataSource?: DataSourceApi;
  scrollElement?: HTMLDivElement;
  savedQueryUid?: string | null;
  initialState: {
    queries: DataQuery[];
    dataSource?: QueryGroupDataSource;
    savedQueryUid?: string | null;
  };
}

export class QueryGroup extends PureComponent<Props, State> {
  backendSrv = backendSrv;
  dataSourceSrv = getDataSourceSrv();
  querySubscription: Unsubscribable | null = null;

  state: State = {
    isLoadingHelp: false,
    helpContent: null,
    isPickerOpen: false,
    isAddingMixed: false,
    isHelpOpen: false,
    queries: [],
    savedQueryUid: null,
    initialState: {
      queries: [],
      savedQueryUid: null,
    },
    data: {
      state: LoadingState.NotStarted,
      series: [],
      timeRange: getDefaultTimeRange(),
    },
  };

  async componentDidMount() {
    const { options, queryRunner } = this.props;

    this.querySubscription = queryRunner.getData({ withTransforms: false, withFieldConfig: false }).subscribe({
      next: (data: PanelData) => this.onPanelDataUpdate(data),
    });

    try {
      const ds = await this.dataSourceSrv.get(options.dataSource);
      const dsSettings = this.dataSourceSrv.getInstanceSettings(options.dataSource);

      const defaultDataSource = await this.dataSourceSrv.get();
      const datasource = ds.getRef();
      const queries = options.queries.map((q) => ({
        ...(queryIsEmpty(q) && ds?.getDefaultQuery?.(CoreApp.PanelEditor)),
        datasource,
        ...q,
      }));
      this.setState({
        queries,
        dataSource: ds,
        dsSettings,
        defaultDataSource,
        savedQueryUid: options.savedQueryUid,
        initialState: {
          queries: options.queries.map((q) => ({ ...q })),
          dataSource: { ...options.dataSource },
          savedQueryUid: options.savedQueryUid,
        },
      });
    } catch (error) {
      console.log('failed to load data source', error);
    }
  }

  componentWillUnmount() {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
      this.querySubscription = null;
    }
  }

  onPanelDataUpdate(data: PanelData) {
    this.setState({ data });
  }

  onChangeDataSource = async (newSettings: DataSourceInstanceSettings) => {
    const { dsSettings } = this.state;
    const currentDS = dsSettings ? await getDataSourceSrv().get(dsSettings.uid) : undefined;
    const nextDS = await getDataSourceSrv().get(newSettings.uid);

    // We need to pass in newSettings.uid as well here as that can be a variable expression and we want to store that in the query model not the current ds variable value
    const queries = await updateQueries(nextDS, newSettings.uid, this.state.queries, currentDS);

    const dataSource = await this.dataSourceSrv.get(newSettings.name);
    this.onChange({
      queries,
      savedQueryUid: null,
      dataSource: {
        name: newSettings.name,
        uid: newSettings.uid,
        type: newSettings.meta.id,
        default: newSettings.isDefault,
      },
    });

    this.setState({
      queries,
      savedQueryUid: null,
      dataSource: dataSource,
      dsSettings: newSettings,
    });
  };

  onAddQueryClick = () => {
    const { queries } = this.state;
    this.onQueriesChange(addQuery(queries, this.newQuery()));
    this.onScrollBottom();
  };

  newQuery(): Partial<DataQuery> {
    const { dsSettings, defaultDataSource } = this.state;

    const ds = !dsSettings?.meta.mixed ? dsSettings : defaultDataSource;

    return {
      ...this.state.dataSource?.getDefaultQuery?.(CoreApp.PanelEditor),
      datasource: { uid: ds?.uid, type: ds?.type },
    };
  }

  onChange(changedProps: Partial<QueryGroupOptions>) {
    this.props.onOptionsChange({
      ...this.props.options,
      ...changedProps,
    });
  }

  onAddExpressionClick = () => {
    this.onQueriesChange(addQuery(this.state.queries, expressionDatasource.newQuery()));
    this.onScrollBottom();
  };

  onScrollBottom = () => {
    setTimeout(() => {
      if (this.state.scrollElement) {
        this.state.scrollElement.scrollTo({ top: 10000 });
      }
    }, 20);
  };

  onUpdateAndRun = (options: QueryGroupOptions) => {
    this.props.onOptionsChange(options);
    this.props.onRunQueries();
  };

  renderTopSection(styles: QueriesTabStyles) {
    const { onOpenQueryInspector, options } = this.props;
    const { dataSource, data } = this.state;
    console.log(options.dataSource);

    return (
      <div>
        <div className={styles.dataSourceRow}>
          <InlineFormLabel htmlFor="data-source-picker" width={'auto'}>
            Data source
          </InlineFormLabel>
          <div className={styles.dataSourceRowItem}>
            <DSModal
              isOpen={!options?.dataSource || !!options.dataSource.default}
              onFileDrop={this.onFileDrop}
              onChange={this.onChangeDataSource}
              current={options.dataSource}
            />
            {config.featureToggles.drawerDataSourcePicker ? (
              <DataSourcePickerWithHistory
                onChange={this.onChangeDataSource}
                current={options.dataSource}
                metrics={true}
                mixed={true}
                dashboard={true}
                variables={true}
                enableFileUpload={config.featureToggles.editPanelCSVDragAndDrop}
                fileUploadOptions={{
                  onDrop: this.onFileDrop,
                  maxSize: DFImport.maxFileSize,
                  multiple: false,
                  accept: DFImport.acceptedFiles,
                }}
              ></DataSourcePickerWithHistory>
            ) : (
              <DataSourcePicker
                onChange={this.onChangeDataSource}
                current={options.dataSource}
                metrics={true}
                mixed={true}
                dashboard={true}
                variables={true}
              ></DataSourcePicker>
            )}
          </div>
          {dataSource && (
            <>
              <div className={styles.dataSourceRowItem}>
                <Button
                  variant="secondary"
                  icon="question-circle"
                  title="Open data source help"
                  onClick={this.onOpenHelp}
                  data-testid="query-tab-help-button"
                />
              </div>
              <div className={styles.dataSourceRowItemOptions}>
                <QueryGroupOptionsEditor
                  options={options}
                  dataSource={dataSource}
                  data={data}
                  onChange={this.onUpdateAndRun}
                />
              </div>
              {onOpenQueryInspector && (
                <div className={styles.dataSourceRowItem}>
                  <Button
                    variant="secondary"
                    onClick={onOpenQueryInspector}
                    aria-label={selectors.components.QueryTab.queryInspectorButton}
                  >
                    Query inspector
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  onOpenHelp = () => {
    this.setState({ isHelpOpen: true });
  };

  onCloseHelp = () => {
    this.setState({ isHelpOpen: false });
  };

  renderMixedPicker = () => {
    return (
      <DataSourcePicker
        mixed={false}
        onChange={this.onAddMixedQuery}
        current={null}
        autoFocus={true}
        variables={true}
        onBlur={this.onMixedPickerBlur}
        openMenuOnFocus={true}
      />
    );
  };

  onAddMixedQuery = (datasource: any) => {
    this.onAddQuery({ datasource: datasource.name });
    this.setState({ isAddingMixed: false });
  };

  onMixedPickerBlur = () => {
    this.setState({ isAddingMixed: false });
  };

  onAddQuery = (query: Partial<DataQuery>) => {
    const { dsSettings, queries } = this.state;
    this.onQueriesChange(addQuery(queries, query, { type: dsSettings?.type, uid: dsSettings?.uid }));
    this.onScrollBottom();
  };

  onFileDrop = (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => {
    DFImport.filesToDataframes(acceptedFiles).subscribe(async (next) => {
      const snapshot: DataFrameJSON[] = [];
      next.dataFrames.forEach((df) => {
        const dataframeJson = dataFrameToJSON(df);
        snapshot.push(dataframeJson);
      });
      const ds = getDataSourceSrv().getInstanceSettings('-- Grafana --');
      await this.onChangeDataSource(ds!);
      this.onQueriesChange([
        {
          refId: 'A',
          datasource: {
            type: 'grafana',
            uid: 'grafana',
          },
          queryType: GrafanaQueryType.Snapshot,
          snapshot: snapshot,
          file: next.file,
        },
      ]);
      this.props.onRunQueries();
    });
  };

  onQueriesChange = (queries: DataQuery[] | GrafanaQuery[]) => {
    this.onChange({ queries });
    this.setState({ queries });
  };

  renderQueries(dsSettings: DataSourceInstanceSettings) {
    const { onRunQueries } = this.props;
    const { data, queries } = this.state;
    if (isSharedDashboardQuery(dsSettings.name)) {
      return (
        <DashboardQueryEditor
          queries={queries}
          panelData={data}
          onChange={this.onQueriesChange}
          onRunQueries={onRunQueries}
        />
      );
    }

    return (
      <div aria-label={selectors.components.QueryTab.content}>
        <QueryEditorRows
          queries={queries}
          dsSettings={dsSettings}
          onQueriesChange={this.onQueriesChange}
          onAddQuery={this.onAddQuery}
          onRunQueries={onRunQueries}
          data={data}
        />
      </div>
    );
  }

  isExpressionsSupported(dsSettings: DataSourceInstanceSettings): boolean {
    return (dsSettings.meta.alerting || dsSettings.meta.mixed) === true;
  }

  renderExtraActions() {
    return GroupActionComponents.getAllExtraRenderAction()
      .map((action, index) =>
        action({
          onAddQuery: this.onAddQuery,
          onChangeDataSource: this.onChangeDataSource,
          key: index,
        })
      )
      .filter(Boolean);
  }

  renderAddQueryRow(dsSettings: DataSourceInstanceSettings, styles: QueriesTabStyles) {
    const { isAddingMixed } = this.state;
    const showAddButton = !(isAddingMixed || isSharedDashboardQuery(dsSettings.name));

    return (
      <HorizontalGroup spacing="md" align="flex-start">
        {showAddButton && (
          <Button
            icon="plus"
            onClick={this.onAddQueryClick}
            variant="secondary"
            aria-label={selectors.components.QueryTab.addQuery}
            data-testid="query-tab-add-query"
          >
            Query
          </Button>
        )}
        {config.expressionsEnabled && this.isExpressionsSupported(dsSettings) && (
          <Button
            icon="plus"
            onClick={this.onAddExpressionClick}
            variant="secondary"
            className={styles.expressionButton}
            data-testid="query-tab-add-expression"
          >
            <span>Expression&nbsp;</span>
          </Button>
        )}
        {this.renderExtraActions()}
      </HorizontalGroup>
    );
  }

  setScrollRef = (scrollElement: HTMLDivElement): void => {
    this.setState({ scrollElement });
  };

  render() {
    const { isHelpOpen, dsSettings } = this.state;
    const styles = getStyles();

    return (
      <CustomScrollbar autoHeightMin="100%" scrollRefCallback={this.setScrollRef}>
        <div className={styles.innerWrapper}>
          {this.renderTopSection(styles)}
          {dsSettings && (
            <>
              <div className={styles.queriesWrapper}>{this.renderQueries(dsSettings)}</div>
              {this.renderAddQueryRow(dsSettings, styles)}
              {isHelpOpen && (
                <Modal title="Data source help" isOpen={true} onDismiss={this.onCloseHelp}>
                  <PluginHelp pluginId={dsSettings.meta.id} />
                </Modal>
              )}
            </>
          )}
        </div>
      </CustomScrollbar>
    );
  }
}

const getStyles = stylesFactory(() => {
  const { theme } = config;

  return {
    innerWrapper: css`
      display: flex;
      flex-direction: column;
      padding: ${theme.spacing.md};
    `,
    dataSourceRow: css`
      display: flex;
      margin-bottom: ${theme.spacing.md};
    `,
    dataSourceRowItem: css`
      margin-right: ${theme.spacing.inlineFormMargin};
    `,
    dataSourceRowItemOptions: css`
      flex-grow: 1;
      margin-right: ${theme.spacing.inlineFormMargin};
    `,
    queriesWrapper: css`
      padding-bottom: 16px;
    `,
    expressionWrapper: css``,
    expressionButton: css`
      margin-right: ${theme.spacing.sm};
    `,
  };
});

type QueriesTabStyles = ReturnType<typeof getStyles>;

interface DataSourceModalProps {
  onFileDrop: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => void;
  onChange: (ds: DataSourceInstanceSettings) => void;
  current: DataSourceRef | string | null;
  isOpen: boolean;
  discardPanelChanges: () => void;
}

function DataSourceModal({ isOpen, onChange, onFileDrop, current, discardPanelChanges }: DataSourceModalProps) {
  const location = useLocation();
  const styles = useStyles2(getDataSourceModalStyles);
  const [search, setSearch] = useState('');

  function goBackToDashboard() {
    // TODO: Discard panel changes
    // There is a bug where the changes are never discarded
    discardPanelChanges();
    locationService.partial({
      editPanel: null,
      tab: null,
      showCategory: null,
    });
  }

  return (
    <Modal
      title="Select data source"
      closeOnEscape={true}
      closeOnBackdropClick={true}
      isOpen={isOpen}
      className={styles.modal}
      onClickBackdrop={goBackToDashboard}
      onDismiss={goBackToDashboard}
    >
      <div className={styles.modalContent}>
        <div className={styles.leftColumn}>
          <Input
            className={styles.searchInput}
            value={search}
            prefix={<Icon name="search" />}
            placeholder="Search data source"
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <CustomScrollbar className={styles.scrolledList}>
            <DSPickerList
              filter={(ds) => !ds.meta.builtIn && ds.name.includes(search)}
              onChange={onChange}
              current={current}
            />
          </CustomScrollbar>
        </div>
        <div className={styles.rightColumn}>
          <DSPickerList filter={(ds) => !!ds.meta.builtIn} onChange={onChange} current={current} />
          <FileDropzone
            readAs="readAsArrayBuffer"
            fileListRenderer={() => undefined}
            options={{
              maxSize: DFImport.maxFileSize,
              multiple: false,
              accept: DFImport.acceptedFiles,
              onDrop: (...args) => {
                // onDismiss();
                onFileDrop(...args);
              },
            }}
          >
            <FileDropzoneDefaultChildren primaryText={'Upload file'} />
          </FileDropzone>
          <div className={styles.dsCTAs}>
            <Button variant="secondary" fill="text" onClick={() => {}}>
              Can&apos;t find your data?
            </Button>
            <LinkButton variant="secondary" href={`datasources/new?back_to=${location.pathname}`}>
              Configure a new data source
            </LinkButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const mapDispatchToProps = {
  discardPanelChanges,
};

const DSModal = connect(undefined, mapDispatchToProps)(DataSourceModal);

function getDataSourceModalStyles(theme: GrafanaTheme2) {
  return {
    modal: css`
      width: 80%;
    `,
    modalContent: css`
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: stretch;
      overflow: hidden;
      height: 100%;
    `,
    leftColumn: css`
      display: flex;
      flex-direction: column;
      width: 50%;
      padding: ${theme.spacing(1)};
      height: 100%;
    `,
    rightColumn: css`
      display: flex;
      flex-direction: column;
      width: 50%;
      padding: ${theme.spacing(1)};
    `,
    dsCTAs: css`
      display: flex;
      flex-direction: row;
      width: 100%;
      justify-content: space-between;
    `,
    searchInput: css`
      width: 100%;
      margin-bottom: ${theme.spacing(1)};
    `,
    scrolledList: css`
      overflow: scroll;
    `,
  };
}

/**
 * Component props description for the {@link DSPickerList}
 *
 * @internal
 */
export interface DSPickerListProps {
  className?: string;
  onChange: (ds: DataSourceInstanceSettings) => void;
  current: DataSourceRef | string | null; // uid
  tracing?: boolean;
  mixed?: boolean;
  dashboard?: boolean;
  metrics?: boolean;
  type?: string | string[];
  annotations?: boolean;
  variables?: boolean;
  alerting?: boolean;
  pluginId?: string;
  /** If true,we show only DSs with logs; and if true, pluginId shouldnt be passed in */
  logs?: boolean;
  width?: number;
  inputId?: string;
  filter?: (dataSource: DataSourceInstanceSettings) => boolean;
  onClear?: () => void;
}

/**
 * Component state description for the {@link DSPickerList}
 *
 * @internal
 */
export interface DSPickerListState {
  error?: string;
}

/**
 * Component to be able to select a datasource from the list of installed and enabled
 * datasources in the current Grafana instance.
 *
 * @internal
 */
export class DSPickerList extends PureComponent<DSPickerListProps, DSPickerListState> {
  dataSourceSrv = getDataSourceSrv();

  static defaultProps: Partial<DSPickerListProps> = {
    filter: () => true,
  };

  state: DSPickerListState = {};

  constructor(props: DSPickerListProps) {
    super(props);
  }

  componentDidMount() {
    const { current } = this.props;
    const dsSettings = this.dataSourceSrv.getInstanceSettings(current);
    if (!dsSettings) {
      this.setState({ error: 'Could not find data source ' + current });
    }
  }

  onChange = (item: DataSourceInstanceSettings) => {
    const dsSettings = this.dataSourceSrv.getInstanceSettings(item);

    if (dsSettings) {
      this.props.onChange(dsSettings);
      this.setState({ error: undefined });
    }
  };

  getDataSourceOptions() {
    const { alerting, tracing, metrics, mixed, dashboard, variables, annotations, pluginId, type, filter, logs } =
      this.props;

    const options = this.dataSourceSrv.getList({
      alerting,
      tracing,
      metrics,
      logs,
      dashboard,
      mixed,
      variables,
      annotations,
      pluginId,
      filter,
      type,
    });

    return options;
  }

  render() {
    const { className } = this.props;
    // QUESTION: Should we use data from the Redux store as admin DS view does?
    const options = this.getDataSourceOptions();
    // const value = this.getCurrentValue();

    return (
      <div className={className}>
        <VerticalGroup spacing="xs">
          {options.map((ds) => {
            return (
              <Card
                key={ds.uid}
                onClick={() => {
                  this.onChange(ds);
                }}
                style={{ cursor: 'pointer', backgroundColor: ds.uid === this.props.current ? '#f5f5f5' : '' }}
              >
                <Card.Heading>{ds.name}</Card.Heading>
                <Card.Meta>
                  {ds.meta.name}
                  {ds.meta.info.description}
                </Card.Meta>
                <Card.Figure>
                  <img src={ds.meta.info.logos.small} alt={`${ds.meta.name} Logo`} height="40" width="40" />
                </Card.Figure>
                <Card.Tags>{ds.isDefault ? <TagList tags={['default']} /> : null}</Card.Tags>
              </Card>
            );
          })}
        </VerticalGroup>
      </div>
    );
  }
}
