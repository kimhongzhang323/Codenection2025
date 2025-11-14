import { Box, IconButton, Tooltip } from '@mui/material';
import { ContentCopy as ContentCopyIcon, Description as DescriptionIcon } from '@mui/icons-material';
import type { Documentation } from '../types/documentation';

interface DocumentationToolbarProps {
  documentation: Documentation;
  onGenerateTldr: () => void;
  onCopy: () => void;
}

export function DocumentationToolbar({ documentation, onGenerateTldr, onCopy }: DocumentationToolbarProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      <Tooltip title="Generate TL;DR">
        <IconButton onClick={onGenerateTldr} size="small">
          <DescriptionIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Copy Content">
        <IconButton onClick={onCopy} size="small">
          <ContentCopyIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}