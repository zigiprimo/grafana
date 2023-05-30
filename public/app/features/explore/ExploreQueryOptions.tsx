import { css } from '@emotion/css';
import React from 'react';

import { intervalToMs } from '@grafana/data/src/datetime/rangeutil';
import { FieldValidationMessage, InlineFormLabel, Input, useTheme2 } from '@grafana/ui';
import { QueryOperationRow } from 'app/core/components/QueryOperationRow/QueryOperationRow';
import { ExploreId } from 'app/types/explore';
import { useDispatch } from 'app/types/store';

import { changeQueryOptions } from './state/query';

type Props = {
  exploreId: ExploreId;
};
export const ExploreQueryOptions: React.FC<Props> = ({ exploreId }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [interval, setInterval] = React.useState('');
  const [valid, setValid] = React.useState(true);
  const theme = useTheme2();
  const dispatch = useDispatch();

  const onChangeQueryOptions = (event: React.FormEvent<HTMLInputElement>) => {
    const interval = event.currentTarget.value;
    setInterval(interval);
    try {
      if (interval !== '') {
        intervalToMs(interval);
      }
      dispatch(changeQueryOptions(exploreId, { interval }));
      setValid(true);
    } catch (e) {
      dispatch(changeQueryOptions(exploreId, { interval: '' }));
      setValid(false);
    }
  };

  const renderIntervalOption = () => {
    return (
      <>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel
              width={9}
              tooltip={
                <>
                  Recommended to be set to write frequency, for example <code>1m</code> if your data is written every
                  minute. If not set, Grafana will try to automatically adjust the interval based on the time range.
                </>
              }
            >
              Interval
            </InlineFormLabel>
            <div>
              <Input
                type="text"
                className="width-6"
                placeholder={'auto'}
                spellCheck={false}
                defaultValue={interval}
                invalid={!valid}
                onChange={onChangeQueryOptions}
              />
              {!valid && (
                <FieldValidationMessage>Interval is not valid and it will not be used.</FieldValidationMessage>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className={css`
        margin-bottom: -${theme.spacing(2)}};
      `}
    >
      <QueryOperationRow
        id="Query options"
        index={0}
        title="Query options"
        headerElement={
          <div
            className={css`
              margin-left: ${theme.spacing(2)};
              font-size: ${theme.typography.size.sm};
              color: ${theme.colors.text.disabled};
              margin-right: ${theme.spacing(1)};
            `}
          >
            {`${interval !== '' && valid ? `Interval: ${interval}` : ''}`}
          </div>
        }
        isOpen={isOpen}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
      >
        {renderIntervalOption()}
      </QueryOperationRow>
    </div>
  );
};
