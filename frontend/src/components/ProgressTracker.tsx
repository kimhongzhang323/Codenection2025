import { Box, LinearProgress, Typography } from '@mui/material';
import { useDocumentationProgress } from '../hooks/useDocumentationProgress';

interface ProgressTrackerProps {
  gitUrl: string;
  branch?: string;
}

export function ProgressTracker({ gitUrl, branch }: ProgressTrackerProps) {
  const { progress, error } = useDocumentationProgress(gitUrl, branch);

  if (error) {
    return (
      <Box sx={{ color: 'error.main', mt: 2 }}>
        <Typography variant="body2">Error: {error}</Typography>
      </Box>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2">{progress.message}</Typography>
        <Typography variant="body2">{Math.round(progress.progress)}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={progress.progress} />
    </Box>
  );
}