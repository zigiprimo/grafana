import { css } from '@emotion/css';
import React, { ReactElement, useState } from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';

import { GrafanaTheme2 } from '@grafana/data';
import { Button, Card, FilterInput, InlineField, Select, Spinner, Tab, TabsBar, Tag, useStyles2 } from '@grafana/ui';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import { Page } from 'app/core/components/Page/Page';

import { useIncidents } from '../mock-db';

function IncidentWrapper({ children, isLoading }: { isLoading: boolean; children: ReactElement }) {
  const { path } = useRouteMatch();
  return (
    <Page
      navId={'irm/respond/incidents'}
      actions={
        <Select
          options={[
            { label: 'All Teams', value: 'all' },
            { label: 'My Team', value: 'mine' },
          ]}
          value="mine"
          onChange={() => {
            /*todo*/
          }}
        />
      }
    >
      <Page.Contents>
        <div className={css({ marginBottom: '16px' })}>
          <TabsBar>
            <Tab
              label="Incidents"
              active={path === '/irm/respond/incidents' || path.startsWith('/irm/respond/incidents/view')}
              href="/irm/respond/incidents"
            />
            <Tab
              label="Automation"
              active={path.startsWith('/irm/respond/incidents/workflows')}
              href="/irm/respond/incidents/workflows"
            />
          </TabsBar>
        </div>
        {isLoading ? <Spinner /> : children}
      </Page.Contents>
    </Page>
  );
}

function IncidentList() {
  const { cardsContainer } = useStyles2(getStyles);
  const [incidents, loading] = useIncidents();
  const noDetections = (incidents?.length ?? -1) === 0;
  const [query, changeQuery] = useState('');
  return (
    <IncidentWrapper isLoading={loading}>
      {noDetections ? (
        <EmptyListCTA
          title="Currently there are no incidents"
          buttonLink="irm/respond/incidents/new"
          buttonIcon="fire"
          buttonTitle="Declare Incident"
          proTip="Incidents are..."
          proTipLink=""
          proTipLinkTitle=""
          proTipTarget="_blank"
        />
      ) : (
        <>
          <div className="page-action-bar">
            <InlineField grow>
              <FilterInput placeholder="Search incidents" value={query} onChange={changeQuery} />
            </InlineField>
            <Button icon="fire">Declare Incident</Button>
          </div>
          <div className={cardsContainer}>
            {incidents.map((x) => (
              <Card key={x.id} href={`/irm/respond/incidents/view/${x.id}`}>
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
    </IncidentWrapper>
  );
}

function Incident() {
  return (
    <Page>
      <Page.Contents isLoading={false}>Incident</Page.Contents>
    </Page>
  );
}

export default function Incidents() {
  return (
    <Switch>
      <Route path="/irm/respond/incidents/view/:id" component={Incident} />
      <Route path="/irm/respond/incidents" component={IncidentList} />
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
