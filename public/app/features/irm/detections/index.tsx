import { css } from '@emotion/css';
import React, { ReactElement, useState } from 'react';
import { Route, Switch, useParams, useRouteMatch } from 'react-router-dom';

import { GrafanaTheme2 } from '@grafana/data';
import { Button, Card, FilterInput, InlineField, Spinner, Tab, TabsBar, Tag, useStyles2 } from '@grafana/ui';
import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import { Page } from 'app/core/components/Page/Page';

import { useDetections } from '../mock-db';

function DetectorWrapper({ children, isLoading }: { isLoading: boolean; children: ReactElement }) {
  const { path } = useRouteMatch();
  return (
    <Page navId={'irm/respond/detections'}>
      <Page.Contents>
        <div className={css({ marginBottom: '16px' })}>
          <TabsBar>
            <Tab
              label="Detections"
              active={path === '/irm/respond/detections' || path.startsWith('/irm/respond/detections/view')}
              href="/irm/respond/detections"
            />
            <Tab
              label="Scanners"
              active={path.startsWith('/irm/respond/detections/scanners')}
              href="/irm/respond/detections/scanners"
            />
            <Tab
              label="Automation"
              active={path.startsWith('/irm/respond/detections/workflows')}
              href="/irm/respond/detections/workflows"
            />
          </TabsBar>
        </div>
        {isLoading ? <Spinner /> : children}
      </Page.Contents>
    </Page>
  );
}

function DetectionList() {
  const { cardsContainer } = useStyles2(getStyles);
  const [detections, loading] = useDetections();
  const noDetections = (detections?.length ?? -1) === 0;
  const [query, changeQuery] = useState('');
  return (
    <DetectorWrapper isLoading={loading}>
      {noDetections ? (
        <EmptyListCTA
          title="Currently there are no detections"
          buttonLink="irm/respond/detections/new"
          buttonIcon="bell"
          buttonTitle="Create Detector"
          proTip="Detections are potential incidents that need to be investigated by an on-call team"
          proTipLink=""
          proTipLinkTitle=""
          proTipTarget="_blank"
        />
      ) : (
        <>
          <div className="page-action-bar">
            <InlineField grow>
              <FilterInput placeholder="Search detections" value={query} onChange={changeQuery} />
            </InlineField>
          </div>
          <div className={cardsContainer}>
            {detections.map((x) => (
              <Card key={x.id} href={`/irm/respond/detections/view/${x.id}`}>
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
    </DetectorWrapper>
  );
}

export function ScannersList() {
  return (
    <DetectorWrapper isLoading={false}>
      <EmptyListCTA
        title="Currently there are no scanners"
        buttonLink="irm/respond/detections/scanners/new"
        buttonIcon="bell"
        buttonTitle="Create Scanner"
        proTip="Scanners find detections, for human review"
        proTipLink=""
        proTipLinkTitle=""
        proTipTarget="_blank"
      />
    </DetectorWrapper>
  );
}

export function Detection() {
  const { id } = useParams<{ id: string }>();

  return (
    <DetectorWrapper isLoading={false}>
      <div>{id}</div>
    </DetectorWrapper>
  );
}

export default function Detections() {
  return (
    <Switch>
      <Route path="/irm/respond/detections/scanners" component={ScannersList} />
      <Route path="/irm/respond/detections/view/:id" component={Detection} />
      <Route path="/irm/respond/detections" component={DetectionList} />
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
