import { css } from '@emotion/css';
import React, { PureComponent, useState } from 'react';
import { DropEvent, FileRejection } from 'react-dropzone';
import { connect } from 'react-redux';

import {
  DataSourceInstanceSettings,
  DataSourceRef,
  GrafanaTheme2,
  DataSourcePluginMeta,
  DataSourceApi,
  DataSourceSettings,
} from '@grafana/data';
import { getDataSourceSrv, locationService } from '@grafana/runtime';
import {
  Button,
  Modal,
  VerticalGroup,
  Card,
  TagList,
  FileDropzone,
  FileDropzoneDefaultChildren,
  CustomScrollbar,
  useStyles2,
  Input,
  Icon,
} from '@grafana/ui';
import * as DFImport from 'app/features/dataframe-import';
import { StoreState, useDispatch, useSelector } from 'app/types';

import { contextSrv } from '../../../core/services/context_srv';
import { discardPanelChanges } from '../../dashboard/components/PanelEditor/state/actions';
import * as api from '../api';
import {
  dataSourceLoaded,
  setDataSourceName,
  setIsDefault,
  useDataSource,
  useDataSourceMeta,
  useDataSourceRights,
  useDataSourceSettings,
  useDeleteLoadedDataSource,
  useInitDataSourceSettings,
  useTestDataSource,
  useUpdateDatasource,
  useLoadDataSourcePlugins,
  getFilteredDataSourcePlugins,
  setDataSourceTypeSearchQuery,
} from '../state';
import { findNewName, nameExits } from '../utils';

import { EditDataSourceView } from './EditDataSource';
import { NewDataSourceView } from './NewDataSource';

interface DataSourceModalProps {
  onFileDrop: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => void;
  onChange: (ds: DataSourceInstanceSettings) => void;
  current: DataSourceRef | string | null;
  isOpen: boolean;
  discardPanelChanges: () => void;
}

function DataSourceModalRaw({ isOpen, onChange, onFileDrop, current, discardPanelChanges }: DataSourceModalProps) {
  const styles = useStyles2(getDataSourceModalStyles);
  const [search, setSearch] = useState('');
  const [addingDataSource, setAddingDataSource] = useState(false);

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
      title={
        <div>
          {addingDataSource ? (
            <Button icon="arrow-left" fill="text" variant="secondary" onClick={() => setAddingDataSource(false)}>
              Cancel
            </Button>
          ) : (
            <Button icon="arrow-left" fill="text" variant="secondary" onClick={goBackToDashboard}>
              Back to dashboard
            </Button>
          )}
        </div>
      }
      closeOnEscape={true}
      closeOnBackdropClick={true}
      isOpen={isOpen}
      className={styles.modal}
      onClickBackdrop={goBackToDashboard}
      onDismiss={goBackToDashboard}
    >
      <div className={styles.modalContentHeader}>
        <h3>{addingDataSource ? 'Select data source type' : 'Select a data source'}</h3>
      </div>
      <div className={styles.modalContentBody}>
        {addingDataSource ? (
          <ConfigDataSource onChange={onChange} onDismiss={() => setAddingDataSource(false)} />
        ) : (
          <>
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
              <DSPickerList dashboard mixed filter={(ds) => !!ds.meta.builtIn} onChange={onChange} current={current} />
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
                <Button variant="secondary" onClick={() => setAddingDataSource(true)}>
                  Configure a new data source
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

const mapDispatchToProps = {
  discardPanelChanges,
};

export const DataSourceModal = connect(undefined, mapDispatchToProps)(DataSourceModalRaw);

function getDataSourceModalStyles(theme: GrafanaTheme2) {
  return {
    modal: css`
      min-width: 80%;
      min-height: 80%;
    `,
    modalContentHeader: css`
      height: 100%;
      padding: ${theme.spacing(1)};
    `,
    modalContentBody: css`
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
      justify-items: space-between;
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

interface ConfigDataSourceProps {
  onDismiss: () => void;
  onChange: (ds: DataSourceInstanceSettings) => void;
}
function ConfigDataSource({ onDismiss, onChange }: ConfigDataSourceProps) {
  useLoadDataSourcePlugins();

  const dispatch = useDispatch();
  const filteredDataSources = useSelector((s: StoreState) => getFilteredDataSourcePlugins(s.dataSources));
  const searchQuery = useSelector((s: StoreState) => s.dataSources.dataSourceTypeSearchQuery);
  const isLoadingDatasourcePlugins = useSelector((s: StoreState) => s.dataSources.isLoadingDataSourcePlugins);
  const dataSourceCategories = useSelector((s: StoreState) => s.dataSources.categories);
  const onSetSearchQuery = (q: string) => dispatch(setDataSourceTypeSearchQuery(q));
  const [isLoadingNewDataSource, setLoadingNewDataSource] = useState(false);
  const [newDataSource, setNewDataSource] = useState<string>();

  const onAddDataSource = async (plugin: DataSourcePluginMeta) => {
    setLoadingNewDataSource(true);
    const newDataSource = await addDataSource(plugin);
    setNewDataSource(newDataSource.uid);
    setLoadingNewDataSource(false);
  };

  return (
    <div>
      {isLoadingNewDataSource && 'Loading...'}
      {newDataSource ? (
        <EditDataSource uid={newDataSource} onDismiss={onDismiss} onSave={onChange} />
      ) : (
        !isLoadingNewDataSource && (
          <NewDataSourceView
            dataSources={filteredDataSources}
            dataSourceCategories={dataSourceCategories}
            searchQuery={searchQuery}
            isLoading={isLoadingDatasourcePlugins}
            onAddDataSource={onAddDataSource}
            onSetSearchQuery={onSetSearchQuery}
          />
        )
      )}
    </div>
  );
}

export type Props = {
  // The ID of the data source
  uid: string;
  // The ID of the custom datasource setting page
  pageId?: string | null;
  onDismiss: () => void;
  onSave: (ds: DataSourceSettings) => void;
};
export function EditDataSource({ uid, pageId, onDismiss, onSave }: Props) {
  useInitDataSourceSettings(uid);

  const dispatch = useDispatch();
  const dataSource = useDataSource(uid);
  const dataSourceMeta = useDataSourceMeta(dataSource.type);
  const dataSourceSettings = useDataSourceSettings();
  const dataSourceRights = useDataSourceRights(uid);
  const onDelete = useDeleteLoadedDataSource();
  const onTest = useTestDataSource(uid);
  const onUpdate = useUpdateDatasource();
  const onDefaultChange = (value: boolean) => dispatch(setIsDefault(value));
  const onNameChange = (name: string) => dispatch(setDataSourceName(name));
  const onOptionsChange = (ds: DataSourceSettings) => dispatch(dataSourceLoaded(ds));

  return (
    <EditDataSourceView
      pageId={pageId}
      dataSource={dataSource}
      dataSourceMeta={dataSourceMeta}
      dataSourceSettings={dataSourceSettings}
      dataSourceRights={dataSourceRights}
      onDelete={() => {
        onDelete();
        onDismiss();
      }}
      onDefaultChange={onDefaultChange}
      onNameChange={onNameChange}
      onOptionsChange={onOptionsChange}
      onTest={onTest}
      onUpdate={(datasource: DataSourceSettings) => {
        onSave(datasource);
        return onUpdate(datasource);
      }}
      onBack={discardPanelChanges}
    />
  );
}

export async function addDataSource(plugin: DataSourcePluginMeta): Promise<DataSourceApi> {
  // update the list of datasources first.
  // We later use this list to check whether the name of the datasource
  // being created is unuque or not and assign a new name to it if needed.
  const dataSourceSrv = getDataSourceSrv();
  const dataSources = dataSourceSrv.getList();

  const isFirstDataSource = dataSources.length === 0;
  const newInstance = {
    name: plugin.name,
    type: plugin.id,
    access: 'proxy',
    isDefault: isFirstDataSource,
  };

  if (nameExits(dataSources, newInstance.name)) {
    newInstance.name = findNewName(dataSources, newInstance.name);
  }

  const result = await api.createDataSource(newInstance);

  await dataSourceSrv.reload();
  await contextSrv.fetchUserPermissions();

  return dataSourceSrv.get(result.datasource.uid);
}
