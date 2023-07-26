import { css } from '@emotion/css';
import React, { ReactElement, useState } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';

import { GrafanaTheme2 } from '@grafana/data';
import { Card, FilterInput, InlineField, Spinner, Tab, TabsBar, Tag, useStyles2 } from '@grafana/ui';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import { Page } from 'app/core/components/Page/Page';

import { useSchedules } from '../mock-db';

function ScheduleWrapper({ children, isLoading }: { isLoading: boolean; children: ReactElement }) {
  const { path } = useRouteMatch();
  return (
    <Page navId={'irm/respond/schedules'}>
      <Page.Contents>
        <div className={css({ marginBottom: '16px' })}>
          <TabsBar>
            <Tab
              label="Schedules"
              active={path === '/irm/respond/schedules' || path.startsWith('/irm/respond/schedules/view')}
              href="/irm/respond/schedules"
            />
            <Tab
              label="Automation"
              active={path.startsWith('/irm/respond/schedules/workflows')}
              href="/irm/respond/schedules/workflows"
            />
          </TabsBar>
        </div>
        {isLoading ? <Spinner /> : children}
      </Page.Contents>
    </Page>
  );
}

function ScheduleList() {
  const { cardsContainer } = useStyles2(getStyles);
  const [schedules, loading] = useSchedules();
  const noDetections = (schedules?.length ?? -1) === 0;
  const [query, changeQuery] = useState('');
  return (
    <ScheduleWrapper isLoading={loading}>
      {noDetections ? (
        <EmptyListCTA
          title="Currently there are no schedules"
          buttonLink="irm/respond/schedules/new"
          buttonIcon="fire"
          buttonTitle="Create Schedule"
          proTip="Schedule SREs to an on-call schedule so there is always someone to look into new detections."
          proTipLink=""
          proTipLinkTitle=""
          proTipTarget="_blank"
        />
      ) : (
        <>
          <div className="page-action-bar">
            <InlineField grow>
              <FilterInput placeholder="Search schedules" value={query} onChange={changeQuery} />
            </InlineField>
          </div>
          <div className={cardsContainer}>
            {schedules.map((x) => (
              <Card key={x.id} href={`/irm/respond/schedules/view/${x.id}`}>
                <Card.Heading>{x.description}</Card.Heading>
                <Card.Meta>
                  <span>
                    <span>ID: {x.id}</span>
                  </span>
                  {x.source == null ? null : <Tag key="default-tag" name={x.source} />}
                </Card.Meta>
              </Card>
            ))}
          </div>
        </>
      )}
    </ScheduleWrapper>
  );
}

function Schedule() {
  return (
    <Page navId="irm/respond/schedules/view/:id">
      <Page.Contents isLoading={false}>Schedule</Page.Contents>
    </Page>
  );
}

export default function Schedules() {
  return (
    <Switch>
      <Route path="/irm/respond/schedules/view/:id" component={Schedule} />
      <Route path="/irm/respond/schedules" component={ScheduleList} />
    </Switch>
  );
}

function getStyles(_theme: GrafanaTheme2) {
  return {
    cardsContainer: css`
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
    `,
  };
}
