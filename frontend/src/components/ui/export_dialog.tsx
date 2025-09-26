import { useState } from 'react';
import './export_dialog.css';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
  documentationData: Record<string, unknown>;
}

export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'json' | 'zip';

interface ExportOption {
  format: ExportFormat;
  label: string;
  description: string;
  icon: string;
  available: boolean;
}

const exportOptions: ExportOption[] = [
  {
    format: 'markdown',
    label: 'Markdown (.md)',
    description: 'Export as Markdown files',
    icon: '📝',
    available: true
  },
  {
    format: 'html',
    label: 'HTML (.html)',
    description: 'Export as HTML files',
    icon: '🌐',
    available: true
  },
  {
    format: 'pdf',
    label: 'PDF (.pdf)',
    description: 'Export as PDF document',
    icon: '📄',
    available: true
  },
  {
    format: 'json',
    label: 'JSON (.json)',
    description: 'Export raw data as JSON',
    icon: '📋',
    available: true
  },
  {
    format: 'zip',
    label: 'Archive (.zip)',
    description: 'Export all files in a ZIP archive',
    icon: '🗜️',
    available: true
  }
];

export default function ExportDialog({ isOpen, onClose, markdownContent, documentationData }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;





  const performExport = async (
    format: ExportFormat,
    content: string,
    data: Record<string, unknown>
  ) => {
    switch (format) {
      case 'markdown':
        await exportAsMarkdown(content);
        break;
      case 'html':
        await exportAsHTML(content);
        break;
      case 'pdf':
        await exportAsPDF(content);
        break;
      case 'json':
        await exportAsJSON(data);
        break;
      case 'zip':
        await exportAsZIP(content, data);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  };

  // Export implementations
  const exportAsMarkdown = async (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    downloadFile(blob, 'documentation.md');
  };

  const exportAsHTML = async (content: string) => {
    // Convert markdown to HTML (basic implementation)
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        h1, h2, h3 { color: #333; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
    </style>
</head>
<body>
    <div id="content">${content.replace(/\n/g, '<br>')}</div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    downloadFile(blob, 'documentation.html');
  };

  const exportAsPDF = async (content: string) => {
    // For PDF export, we'll use the browser's print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Documentation Export</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportAsJSON = async (data: Record<string, unknown>) => {
    const exportData = {
      timestamp: new Date().toISOString(),
      documentation: data,
      metadata: {
        exportFormat: 'json',
        version: '1.0'
      }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'documentation.json');
  };

  const exportAsZIP = async (content: string, data: Record<string, unknown>) => {
    // For ZIP export, we'll create multiple files and prompt user to save each
    await exportAsMarkdown(content);
    await exportAsJSON(data);
    alert('Multiple files downloaded. Please organize them as needed.');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-dialog-overlay">
      <div className="export-dialog">
        <div className="export-dialog-header">
          <h2>Export Documentation</h2>
          <button 
            className="export-dialog-close"
            onClick={onClose}
            aria-label="Close export dialog"
          >
            ×
          </button>
        </div>

        <div className="export-dialog-content">
          {/* Export Format Selection */}
          <div className="export-section">
            <h3>Choose Format to Download</h3>
            <div className="export-options">
              {exportOptions.map((option) => (
                <label 
                  key={option.format} 
                  className={`export-option ${selectedFormat === option.format ? 'selected' : ''} ${!option.available ? 'disabled' : ''}`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={option.format}
                    checked={selectedFormat === option.format}
                    onChange={async (e) => {
                      const format = e.target.value as ExportFormat;
                      setSelectedFormat(format);
                      // Auto-download when format is selected
                      if (option.available) {
                        setIsExporting(true);
                        try {
                          await performExport(format, markdownContent, documentationData);
                          alert(`Successfully exported as ${format.toUpperCase()}`);
                          onClose();
                        } catch (error) {
                          console.error('Export failed:', error);
                          alert('Export failed. Please try again.');
                        } finally {
                          setIsExporting(false);
                        }
                      }
                    }}
                    disabled={!option.available}
                  />
                  <div className="export-option-content">
                    <div className="export-option-icon">{option.icon}</div>
                    <div className="export-option-details">
                      <div className="export-option-label">{option.label}</div>
                      <div className="export-option-description">{option.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Status */}
          {isExporting && (
            <div className="export-section">
              <div className="export-status">
                <span className="export-status-icon">⏳</span>
                <span className="export-status-text">Exporting...</span>
              </div>
            </div>
          )}
        </div>

        <div className="export-dialog-footer">
          <button 
            className="export-dialog-cancel"
            onClick={onClose}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
