import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../api/client.js';
import {
  getAnalysisRun,
  getChangeSet,
  getLatestLanguageReport,
  startAnalysisRun,
} from '../api/analysis.js';
import type { AnalysisRun, ChangeSet, LanguageReport } from '../api/analysis-types.js';
import { getProject } from '../api/projects.js';
import { analysisMessageForRunStatus } from '../i18n/index.js';
import { useMessages } from '../i18n/locale.js';

const POLL_INTERVAL_MS = 2000;
const LANGUAGE_REPORT_WAIT_MS = 30_000;

async function waitForLanguageReportAfterSync(
  projectId: string,
  syncCompletedAt: string,
): Promise<LanguageReport> {
  const deadline = Date.now() + LANGUAGE_REPORT_WAIT_MS;

  while (Date.now() < deadline) {
    const report = await getLatestLanguageReport(projectId);
    const matchesCurrentSync =
      report.sync_id === syncCompletedAt ||
      (!report.sync_id && report.detected_at >= syncCompletedAt);
    if (matchesCurrentSync) {
      return report;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('language report not ready after sync');
}

export type AnalysisModalStep = 'idle' | 'languages' | 'changes' | 'running';

function invalidateGraphQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ['fileGraph', projectId] });
}

export function useAnalysis(projectId: string | undefined) {
  const messages = useMessages();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<AnalysisModalStep>('idle');
  const [languageReport, setLanguageReport] = useState<LanguageReport | null>(null);
  const [changeSet, setChangeSet] = useState<ChangeSet | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const previousLanguageKeysRef = useRef<Set<string>>(new Set());
  const previousArtifactKeysRef = useRef<Set<string>>(new Set());

  const runQuery = useQuery({
    queryKey: ['analysisRun', projectId, activeRunId],
    queryFn: () => getAnalysisRun(projectId!, activeRunId!),
    enabled: Boolean(projectId && activeRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'running') {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });

  const beginAfterSync = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      const project = await getProject(projectId);
      if (project.sync_status === 'running') {
        // The status is not final yet; avoid opening modals during a race.
        return;
      }
      const syncCompletedAt = project.last_sync_at;
      if (!syncCompletedAt) {
        setToast(messages.ANALYSIS_LANGUAGE_REPORT_ERROR);
        return;
      }

      const report = await waitForLanguageReportAfterSync(projectId, syncCompletedAt);

      // Recheck because synchronization may have restarted while the report was loading.
      const latest = await getProject(projectId);
      if (latest.sync_status === 'running' || latest.last_sync_at !== syncCompletedAt) {
        return;
      }

      const artifacts = report.artifacts ?? [];
      if (report.languages.length === 0 && artifacts.length === 0) {
        setToast(messages.ANALYSIS_NO_SUPPORTED_INPUTS);
        return;
      }

      setLanguageReport(report);
      setStep('languages');
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch {
      setToast(messages.ANALYSIS_LANGUAGE_REPORT_ERROR);
    }
  }, [messages, projectId, queryClient]);

  const cancelFlow = useCallback(() => {
    if (languageReport) {
      previousLanguageKeysRef.current = new Set(
        languageReport.languages.map((entry) => entry.language),
      );
      previousArtifactKeysRef.current = new Set(
        (languageReport.artifacts ?? []).map((entry) => entry.artifact_type),
      );
    }
    setStep('idle');
    setLanguageReport(null);
    setChangeSet(null);
    setActiveRunId(null);
  }, [languageReport]);

  const confirmLanguages = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      const nextChangeSet = await getChangeSet(projectId);
      setChangeSet(nextChangeSet);
      setStep('changes');
    } catch {
      setToast(messages.ANALYSIS_CHANGE_SET_ERROR);
      cancelFlow();
    }
  }, [cancelFlow, messages.ANALYSIS_CHANGE_SET_ERROR, projectId]);

  const startRunMutation = useMutation({
    mutationFn: async (options?: { forceFull?: boolean }) => {
      if (!projectId) {
        throw new Error('missing context');
      }

      const project = await getProject(projectId);
      if (!project.last_sync_at) {
        throw new Error('missing sync marker');
      }

      const report = await waitForLanguageReportAfterSync(projectId, project.last_sync_at);
      return startAnalysisRun(projectId, {
        language_report_id: report.id,
        confirmed_change_set: true,
        force_full: Boolean(options?.forceFull),
      });
    },
    onSuccess: (run: AnalysisRun) => {
      setStep('running');
      setActiveRunId(run.id);
      void queryClient.invalidateQueries({ queryKey: ['analysisRun', projectId, run.id] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiError ? error.message : messages.ANALYSIS_START_ERROR;
      setToast(message);
      cancelFlow();
    },
  });

  const confirmChanges = useCallback(
    (options?: { forceFull?: boolean }) => {
      startRunMutation.mutate(options);
    },
    [startRunMutation],
  );

  useEffect(() => {
    const run = runQuery.data;
    if (!run || step !== 'running') {
      return;
    }

    if (run.status === 'pending' || run.status === 'running') {
      return;
    }

    if (projectId) {
      invalidateGraphQueries(queryClient, projectId);
    }

    setToast(
      analysisMessageForRunStatus(
        run.status,
        run.last_error_message,
        run.parser_results,
        run.change_set,
      ),
    );
    if (languageReport) {
      previousLanguageKeysRef.current = new Set(
        languageReport.languages.map((entry) => entry.language),
      );
      previousArtifactKeysRef.current = new Set(
        (languageReport.artifacts ?? []).map((entry) => entry.artifact_type),
      );
    }
    setStep('idle');
    setLanguageReport(null);
    setChangeSet(null);
    setActiveRunId(null);
  }, [languageReport, projectId, queryClient, runQuery.data, step]);

  const isParserRunActive =
    step === 'running' ||
    startRunMutation.isPending ||
    runQuery.data?.status === 'pending' ||
    runQuery.data?.status === 'running';

  // Block synchronization and menus while confirmation modals or parsers are active.
  const isAnalysisRunning =
    step === 'languages' || step === 'changes' || isParserRunActive;

  const isFirstReport = previousLanguageKeysRef.current.size === 0;

  return {
    step,
    languageReport,
    changeSet,
    previousLanguageKeys: previousLanguageKeysRef.current,
    previousArtifactKeys: previousArtifactKeysRef.current,
    isFirstReport,
    toast,
    clearToast: () => setToast(null),
    beginAfterSync,
    cancelFlow,
    confirmLanguages,
    confirmChanges,
    isAnalysisRunning,
    /** Actual parser runs only, used by the indicator and graph refresh. */
    isParserRunActive,
    isStartingRun: startRunMutation.isPending,
    activeRun: runQuery.data ?? null,
  };
}
