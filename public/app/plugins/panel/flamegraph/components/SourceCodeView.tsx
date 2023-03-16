import { StreamLanguage } from '@codemirror/language';
import { go } from '@codemirror/legacy-modes/mode/go';
import { EditorView, gutter, GutterMarker, lineNumbers, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { css, cx } from '@emotion/css';
import CodeMirror, { minimalSetup, ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { uniq } from 'lodash';
import React, { createRef, useEffect, useMemo, useState } from 'react';

import { createTheme, DataFrame, Field, getDisplayProcessor } from '@grafana/data';
// import { getContrastRatio } from '@grafana/data/src/themes/colorManipulator';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { useAppNotification } from 'app/core/copy/appNotification';

import { PhlareDataSource } from '../../../datasource/phlare/datasource';
// import { CodeLocation } from '../../../datasource/phlare/types';
import { quantizeScheme } from '../../heatmap/palettes';

import { oneDarkGrafana } from './one-dark-grafana';
import { SampleUnit } from './types';

// import { Item } from './FlameGraph/dataTransform';

const GutterHeaders = [
  {
    label: '',
    // label: 'Line',
    // background: 'red',
    // color: 'white',
  },

  // narrow cm-foldGutter (ignored)
  {
    label: '',
    // background: '',
    // color: '',
  },

  {
    label: 'Self',
    // background: 'green',
    // color: 'white',
  },
  {
    label: 'Total',
    // background: 'purple',
    // color: 'white',
  },
];

const gutterHeadersPlugin = ViewPlugin.fromClass(
  class {
    doms: HTMLDivElement[] = [];

    constructor(view: EditorView) {
      GutterHeaders.forEach((props) => {
        let dom = document.createElement('div');

        dom.textContent = props.label;

        Object.assign(dom.style, {
          // background: props.background,
          // color: props.color,
          position: 'absolute',
          top: '0',
          zIndex: '1',
          textAlign: 'center',
          translate: '0 -100%',
          padding: '5px',
        });

        view.dom.appendChild(dom);
        this.doms.push(dom);
      });
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        const gutters = update.view.dom.querySelectorAll('.cm-gutter')!;

        let left = 0;

        gutters.forEach((el, i) => {
          let gutterRect = el.getBoundingClientRect();

          Object.assign(this.doms[i].style, {
            left: left + 'px',
            width: gutterRect.width + 'px',
          });

          left += gutterRect.width;
        });
      }
    }

    destroy() {
      this.doms.forEach((el) => el.remove());
    }
  }
);

const heatColors = quantizeScheme(
  { steps: 32, exponent: 1, reverse: true, fill: '#0000', scheme: 'YlOrRd' },
  createTheme()
);

const heatClasses = heatColors.map((color) => {
  // why is the range of this fn 1-21?
  // let contrast = getContrastRatio('#000', color);

  return cx(
    css({
      // backgroundColor: color,
      // color: contrast < 17 ? '#fff' : '#000',
      color: color + ' !important',
    })
  );
});

const valueGutterClass = cx(
  css({
    background: '#ffc10724',
    minWidth: 80,
    textAlign: 'right',
  })
);

const selfGutterClass = cx(
  css({
    background: '#00bcd42e',
    minWidth: 80,
    textAlign: 'right',
  })
);

class HeatMarker extends GutterMarker {
  rawValue: string;

  constructor(rawValue: string, heatFactor: number) {
    super();
    this.rawValue = rawValue;

    // console.log(heatFactor);

    const heatColorIdx = Math.floor(heatFactor * (heatClasses.length - 1));

    this.elementClass = heatClasses[heatColorIdx];
  }

  toDOM() {
    return document.createTextNode(this.rawValue);
  }
}

// (excluding root)
export type GloblDataRanges = {
  value: [min: number, max: number];
  self: [min: number, max: number];
};

interface Props {
  datasource: PhlareDataSource;
  locationIdx?: number;
  fileName?: string;
  data: DataFrame;
  globalDataRanges: GloblDataRanges;
  getLabelValue: (label: string | number) => string;
}

export function SourceCodeView(props: Props) {
  const { datasource, locationIdx, data, globalDataRanges, getLabelValue } = props;
  const [source, setSource] = useState<string>('');
  const [sourceTotalLines, setSourceTotalLines] = useState<number>(0);
  const editorRef = createRef<ReactCodeMirrorRef>();
  const theme = useTheme2();
  const styles = useStyles2(getStyles);

  const { lineData, valueData, selfData, fileNameData, fileNameEnum, labelData, valueField, selfField } =
    useMemo(() => {
      let fileNameField = data.fields.find((f) => f.name === 'fileName')!;
      let labelField = data.fields.find((f) => f.name === 'label')!;

      return {
        fileNameEnum: fileNameField.config.type!.enum?.text!,
        fileNameData: fileNameField.values.toArray(),

        // labelEnum: labelField.config.type!.enum?.text!,
        labelData: labelField.values.toArray(),

        lineData: data.fields.find((f) => f.name === 'line')!.values.toArray(),
        valueData: data.fields.find((f) => f.name === 'value')!.values.toArray(),
        selfData: data.fields.find((f) => f.name === 'self')!.values.toArray(),

        valueField: data.fields.find((f) => f.name === 'value')!,
        selfField: data.fields.find((f) => f.name === 'self')!,
      };
    }, [data]);

  // these are the field.values idxs of stuff in this file
  const dataIdxs = useMemo(() => {
    let idxs = [];

    let fileIdx = locationIdx
      ? fileNameData[locationIdx]
      : // We have both filename and func name in the fileName prop
        fileNameEnum.findIndex((val) => val === props.fileName!.split('|')[0]);

    for (let i = 0; i < fileNameData.length; i++) {
      if (fileNameData[i] === fileIdx) {
        idxs.push(i);
      }
    }

    return idxs;
  }, [locationIdx, fileNameData, props.fileName, fileNameEnum]);

  const byLineData = useMemo(() => {
    let byLineData = {
      value: new Map<number, number>(),
      self: new Map<number, number>(),
    };

    for (let i = 0; i < dataIdxs.length; i++) {
      let idx = dataIdxs[i];
      let line = lineData[idx];
      byLineData.value.set(line, valueData[idx]);
      byLineData.self.set(line, selfData[idx]);
    }

    return byLineData;
  }, [dataIdxs, lineData, valueData, selfData]);

  // this can't be outside cause needs data to be in scope
  // TODO: investigate if CM6 plugins can accept opts into their constructors (like Rollup plugins)
  const miniMapPlugin = ViewPlugin.fromClass(
    class {
      dom: HTMLDivElement;

      constructor(view: EditorView) {
        let dom = document.createElement('div');

        Object.assign(dom.style, {
          background: '#61616138',
          position: 'absolute',
          height: '100%',
          width: '20px',
          top: '0',
          right: '0',
          pointerEvents: 'none',
        });

        view.dom.appendChild(dom);
        this.dom = dom;
      }

      update(update: ViewUpdate) {
        let editorHeight = update.view.dom.getBoundingClientRect().height;

        let totalLines = update.state.doc.lines;

        let sortedLineNums = [...byLineData.value.keys()].sort((a, b) => a - b);

        // not good: creates dom element for every marked line, should use bg gradient with hard stops (see below)
        sortedLineNums.forEach((lineNum) => {
          let rawValue = byLineData.value.get(lineNum) ?? 0;

          if (rawValue > 0) {
            let line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.top = (lineNum / totalLines) * editorHeight + 'px';
            line.style.height = '1px';
            line.style.width = '20px';

            let heatFactor = (rawValue - minRawVal) / (maxRawVal - minRawVal);
            const heatColorIdx = Math.floor(heatFactor * (heatColors.length - 1));

            line.style.background = heatColors[heatColorIdx];

            this.dom.appendChild(line);
          }
        });
      }

      destroy() {
        this.dom.remove();
      }
    }
  );

  const [minRawVal, maxRawVal] = globalDataRanges.value;
  const [minRawSelf, maxRawSelf] = globalDataRanges.self;

  // console.log({
  //   minRawVal,
  //   maxRawVal,
  // });

  const valueGutter = gutter({
    class: valueGutterClass,

    // TODO: optimize, this is recreated each time you navigate through source doc
    // should switch to the static gutter.markers: API
    lineMarker(view, line) {
      let lineNum = view.state.doc.lineAt(line.from).number;
      let rawValue = byLineData.value.get(lineNum) ?? 0;

      if (rawValue === 0) {
        return null;
      }

      let heatFactor = (rawValue - minRawVal) / (maxRawVal - minRawVal);
      const unitValue = getUnitValue(valueField, rawValue);
      return new HeatMarker(unitValue, heatFactor);
    },
  });

  const selfGutter = gutter({
    class: selfGutterClass,

    // TODO: optimize, this is recreated each time you navigate through source doc
    // should switch to the static gutter.markers: API
    lineMarker(view, line) {
      let lineNum = view.state.doc.lineAt(line.from).number;
      let rawValue = byLineData.self.get(lineNum) ?? 0;

      if (rawValue === 0) {
        return null;
      }

      let heatFactor = (rawValue - minRawSelf) / (maxRawSelf - minRawSelf);
      const unitValue = getUnitValue(selfField, rawValue);
      return new HeatMarker(unitValue, heatFactor);
    },
  });

  const notifyApp = useAppNotification();

  useEffect(() => {
    (async () => {
      try {
        const sourceCode = await datasource.getSource(
          locationIdx ? fileNameEnum[fileNameData[locationIdx]] : props.fileName!.split('|')[0],
          locationIdx ? getLabelValue(labelData[locationIdx]) : props.fileName!.split('|')[1]
        );
        setSource(sourceCode);
      } catch (e: any) {
        notifyApp.error('Error getting source file', e.message || e.data?.error);
      }
    })();
  }, [datasource, locationIdx, fileNameEnum, labelData, fileNameData, getLabelValue, notifyApp, props.fileName]);

  const getUnitValue = (field: Field, value: number) => {
    const processor = getDisplayProcessor({ field, theme });
    const displayValue = processor(value);
    let unitValue = displayValue.text + displayValue.suffix;

    switch (field.config.unit) {
      case SampleUnit.Bytes:
        break;
      case SampleUnit.Nanoseconds:
        break;
      default:
        if (!displayValue.suffix) {
          // Makes sure we don't show 123undefined or something like that if suffix isn't defined
          unitValue = displayValue.text;
        }
        break;
    }

    return unitValue;
  };

  useEffect(() => {
    if (!source || !locationIdx) {
      return;
    }

    try {
      const line = editorRef.current?.view?.state.doc.line(lineData[locationIdx]);
      setSourceTotalLines(editorRef.current?.view?.state.doc.lines || 0);
      editorRef.current?.view?.dispatch({
        selection: { anchor: line?.from || 0 },
        scrollIntoView: true,
        effects: EditorView.scrollIntoView(line?.from || 0, { y: 'center' }),
      });
    } catch (e) {
      console.error('Error scrolling to line', e);
    }
  }, [source, lineData, editorRef, locationIdx]);

  let titleName = locationIdx ? fileNameEnum[fileNameData[locationIdx]] : props.fileName!.split('|')[0];
  if (titleName.indexOf('github.com') !== -1) {
    titleName = 'github.com' + titleName.split('github.com')[1];
  } else if (titleName.indexOf('/go/') !== -1) {
    titleName = '/go/' + titleName.split('/go/')[1];
  }

  const linesWithValues: number[] = [];
  byLineData.self.forEach((val, key) => {
    if (val > 0) {
      linesWithValues.push(key);
    }
  });
  byLineData.value.forEach((val, key) => {
    if (val > 0) {
      linesWithValues.push(key);
    }
  });
  const uniqueLinesWithValues = uniq(linesWithValues);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>{`${titleName} | ${uniqueLinesWithValues.length}/${sourceTotalLines} profiled lines (${(
          (uniqueLinesWithValues.length * 100) /
          (sourceTotalLines || 1)
        ).toPrecision(2)}%)`}</div>
      </div>
      <CodeMirror
        value={source}
        height={'800px'}
        extensions={[
          StreamLanguage.define(go),
          minimalSetup(),
          lineNumbers(),
          selfGutter,
          valueGutter,
          gutterHeadersPlugin,
          miniMapPlugin,
        ]}
        readOnly={true}
        editable={false}
        theme={theme.name === 'Dark' ? oneDarkGrafana : 'light'}
        ref={editorRef}
      />
    </div>
  );
}

const getStyles = () => ({
  header: css`
    margin-top: 8px;
    margin-bottom: 30px;
    text-align: center;
  `,
  container: css`
    display: flex;
    flex: 1;
    flex-direction: column;
  `,
});
