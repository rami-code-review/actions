import * as core from '@actions/core';
import * as github from '@actions/github';
import { RamiClient, StatusResponse } from './api';

const API_URL = 'https://rami.reviews';

async function run(): Promise<void> {
  try {
    const failOn = core.getInput('fail_on') || 'blocking';

    // Get PR number from GitHub context
    const prNumber = github.context.payload.pull_request?.number;
    if (!prNumber) {
      throw new Error(
        'Could not determine PR number. This action must run on pull_request events.'
      );
    }

    core.info(`Checking review status for PR #${prNumber}...`);
    core.info(`Fail on: ${failOn}`);

    const oidcToken = await core.getIDToken('https://rami.reviews');

    const client = new RamiClient(API_URL, oidcToken);
    const response = await client.status({ pr_number: prNumber, fail_on: failOn });

    setOutputs(response);

    core.info(`Review completed: ${response.summary}`);

    outputAnnotations(response);

    if (response.status === 'blocked') {
      // Register callback for automatic re-trigger when review becomes clean
      try {
        const callbackResponse = await client.registerCallback({ pr_number: prNumber });
        if (callbackResponse.registered) {
          core.info('Registered for automatic re-trigger when review becomes clean');
        }
      } catch (callbackError) {
        // Log but don't fail - callback registration is best-effort
        core.warning(`Failed to register callback: ${callbackError}`);
      }
      core.setFailed(`Review blocked: ${response.outputs.blocking_count} blocking issue(s) found`);
    } else if (response.status === 'error') {
      core.setFailed(`Review failed: ${response.error}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

function setOutputs(response: StatusResponse): void {
  core.setOutput('status', response.outputs.status);
  core.setOutput('total_issues', response.outputs.total_issues);
  core.setOutput('blocking_count', response.outputs.blocking_count);
  core.setOutput('high_count', response.outputs.high_count);
  core.setOutput('medium_count', response.outputs.medium_count);
  core.setOutput('low_count', response.outputs.low_count);
  core.setOutput('files_reviewed', response.outputs.files_reviewed);
  core.setOutput('review_url', response.outputs.review_url);
}

function outputAnnotations(response: StatusResponse): void {
  if (!response.issues || response.issues.length === 0) {
    return;
  }

  for (const issue of response.issues) {
    const severity = issue.severity?.toLowerCase() || 'warning';
    const properties: core.AnnotationProperties = {
      file: issue.file_path,
      startLine: issue.line_number,
      title: `[${issue.severity}] ${issue.category}`,
    };

    const message = `${issue.description}\n\nRisk: ${issue.risk}\nFix: ${issue.fix}`;

    if (severity === 'blocking' || severity === 'critical') {
      core.error(message, properties);
    } else {
      core.warning(message, properties);
    }
  }
}

run();
