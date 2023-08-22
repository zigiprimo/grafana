import React, { useMemo, useState } from 'react';

import { selectors } from '@grafana/e2e-selectors';
import { Stack } from '@grafana/experimental';
import { Button, Checkbox, Form, TextArea } from '@grafana/ui';
import { DashboardModel } from 'app/features/dashboard/state';

import { AiGenerate } from '../../DashGPT/AiGenerate';
import { onGenerateTextWithAi, regenerateResponseWithFeedback, SPECIAL_DONE_TOKEN } from '../../DashGPT/utils';
import { Diffs } from '../../VersionHistory/utils';
import { SaveDashboardData, SaveDashboardOptions } from '../types';

interface FormDTO {
  message: string;
}

export type SaveProps = {
  dashboard: DashboardModel; // original
  isLoading: boolean;
  saveModel: SaveDashboardData; // already cloned
  onCancel: () => void;
  onSuccess: () => void;
  onSubmit?: (clone: DashboardModel, options: SaveDashboardOptions, dashboard: DashboardModel) => Promise<any>;
  options: SaveDashboardOptions;
  onOptionsChange: (opts: SaveDashboardOptions) => void;
  diff: Diffs;
};

let llmReplyDescription = '';

let enabled = false;

let descriptionHistory: string[] = [];

export const SaveDashboardForm = ({
  dashboard,
  isLoading,
  saveModel,
  options,
  onSubmit,
  onCancel,
  onSuccess,
  onOptionsChange,
  diff,
}: SaveProps) => {
  const hasTimeChanged = useMemo(() => dashboard.hasTimeChanged(), [dashboard]);
  const hasVariableChanged = useMemo(() => dashboard.hasVariableValuesChanged(), [dashboard]);

  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const setPanelDescription = (description: string) => {
    const input = document.getElementById('description-text-area') as HTMLInputElement;
    input.value = description;
    onOptionsChange({
      ...options,
      message: description,
    });
  };

  const setLlmReply = (reply: string, subject: string) => {
    if (reply.indexOf(SPECIAL_DONE_TOKEN) >= 0) {
      reply = reply.replace(SPECIAL_DONE_TOKEN, '');
      reply = reply.replace(/"/g, '');

      setGeneratingDescription(false);
      setPanelDescription(reply);
      if (descriptionHistory.indexOf(reply) === -1 && reply !== '') {
        descriptionHistory.push(reply);
      }

      return;
    }

    reply = reply.replace(/"/g, '');

    setGeneratingDescription(true);

    llmReplyDescription = reply;
    if (enabled && llmReplyDescription !== '') {
      setPanelDescription(llmReplyDescription);
    }
  };

  const llmGenerate = () => {
    const payload = getGeneratePayloadForDiffDescription();

    onGenerateTextWithAi(payload, 'diffChanges', setLlmReply)
      .then((response) => {
        enabled = response.enabled;
      })
      .catch((e) => console.log('error', e.message));
  };

  const llmReGenerate = async (
    subject: string,
    originalResponse: string,
    feedback: string,
    historyItemIndex: number
  ): Promise<boolean> => {
    const payload = getGeneratePayloadForDiffDescription();

    let updatedResponse: string | { enabled: any } = await regenerateResponseWithFeedback(
      payload,
      subject,
      originalResponse,
      feedback
    );

    if (typeof updatedResponse === 'string') {
      updatedResponse = updatedResponse.replace(SPECIAL_DONE_TOKEN, '');
      updatedResponse = updatedResponse.replace(/"/g, '');

      descriptionHistory[historyItemIndex] = updatedResponse;
    }

    return true;
  };

  function getGeneratePayloadForDiffDescription() {
    return diff;
  }

  return (
    <Form
      onSubmit={async (data: FormDTO) => {
        if (!onSubmit) {
          return;
        }
        setSaving(true);
        options = { ...options, message: data.message };
        const result = await onSubmit(saveModel.clone, options, dashboard);
        if (result.status === 'success') {
          if (options.saveVariables) {
            dashboard.resetOriginalVariables();
          }
          if (options.saveTimerange) {
            dashboard.resetOriginalTime();
          }
          onSuccess();
        } else {
          setSaving(false);
        }
      }}
    >
      {({ register, errors }) => {
        const messageProps = register('message');
        return (
          <Stack gap={2} direction="column" alignItems="flex-start">
            {hasTimeChanged && (
              <Checkbox
                checked={!!options.saveTimerange}
                onChange={() =>
                  onOptionsChange({
                    ...options,
                    saveTimerange: !options.saveTimerange,
                  })
                }
                label="Save current time range as dashboard default"
                aria-label={selectors.pages.SaveDashboardModal.saveTimerange}
              />
            )}
            {hasVariableChanged && (
              <Checkbox
                checked={!!options.saveVariables}
                onChange={() =>
                  onOptionsChange({
                    ...options,
                    saveVariables: !options.saveVariables,
                  })
                }
                label="Save current variable values as dashboard default"
                aria-label={selectors.pages.SaveDashboardModal.saveVariables}
              />
            )}
            <AiGenerate
              text={generatingDescription ? 'Generating description' : 'Generate it with AI'}
              onClick={() => llmGenerate()}
              history={descriptionHistory}
              applySuggestion={(suggestion: string) => {
                onOptionsChange({
                  ...options,
                  message: suggestion,
                });
                messageProps.onChange(suggestion);
              }}
              llmReGenerate={llmReGenerate}
              type="diffChanges"
              loading={generatingDescription}
            />
            <TextArea
              {...messageProps}
              id="description-text-area"
              aria-label="message"
              value={options.message}
              onChange={(e) => {
                onOptionsChange({
                  ...options,
                  message: e.currentTarget.value,
                });
                messageProps.onChange(e);
              }}
              placeholder="Add a note to describe your changes."
              autoFocus
              rows={5}
            />
            <Stack alignItems="center">
              <Button variant="secondary" onClick={onCancel} fill="outline">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!saveModel.hasChanges || isLoading}
                icon={saving ? 'fa fa-spinner' : undefined}
                aria-label={selectors.pages.SaveDashboardModal.save}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
              {!saveModel.hasChanges && <div>No changes to save</div>}
            </Stack>
          </Stack>
        );
      }}
    </Form>
  );
};
