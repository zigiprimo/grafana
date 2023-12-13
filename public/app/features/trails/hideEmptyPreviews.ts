import { FieldType, LoadingState } from '@grafana/data';
import { SceneCSSGridItem, sceneGraph } from '@grafana/scenes';

export function hideEmptyPreviews(gridItem: SceneCSSGridItem) {
  const data = sceneGraph.getData(gridItem);
  if (!data) {
    return;
  }

  function subscribe() {
    data.subscribeToState((state) => {
      if (state.data?.state === LoadingState.Loading) {
        return;
      }

      if (!state.data?.series.length) {
        console.log('hiding, no series');
        gridItem.setState({ isHidden: true });
        return;
      }

      for (const frame of state.data.series) {
        for (const field of frame.fields) {
          if (field.type !== FieldType.number) {
            continue;
          }

          const hasValue = field.values.find((v) => v != null);
          if (!hasValue) {
            console.log('hiding, all nulls');
            gridItem.setState({ isHidden: true });
            return;
          }

          const hasNonZeroValue = field.values.find((v) => v !== 0);
          if (!hasNonZeroValue) {
            console.log('hiding, all zeros');
            gridItem.setState({ isHidden: true });
            return;
          }
        }
      }

      if (gridItem.state.isHidden) {
        gridItem.setState({ isHidden: false });
      }
    });
  }

  // Working around an issue in scenes lib where activationHandler is not called if the object is already active.
  if (data.isActive) {
    subscribe();
  } else {
    data.addActivationHandler(subscribe);
  }
}
