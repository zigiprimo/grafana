import { css } from '@emotion/css';
import React, { PureComponent, useState } from 'react';
import { DropEvent, FileRejection } from 'react-dropzone';
import { connect } from 'react-redux';

import { DataSourceInstanceSettings, DataSourceRef, GrafanaTheme2 } from '@grafana/data';
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
  LinkButton,
  useStyles2,
  Input,
  Icon,
} from '@grafana/ui';
import * as DFImport from 'app/features/dataframe-import';

import { discardPanelChanges } from '../../dashboard/components/PanelEditor/state/actions';

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
            <LinkButton variant="secondary" href={`datasources/new`}>
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

export const DataSourceModal = connect(undefined, mapDispatchToProps)(DataSourceModalRaw);

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
