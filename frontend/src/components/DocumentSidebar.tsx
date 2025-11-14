import { List, ListItem, ListItemButton, ListItemText, Paper } from '@mui/material';
import { useEffect, useState } from 'react';
import { documentationApi } from '../services/documentationApi';

interface DocumentSidebarProps {
  gitUrl: string;
  branch?: string;
  onDocumentSelect: (path: string) => void;
}

export function DocumentSidebar({ gitUrl, branch, onDocumentSelect }: DocumentSidebarProps) {
  const [documents, setDocuments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await documentationApi.getExtraDocuments(gitUrl, branch);
        setDocuments(docs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      }
    };

    fetchDocuments();
  }, [gitUrl, branch]);

  if (error) {
    return (
      <Paper sx={{ p: 2, color: 'error.main' }}>
        Error: {error}
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: 240, maxWidth: '100%' }}>
      <List>
        {documents.map((doc) => (
          <ListItem key={doc} disablePadding>
            <ListItemButton onClick={() => onDocumentSelect(doc)}>
              <ListItemText primary={doc} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}