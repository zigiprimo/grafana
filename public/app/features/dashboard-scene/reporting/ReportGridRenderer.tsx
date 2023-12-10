import React from 'react';

import { SceneGridItemLike, SceneGridLayout } from '@grafana/scenes';
import { GRID_CELL_HEIGHT, GRID_CELL_VMARGIN, GRID_COLUMN_COUNT } from 'app/core/constants';

import { calcGridItemPosition, PositionParams } from './utils';

interface Props {
  grid: SceneGridLayout;
}

export function ReportGridRenderer({ grid }: Props) {
  const { children } = grid.useState();
  const blocks = getReportPages(children);
  const screenWidth = 1000;

  return (
    <div style={{ position: 'relative' }}>
      {blocks.map((page, index) => (
        <>
          <div key={index} style={getPageStyle(page, screenWidth)}>
            {page.items.map((item, index) => (
              <div key={index} style={getItemStyle(item, screenWidth)}>
                {item.render()}
              </div>
            ))}
          </div>
          {page.pageBreakAfter && (
            <>
              <div style={{ pageBreakAfter: 'always', marginBottom: '16px' }} />
              <div style={{ marginBottom: '16px' }} />
            </>
          )}
        </>
      ))}
    </div>
  );
}

interface ReportPage {
  items: ReportGridItem[];
  h: number;
  pageBreakAfter?: boolean;
}

interface ReportGridItem {
  x: number;
  y: number;
  w: number;
  h: number;
  render: () => React.ReactNode;
}

function getReportPages(children: SceneGridItemLike[]): ReportPage[] {
  const pages: ReportPage[] = [];
  let yShift = 0;
  let currentPage: ReportPage = {
    items: [],
    h: 0,
  };

  pages.push(currentPage);

  for (const gridChild of children) {
    const blockItem: ReportGridItem = {
      x: gridChild.state.x!,
      y: gridChild.state.y! - yShift,
      w: gridChild.state.width!,
      h: gridChild.state.height!,
      render: () => <gridChild.Component model={gridChild} key={gridChild.state.key} />,
    };

    currentPage.items.push(blockItem);

    currentPage.h = Math.max(currentPage.h, blockItem.y + blockItem.h);

    if (currentPage.h > 36) {
      currentPage.pageBreakAfter = true;

      yShift += currentPage.h;

      currentPage = {
        items: [],
        h: 0,
      };

      pages.push(currentPage);
    }
  }

  return pages;
}

function getItemStyle(item: ReportGridItem, screenWidth: number): React.CSSProperties {
  const parmas: PositionParams = getGridParams(screenWidth);
  const position = calcGridItemPosition(parmas, item.x, item.y, item.w, item.h);

  return {
    top: position.top,
    left: position.left,
    width: position.width,
    height: position.height,
    position: 'absolute',
  };
}

function getPageStyle(block: ReportPage, screenWidth: number): React.CSSProperties {
  const parmas: PositionParams = getGridParams(screenWidth);
  const position = calcGridItemPosition(parmas, 0, 0, 0, block.h);

  return {
    height: position.height,
    position: 'relative',
  };
}

function getGridParams(screenWidth: number): PositionParams {
  return {
    margin: [GRID_CELL_VMARGIN, GRID_CELL_VMARGIN],
    containerWidth: screenWidth,
    containerPadding: [0, 0],
    cols: GRID_COLUMN_COUNT,
    rowHeight: GRID_CELL_HEIGHT,
    maxRows: 10000,
  };
}

// function translateSceneYToGridY(screenY: number): number {
//   return Math.ceil(screenY / (GRID_CELL_HEIGHT + GRID_CELL_VMARGIN));
// }
