// @ts-check
import { Diagnostic, Node, Project, SourceFile, SyntaxKind, ts } from 'ts-morph';

console.log('Creating project...');
const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});
console.log('Project created.');

console.log('Resolving source file dependencies...');
project.resolveSourceFileDependencies();
console.log('Source file dependencies resolved.');

const TYPE_ASSERTION_FILES = [
  `e2e/utils/support/types.ts`,
  `packages/grafana-data/src/dataframe/DataFrameJSON.ts`,
  `packages/grafana-data/src/dataframe/DataFrameView.ts`,
  `packages/grafana-data/src/dataframe/MutableDataFrame.ts`,
  `packages/grafana-data/src/dataframe/StreamingDataFrame.ts`,
  `packages/grafana-data/src/dataframe/processDataFrame.ts`,
  `packages/grafana-data/src/datetime/datemath.ts`,
  `packages/grafana-data/src/datetime/durationutil.ts`,
  `packages/grafana-data/src/datetime/formatter.ts`,
  `packages/grafana-data/src/datetime/moment_wrapper.ts`,
  `packages/grafana-data/src/datetime/parser.ts`,
  `packages/grafana-data/src/datetime/rangeutil.ts`,
  `packages/grafana-data/src/field/displayProcessor.ts`,
  `packages/grafana-data/src/field/overrides/processors.ts`,
  `packages/grafana-data/src/field/scale.ts`,
  `packages/grafana-data/src/panel/PanelPlugin.ts`,
  `packages/grafana-data/src/panel/registryFactories.ts`,
  `packages/grafana-data/src/themes/createColors.ts`,
  `packages/grafana-data/src/types/app.ts`,
  `packages/grafana-data/src/types/fieldOverrides.ts`,
  `packages/grafana-data/src/types/live.ts`,
  `packages/grafana-data/src/types/plugin.ts`,
  `packages/grafana-data/src/utils/OptionsUIBuilders.ts`,
  `packages/grafana-data/src/utils/csv.ts`,
  `packages/grafana-data/src/utils/datasource.ts`,
  `packages/grafana-data/src/utils/location.ts`,
  `packages/grafana-data/src/utils/url.ts`,
  `packages/grafana-data/src/utils/valueMappings.ts`,
  `packages/grafana-data/src/vector/AppendedVectors.ts`,
  `packages/grafana-runtime/src/config.ts`,
  `packages/grafana-runtime/src/services/LocationService.ts`,
  `packages/grafana-runtime/src/utils/DataSourceWithBackend.ts`,
  `packages/grafana-runtime/src/utils/queryResponse.ts`,
  `packages/grafana-schema/src/veneer/dashboard.types.ts`,
  `packages/grafana-ui/src/components/Forms/Legacy/Input/Input.tsx`,
  `packages/grafana-ui/src/components/InfoBox/InfoBox.tsx`,
  `packages/grafana-ui/src/components/MatchersUI/FieldValueMatcher.tsx`,
  `packages/grafana-ui/src/components/PanelChrome/index.ts`,
  `packages/grafana-ui/src/components/Segment/SegmentSelect.tsx`,
  `packages/grafana-ui/src/components/Select/SelectBase.tsx`,
  `packages/grafana-ui/src/components/SingleStatShared/SingleStatBaseOptions.ts`,
  `packages/grafana-ui/src/components/Tags/Tag.tsx`,
  `packages/grafana-ui/src/options/builder/axis.tsx`,
  `packages/grafana-ui/src/options/builder/hideSeries.tsx`,
  `packages/grafana-ui/src/slate-plugins/braces.ts`,
  `packages/grafana-ui/src/slate-plugins/slate-prism/index.ts`,
  `packages/grafana-ui/src/slate-plugins/suggestions.tsx`,
  `packages/grafana-ui/src/themes/ThemeContext.tsx`,
  `public/app/core/components/OptionsUI/registry.tsx`,
  `public/app/core/components/connectWithCleanUp.tsx`,
  `public/app/core/services/backend_srv.ts`,
  `public/app/core/services/context_srv.ts`,
  `public/app/core/services/echo/backends/analytics/ApplicationInsightsBackend.ts`,
  `public/app/core/services/echo/backends/analytics/RudderstackBackend.ts`,
  `public/app/core/utils/connectWithReduxStore.tsx`,
  `public/app/core/utils/explore.ts`,
  `public/app/core/utils/fetch.ts`,
  `public/app/core/utils/object.ts`,
  `public/app/core/utils/ticks.ts`,
  `public/app/core/utils/tracing.ts`,
  `public/app/features/annotations/standardAnnotationSupport.ts`,
  `public/app/features/org/state/reducers.ts`,
  `public/app/features/sandbox/TestStuffPage.tsx`,
  `public/app/features/search/components/SearchCard.tsx`,
  `public/app/features/search/hooks/useSearchKeyboardSelection.ts`,
  `public/app/features/search/page/components/columns.tsx`,
  `public/app/features/search/service/bluge.ts`,
  `public/app/features/search/service/utils.ts`,
  `public/app/features/search/state/SearchStateManager.ts`,
  `public/app/features/search/utils.ts`,
  `public/app/plugins/datasource/grafana/components/AnnotationQueryEditor.tsx`,
  `public/app/plugins/datasource/grafana/components/QueryEditor.tsx`,
  `public/app/plugins/datasource/grafana/datasource.ts`,
  `public/app/plugins/panel/annolist/AnnoListPanel.tsx`,
  `public/app/plugins/panel/annolist/module.tsx`,
  `public/app/store/store.ts`,
  `public/app/types/store.ts`,
  `public/app/types/unified-alerting-dto.ts`,

  `packages/grafana-data/src/transformations/transformers/nulls/nullInsertThreshold.ts`,
  `packages/grafana-data/src/transformations/transformers/nulls/nullToUndefThreshold.ts`,
  `packages/grafana-data/src/transformations/transformers/utils.ts`,
  `packages/grafana-ui/src/components/Table/FooterRow.tsx`,
  `packages/grafana-ui/src/components/Table/Table.tsx`,
  `packages/grafana-ui/src/components/Table/TableCell.tsx`,
  `packages/grafana-ui/src/components/Table/reducer.ts`,
  `public/app/features/dashboard/components/TransformationsEditor/TransformationsEditor.tsx`,
  `public/app/features/transformers/calculateHeatmap/heatmap.ts`,
  `public/app/features/transformers/editors/CalculateFieldTransformerEditor.tsx`,
  `public/app/features/transformers/editors/ConvertFieldTypeTransformerEditor.tsx`,
  `public/app/features/transformers/editors/GroupByTransformerEditor.tsx`,
  `public/app/features/transformers/editors/ReduceTransformerEditor.tsx`,
  `public/app/features/transformers/editors/SortByTransformerEditor.tsx`,
  `public/app/features/transformers/extractFields/ExtractFieldsTransformerEditor.tsx`,
  `public/app/features/transformers/extractFields/extractFields.ts`,
  `public/app/features/transformers/fieldToConfigMapping/FieldToConfigMappingEditor.tsx`,
  `public/app/features/transformers/fieldToConfigMapping/fieldToConfigMapping.ts`,
  `public/app/features/transformers/lookupGazetteer/FieldLookupTransformerEditor.tsx`,
  `public/app/features/transformers/spatial/optionsHelper.tsx`,
  `public/app/plugins/panel/table-old/renderer.ts`,

  `packages/grafana-data/src/types/logs.ts`,
  `public/app/features/explore/Logs/Logs.tsx`,
  `public/app/features/logs/utils.ts`,
  `public/app/plugins/datasource/elasticsearch/ElasticResponse.ts`,
  `public/app/plugins/datasource/elasticsearch/LegacyQueryRunner.ts`,
  `public/app/plugins/datasource/elasticsearch/QueryBuilder.ts`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/BucketAggregationsEditor/BucketAggregationEditor.tsx`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/BucketAggregationsEditor/SettingsEditor/DateHistogramSettingsEditor.tsx`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/BucketAggregationsEditor/SettingsEditor/TermsSettingsEditor.tsx`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/BucketAggregationsEditor/aggregations.ts`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/BucketAggregationsEditor/state/reducer.ts`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/MetricAggregationsEditor/MetricEditor.tsx`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/MetricAggregationsEditor/SettingsEditor/SettingField.tsx`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/MetricAggregationsEditor/aggregations.ts`,
  `public/app/plugins/datasource/elasticsearch/components/QueryEditor/MetricAggregationsEditor/state/reducer.ts`,
  `public/app/plugins/datasource/elasticsearch/datasource.ts`,
  `public/app/plugins/datasource/elasticsearch/hooks/useStatelessReducer.ts`,
  `public/app/plugins/datasource/elasticsearch/test-helpers/render.tsx`,
  `public/app/plugins/datasource/loki/components/LokiLabelBrowser.tsx`,
  `public/app/plugins/datasource/loki/configuration/DebugSection.tsx`,
  `public/app/plugins/datasource/loki/queryUtils.ts`,
  `public/app/plugins/datasource/loki/querybuilder/components/LokiQueryBuilder.tsx`,
  `public/app/plugins/panel/logs/LogsPanel.tsx`,

  `packages/grafana-ui/src/components/DataLinks/DataLinkInput.tsx`,
  `packages/grafana-ui/src/components/VizRepeater/VizRepeater.tsx`,
  `packages/grafana-ui/src/components/uPlot/Plot.tsx`,
  `packages/grafana-ui/src/components/uPlot/config/UPlotAxisBuilder.ts`,
  `packages/grafana-ui/src/components/uPlot/config/UPlotConfigBuilder.ts`,
  `packages/grafana-ui/src/components/uPlot/utils.ts`,
  `packages/grafana-ui/src/graveyard/GraphNG/GraphNG.tsx`,
  `packages/grafana-ui/src/graveyard/GraphNG/hooks.ts`,
  `packages/grafana-ui/src/graveyard/GraphNG/nullInsertThreshold.ts`,
  `packages/grafana-ui/src/graveyard/GraphNG/nullToUndefThreshold.ts`,
  `packages/grafana-ui/src/graveyard/TimeSeries/utils.ts`,
  `public/app/core/components/GraphNG/GraphNG.tsx`,
  `public/app/core/components/GraphNG/hooks.ts`,
  `public/app/core/components/TimeSeries/utils.ts`,
  `public/app/features/canvas/runtime/element.tsx`,
  `public/app/features/canvas/runtime/frame.tsx`,
  `public/app/features/canvas/runtime/root.tsx`,
  `public/app/features/canvas/runtime/scene.tsx`,
  `public/app/features/dimensions/editors/FolderPickerTab.tsx`,
  `public/app/features/dimensions/editors/ResourceDimensionEditor.tsx`,
  `public/app/features/dimensions/editors/TextDimensionEditor.tsx`,
  `public/app/features/dimensions/editors/ThresholdsEditor/ThresholdsEditor.tsx`,
  `public/app/features/dimensions/scale.ts`,
  `public/app/features/dimensions/utils.ts`,
  `public/app/features/geo/gazetteer/gazetteer.ts`,
  `public/app/features/geo/utils/frameVectorSource.ts`,
  `public/app/plugins/panel/barchart/BarChartPanel.tsx`,
  `public/app/plugins/panel/barchart/bars.ts`,
  `public/app/plugins/panel/barchart/module.tsx`,
  `public/app/plugins/panel/candlestick/CandlestickPanel.tsx`,
  `public/app/plugins/panel/canvas/editor/element/APIEditor.tsx`,
  `public/app/plugins/panel/canvas/editor/element/elementEditor.tsx`,
  `public/app/plugins/panel/canvas/editor/inline/InlineEditBody.tsx`,
  `public/app/plugins/panel/canvas/editor/layer/layerEditor.tsx`,
  `public/app/plugins/panel/geomap/components/MarkersLegend.tsx`,
  `public/app/plugins/panel/geomap/editor/GeomapStyleRulesEditor.tsx`,
  `public/app/plugins/panel/geomap/editor/StyleEditor.tsx`,
  `public/app/plugins/panel/geomap/editor/StyleRuleEditor.tsx`,
  `public/app/plugins/panel/geomap/layers/basemaps/esri.ts`,
  `public/app/plugins/panel/geomap/layers/data/geojsonDynamic.ts`,
  `public/app/plugins/panel/geomap/layers/data/routeLayer.tsx`,
  `public/app/plugins/panel/geomap/utils/layers.ts`,
  `public/app/plugins/panel/geomap/utils/tooltip.ts`,
  `public/app/plugins/panel/heatmap/HeatmapPanel.tsx`,
  `public/app/plugins/panel/heatmap/module.tsx`,
  `public/app/plugins/panel/heatmap/palettes.ts`,
  `public/app/plugins/panel/heatmap/types.ts`,
  `public/app/plugins/panel/heatmap/utils.ts`,
  `public/app/plugins/panel/histogram/Histogram.tsx`,
  `public/app/plugins/panel/timeseries/migrations.ts`,
  `public/app/plugins/panel/timeseries/plugins/annotations/AnnotationEditor.tsx`,
  `public/app/plugins/panel/xychart/ManualEditor.tsx`,
  `public/app/plugins/panel/xychart/TooltipView.tsx`,
  `public/app/plugins/panel/xychart/dims.ts`,
  `public/app/plugins/panel/xychart/scatter.ts`,

  `public/app/core/components/TraceToLogs/TagMappingInput.tsx`,
  `public/app/features/explore/TraceView/TraceView.tsx`,
  `public/app/features/explore/TraceView/components/demo/trace-generators.ts`,
  `public/app/features/explore/TraceView/components/model/link-patterns.tsx`,
  `public/app/features/explore/TraceView/components/model/transform-trace-data.tsx`,
  `public/app/features/explore/TraceView/createSpanLink.tsx`,
  `public/app/plugins/datasource/jaeger/datasource.ts`,
  `public/app/plugins/datasource/tempo/LokiSearch.tsx`,
  `public/app/plugins/datasource/tempo/ServiceGraphSection.tsx`,
  `public/app/plugins/datasource/tempo/configuration/TraceQLSearchSettings.tsx`,
  `public/app/plugins/datasource/tempo/datasource.ts`,
  `public/app/plugins/datasource/tempo/resultTransformer.ts`,
  `public/app/plugins/datasource/zipkin/QueryField.tsx`,
  `public/app/plugins/datasource/zipkin/datasource.ts`,
  `public/app/plugins/panel/nodeGraph/Edge.tsx`,
  `public/app/plugins/panel/nodeGraph/EdgeLabel.tsx`,
  `public/app/plugins/panel/nodeGraph/NodeGraph.tsx`,
  `public/app/plugins/panel/nodeGraph/layout.ts`,

  `public/app/features/admin/OrgRolePicker.tsx`,
  `public/app/features/serviceaccounts/state/reducers.ts`,
  `public/app/features/teams/state/reducers.ts`,
  `public/app/features/users/state/reducers.ts`,

  `public/app/features/alerting/AlertTab.tsx`,
  `public/app/features/alerting/AlertTabCtrl.ts`,
  `public/app/features/alerting/components/NotificationChannelOptions.tsx`,
  `public/app/features/alerting/getAlertingValidationMessage.ts`,
  `public/app/features/alerting/state/alertDef.ts`,
  `public/app/features/alerting/unified/RuleList.tsx`,
  `public/app/features/alerting/unified/api/ruler.ts`,
  `public/app/features/alerting/unified/components/AnnotationDetailsField.tsx`,
  `public/app/features/alerting/unified/components/Authorize.tsx`,
  `public/app/features/alerting/unified/components/alert-groups/AlertGroupFilter.tsx`,
  `public/app/features/alerting/unified/components/alert-groups/AlertGroupHeader.tsx`,
  `public/app/features/alerting/unified/components/alert-groups/GroupBy.tsx`,
  `public/app/features/alerting/unified/components/contact-points/ContactPoints.v2.tsx`,
  `public/app/features/alerting/unified/components/receivers/form/ChannelOptions.tsx`,
  `public/app/features/alerting/unified/components/receivers/form/ReceiverForm.tsx`,
  `public/app/features/alerting/unified/components/receivers/form/fields/OptionField.tsx`,
  `public/app/features/alerting/unified/components/rule-editor/AnnotationKeyInput.tsx`,
  `public/app/features/alerting/unified/components/rule-editor/ExpressionEditor.tsx`,
  `public/app/features/alerting/unified/components/rule-editor/RuleInspector.tsx`,
  `public/app/features/alerting/unified/components/silences/SilencesEditor.tsx`,
  `public/app/features/alerting/unified/components/silences/SilencesFilter.tsx`,
  `public/app/features/alerting/unified/hooks/useAlertmanagerConfig.ts`,
  `public/app/features/alerting/unified/mocks.ts`,
  `public/app/features/alerting/unified/state/actions.ts`,
  `public/app/features/alerting/unified/utils/receiver-form.ts`,
  `public/app/features/alerting/unified/utils/redux.ts`,
  `public/app/features/alerting/unified/utils/rulerClient.ts`,
  `public/app/features/alerting/unified/utils/rules.ts`,

  `public/app/features/dashboard-scene/serialization/transformSceneToSaveModel.ts`,
  `public/app/features/dashboard-scene/utils/test-utils.ts`,
  `public/app/features/dashboard/components/DashExportModal/DashboardExporter.ts`,
  `public/app/features/dashboard/components/DashboardPrompt/DashboardPrompt.tsx`,
  `public/app/features/dashboard/components/Inspector/PanelInspector.tsx`,
  `public/app/features/dashboard/components/PanelEditor/PanelEditor.tsx`,
  `public/app/features/dashboard/components/PanelEditor/utils.ts`,
  `public/app/features/dashboard/components/VersionHistory/useDashboardRestore.tsx`,
  `public/app/features/dashboard/containers/DashboardPage.tsx`,
  `public/app/features/dashboard/dashgrid/DashboardGrid.tsx`,
  `public/app/features/dashboard/dashgrid/SeriesVisibilityConfigFactory.ts`,
  `public/app/features/dashboard/state/DashboardMigrator.ts`,
  `public/app/features/dashboard/state/DashboardModel.ts`,
  `public/app/features/dashboard/state/PanelModel.ts`,
  `public/app/features/dashboard/utils/getPanelMenu.ts`,
  `public/app/features/dashboard/utils/panelMerge.ts`,
  `public/app/features/inspector/InspectDataOptions.tsx`,
  `public/app/features/manage-dashboards/components/ImportDashboardLibraryPanelsList.tsx`,
  `public/app/features/manage-dashboards/state/actions.ts`,
  `public/app/features/manage-dashboards/state/reducers.ts`,
  `public/app/features/query/components/QueryEditorRow.tsx`,
  `public/app/features/query/state/DashboardQueryRunner/AnnotationsQueryRunner.ts`,
  `public/app/features/query/state/DashboardQueryRunner/PublicAnnotationsDataSource.ts`,
  `public/app/features/query/state/DashboardQueryRunner/testHelpers.ts`,
  `public/app/features/query/state/PanelQueryRunner.ts`,
  `public/app/features/query/state/runRequest.ts`,
  `public/app/features/templating/template_srv.mock.ts`,
  `public/app/features/templating/template_srv.ts`,
  `public/app/features/variables/adhoc/actions.ts`,
  `public/app/features/variables/constant/reducer.ts`,
  `public/app/features/variables/custom/reducer.ts`,
  `public/app/features/variables/datasource/reducer.ts`,
  `public/app/features/variables/editor/VariableEditorContainer.tsx`,
  `public/app/features/variables/inspect/utils.ts`,
  `public/app/features/variables/interval/reducer.ts`,
  `public/app/features/variables/query/VariableQueryRunner.ts`,
  `public/app/features/variables/query/reducer.ts`,
  `public/app/features/variables/shared/formatVariable.ts`,
  `public/app/features/variables/shared/testing/optionsVariableBuilder.ts`,
  `public/app/features/variables/shared/testing/variableBuilder.ts`,
  `public/app/features/variables/state/actions.ts`,
  `public/app/features/variables/state/sharedReducer.ts`,
  `public/app/features/variables/system/adapter.ts`,
  `public/app/features/variables/utils.ts`,
  `public/app/plugins/datasource/dashboard/DashboardQueryEditor.tsx`,
  `public/app/plugins/datasource/dashboard/runSharedRequest.ts`,

  `public/app/features/datasources/components/DataSourceTestingStatus.tsx`,
  `public/app/features/datasources/components/EditDataSource.tsx`,
  `public/app/features/datasources/state/actions.ts`,
  `public/app/features/datasources/state/navModel.ts`,
  `public/app/features/datasources/state/reducers.ts`,
  `public/app/features/datasources/state/selectors.ts`,
  `public/app/features/plugins/admin/components/GetStartedWithPlugin/GetStartedWithDataSource.tsx`,
  `public/app/features/plugins/admin/components/PluginDetailsBody.tsx`,
  `public/app/features/plugins/admin/components/PluginDetailsPage.tsx`,
  `public/app/features/plugins/admin/pages/Browse.tsx`,
  `public/app/features/plugins/admin/state/actions.ts`,
  `public/app/features/plugins/datasource_srv.ts`,
  `public/app/features/plugins/sandbox/distortion_map.ts`,
  `public/app/features/plugins/sandbox/sandbox_plugin_loader.ts`,
  `public/app/features/plugins/utils.ts`,
  `public/app/plugins/datasource/grafana-testdata-datasource/QueryEditor.tsx`,
  `public/app/plugins/datasource/grafana-testdata-datasource/components/RandomWalkEditor.tsx`,
  `public/app/plugins/datasource/grafana-testdata-datasource/components/SimulationQueryEditor.tsx`,
  `public/app/plugins/datasource/grafana-testdata-datasource/datasource.ts`,

  `public/app/features/explore/ContentOutline/ContentOutline.tsx`,
  `public/app/features/explore/spec/helper/setup.tsx`,
  `public/app/features/explore/state/utils.ts`,

  `public/app/features/expressions/ExpressionDatasource.ts`,
  `public/app/features/expressions/guards.ts`,
  `public/app/plugins/datasource/graphite/components/MetricTankMetaInspector.tsx`,
  `public/app/plugins/datasource/graphite/datasource.ts`,
  `public/app/plugins/datasource/graphite/gfunc.ts`,
  `public/app/plugins/datasource/graphite/graphite_query.ts`,
  `public/app/plugins/datasource/graphite/state/context.tsx`,
  `public/app/plugins/datasource/graphite/state/helpers.ts`,
  `public/app/plugins/datasource/graphite/state/store.ts`,
  `public/app/plugins/datasource/influxdb/components/editor/config/ConfigEditor.tsx`,
  `public/app/plugins/datasource/influxdb/datasource.ts`,
  `public/app/plugins/datasource/influxdb/mocks.ts`,
  `public/app/plugins/datasource/opentsdb/datasource.ts`,
  `public/app/plugins/datasource/prometheus/configuration/AzureCredentialsConfig.ts`,
  `public/app/plugins/datasource/prometheus/language_provider.ts`,
  `public/app/plugins/datasource/prometheus/language_utils.ts`,
  `public/app/plugins/datasource/prometheus/querybuilder/components/LabelFilterItem.tsx`,
  `public/app/plugins/datasource/prometheus/querybuilder/components/LabelParamEditor.tsx`,
  `public/app/plugins/datasource/prometheus/querybuilder/components/PromQueryBuilder.tsx`,
  `public/app/plugins/datasource/prometheus/querybuilder/shared/LabelFilterItem.tsx`,
  `public/app/plugins/datasource/prometheus/querybuilder/shared/LabelFilters.tsx`,
  `public/app/plugins/datasource/prometheus/querybuilder/shared/OperationParamEditor.tsx`,
  `public/app/plugins/datasource/prometheus/querybuilder/shared/operationUtils.ts`,

  `public/app/features/live/centrifuge/LiveDataStream.ts`,
  `public/app/features/live/centrifuge/serviceWorkerProxy.ts`,
  `public/app/features/live/data/amendTimeSeries.ts`,
  `public/app/features/live/index.ts`,
  `public/app/features/storage/storage.ts`,
  `public/app/plugins/panel/live/LivePanel.tsx`,

  `public/app/features/plugins/sql/components/visual-query-builder/AwesomeQueryBuilder.tsx`,
  `public/app/features/plugins/sql/components/visual-query-builder/SQLWhereRow.tsx`,
  `public/app/plugins/datasource/azuremonitor/azure_monitor/azure_monitor_datasource.ts`,
  `public/app/plugins/datasource/azuremonitor/components/LogsQueryEditor/QueryField.tsx`,
  `public/app/plugins/datasource/azuremonitor/components/QueryEditor/QueryEditor.tsx`,
  `public/app/plugins/datasource/cloud-monitoring/CloudMonitoringMetricFindQuery.ts`,
  `public/app/plugins/datasource/cloud-monitoring/annotationSupport.ts`,
  `public/app/plugins/datasource/cloud-monitoring/components/Aggregation.tsx`,
  `public/app/plugins/datasource/cloud-monitoring/components/VariableQueryEditor.tsx`,
  `public/app/plugins/datasource/cloud-monitoring/datasource.ts`,
  `public/app/plugins/datasource/cloud-monitoring/functions.ts`,

  `public/app/plugins/datasource/cloudwatch/components/QueryEditor/LogsQueryEditor/LogsQueryFieldOld.tsx`,
  `public/app/plugins/datasource/cloudwatch/guards.ts`,
  `public/app/plugins/datasource/cloudwatch/query-runner/CloudWatchLogsQueryRunner.ts`,
  `public/app/plugins/datasource/cloudwatch/utils/datalinks.ts`,

  `public/app/plugins/panel/debug/CursorView.tsx`,
  `public/app/plugins/panel/debug/EventBusLogger.tsx`,
];

// const TYPE_ASSERTION_FILES = [];

const typeAssertionFiles = project.getSourceFiles(TYPE_ASSERTION_FILES);

const IGNORE_AS_TYPES = ['const'];

for (const sourceFile of typeAssertionFiles) {
  console.log(sourceFile.getFilePath());

  const initialErrors = sourceFile.getPreEmitDiagnostics();
  if (initialErrors.length > 0) {
    console.log('  file already has errors, skipping');
  }

  // find all type assertions in source file
  const typeAssertions = sourceFile.getDescendantsOfKind(SyntaxKind.AsExpression);

  let madeChanges = false;

  for (const typeAssertion of typeAssertions) {
    let castType;

    try {
      castType = typeAssertion.compilerNode.type;
    } catch {
      console.log('    ❌ FAILED get compiler node, aborting file');
      madeChanges = false;
      break;
    }

    const castTypeText = castType.getText();

    if (IGNORE_AS_TYPES.includes(castTypeText)) {
      continue;
    }

    console.log('    ' + typeAssertion.getText() + ' @ line ' + typeAssertion.getStartLineNumber());

    const parent = typeAssertion.getParent();
    const parentOriginalText = parent.getText();

    typeAssertion.replaceWithText(typeAssertion.getExpression().getText());

    const nowErrors = sourceFile.getPreEmitDiagnostics();
    if (nowErrors.length) {
      console.log('        ❌ Failed - ' + nowErrors[0].getMessageText());
      try {
        parent.replaceWithText(parentOriginalText);
      } catch {
        console.log('    ❌ FAILED to roll back change, aborting file');
        madeChanges = false;
        break;
      }
    } else {
      console.log('        ✔️ Success! 🥳');
      madeChanges = true;
    }
  }

  if (madeChanges) {
    const endErrors = sourceFile.getPreEmitDiagnostics();
    if (endErrors.length === 0) {
      console.log('    writing file');
      await sourceFile.save();
    }
  }
}
