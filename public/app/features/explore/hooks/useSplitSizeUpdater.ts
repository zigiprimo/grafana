import { inRange } from 'lodash';
import { useState } from 'react';
import { useWindowSize } from 'react-use';

import { useExploreDispatch, useExploreSelector } from 'app/features/explore/state/store';

import { splitSizeUpdateAction } from '../state/main';
import { isSplit, selectPanesEntries } from '../state/selectors';

export const useSplitSizeUpdater = (minWidth: number) => {
  const dispatch = useExploreDispatch();
  const { width: windowWidth } = useWindowSize();
  const panes = useExploreSelector(selectPanesEntries);
  const hasSplit = useExploreSelector(isSplit);
  const [rightPaneWidthRatio, setRightPaneWidthRatio] = useState(0.5);

  const { evenSplitPanes, maxedExploreId } = useExploreSelector((state) => {
    return {
      maxedExploreId: state.maxedExploreId,
      evenSplitPanes: state.evenSplitPanes,
    };
  });

  const updateSplitSize = (size: number) => {
    const evenSplitWidth = windowWidth / 2;
    const areBothSimilar = inRange(size, evenSplitWidth - 100, evenSplitWidth + 100);
    if (areBothSimilar) {
      dispatch(splitSizeUpdateAction({ largerExploreId: undefined }));
    } else {
      dispatch(
        splitSizeUpdateAction({
          largerExploreId: size > evenSplitWidth ? panes[1][0] : panes[0][0],
        })
      );
    }

    setRightPaneWidthRatio(size / windowWidth);
  };

  let widthCalc = 0;
  if (hasSplit) {
    if (!evenSplitPanes && maxedExploreId) {
      widthCalc = maxedExploreId === panes[1][0] ? windowWidth - minWidth : minWidth;
    } else if (evenSplitPanes) {
      widthCalc = Math.floor(windowWidth / 2);
    } else if (rightPaneWidthRatio !== undefined) {
      widthCalc = windowWidth * rightPaneWidthRatio;
    }
  }

  return { updateSplitSize, widthCalc };
};
