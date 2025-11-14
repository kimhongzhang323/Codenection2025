import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import { documentationApi } from '../services/documentationApi';
import type { Documentation } from '../types/documentation';
import { ProgressTracker } from './ProgressTracker';

interface DocumentationGeneratorProps {
  gitUrl: string;
  branch?: string;
  onGenerated?: (doc: Documentation) => void;
}

export function DocumentationGenerator({ gitUrl, branch, onGenerated }: DocumentationGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      await documentationApi.generate(gitUrl, branch);
      
      // Wait for generation to complete and fetch the result
      const doc = await documentationApi.getSingle(gitUrl, 'README.md', branch);
      onGenerated?.(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
          Documentation Generator
        </Typography>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating}
          startIcon={isGenerating ? <CircularProgress size={20} /> : undefined}
        >
          {isGenerating ? 'Generating...' : 'Generate Documentation'}
        </Button>
      </Box>

      {error && (
        <Typography color="error.main" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {isGenerating && <ProgressTracker gitUrl={gitUrl} branch={branch} />}
    </Paper>
  );
}