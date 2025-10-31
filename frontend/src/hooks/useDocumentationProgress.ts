import { useState, useEffect } from 'react';
import { documentationApi } from '../services/documentationApi';
import type { ProgressStatus } from '../types/documentation';

export function useDocumentationProgress(gitUrl: string, branch?: string) {
  const [progress, setProgress] = useState<ProgressStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const pollProgress = async () => {
      try {
        const status = await documentationApi.getProgress(gitUrl, branch);
        if (mounted) {
          setProgress(status);
          if (status.step !== 'complete') {
            setTimeout(pollProgress, 2000); // Poll every 2 seconds
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    };

    if (gitUrl) {
      pollProgress();
    }

    return () => {
      mounted = false;
    };
  }, [gitUrl, branch]);

  return { progress, error };
}