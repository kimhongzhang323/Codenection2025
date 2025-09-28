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
    // Convert markdown to HTML with better formatting
    const convertMarkdownToHTML = (markdown: string): string => {
      let html = markdown;
      
      // Headers
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      
      // Bold and Italic
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Code blocks
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // Links
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      
      // Lists
      html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
      html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
      html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
      
      // Wrap consecutive list items in ul/ol tags
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
      
      // Blockquotes
      html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
      
      // Line breaks
      html = html.replace(/\n\n/g, '</p><p>');
      html = html.replace(/\n/g, '<br>');
      
      // Wrap in paragraphs
      html = '<p>' + html + '</p>';
      
      return html;
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Export</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px; 
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 { 
            color: #2c3e50; 
            margin-top: 2rem; 
            margin-bottom: 1rem;
        }
        h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
        pre { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto; 
            border: 1px solid #e9ecef;
        }
        code { 
            background: #f1f3f4; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: 'Courier New', monospace;
        }
        blockquote { 
            border-left: 4px solid #3498db; 
            margin: 1rem 0; 
            padding-left: 20px; 
            color: #7f8c8d; 
            font-style: italic;
        }
        ul, ol { margin: 1rem 0; padding-left: 2rem; }
        li { margin: 0.5rem 0; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        p { margin: 1rem 0; }
        .export-header {
            text-align: center;
            padding: 2rem 0;
            border-bottom: 2px solid #ecf0f1;
            margin-bottom: 2rem;
        }
        .export-footer {
            text-align: center;
            padding: 2rem 0;
            border-top: 1px solid #ecf0f1;
            margin-top: 2rem;
            color: #7f8c8d;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="export-header">
        <h1>Documentation Export</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div id="content">${convertMarkdownToHTML(content)}</div>
    
    <div class="export-footer">
        <p>This documentation was exported from your project repository.</p>
    </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    downloadFile(blob, 'documentation.html');
  };

  const exportAsPDF = async (content: string) => {
    // Convert markdown to HTML for better PDF formatting
    const convertMarkdownToHTML = (markdown: string): string => {
      let html = markdown;
      
      // Headers
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      
      // Bold and Italic
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Code blocks
      html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // Links
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      
      // Lists
      html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
      html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
      html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
      
      // Wrap consecutive list items in ul tags
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
      
      // Blockquotes
      html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
      
      // Line breaks
      html = html.replace(/\n\n/g, '</p><p>');
      html = html.replace(/\n/g, '<br>');
      
      // Wrap in paragraphs
      html = '<p>' + html + '</p>';
      
      return html;
    };

    // Create a print-optimized window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Documentation Export - PDF</title>
            <style>
              @page {
                margin: 1in;
                size: A4;
              }
              
              body { 
                font-family: 'Times New Roman', serif; 
                line-height: 1.5; 
                color: #000;
                margin: 0;
                padding: 0;
              }
              
              h1, h2, h3, h4, h5, h6 { 
                color: #000; 
                page-break-after: avoid;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
              }
              
              h1 { 
                font-size: 24pt; 
                border-bottom: 2px solid #000; 
                padding-bottom: 8pt;
                page-break-before: always;
              }
              
              h2 { 
                font-size: 18pt; 
                border-bottom: 1px solid #666; 
                padding-bottom: 4pt;
              }
              
              h3 { font-size: 14pt; }
              
              p { 
                margin: 0.5em 0; 
                text-align: justify;
              }
              
              pre { 
                background: #f5f5f5; 
                padding: 10pt; 
                border: 1px solid #ccc;
                font-family: 'Courier New', monospace;
                font-size: 9pt;
                page-break-inside: avoid;
                margin: 1em 0;
              }
              
              code { 
                background: #f0f0f0; 
                padding: 2pt 4pt; 
                font-family: 'Courier New', monospace;
                font-size: 9pt;
              }
              
              blockquote { 
                border-left: 4pt solid #666; 
                margin: 1em 0; 
                padding-left: 15pt; 
                color: #333; 
                font-style: italic;
              }
              
              ul, ol { 
                margin: 0.5em 0; 
                padding-left: 20pt; 
              }
              
              li { 
                margin: 0.25em 0; 
              }
              
              a { 
                color: #000; 
                text-decoration: underline;
              }
              
              .pdf-header {
                text-align: center;
                border-bottom: 2pt solid #000;
                padding-bottom: 15pt;
                margin-bottom: 20pt;
              }
              
              .pdf-footer {
                position: fixed;
                bottom: 0;
                width: 100%;
                text-align: center;
                font-size: 8pt;
                color: #666;
                border-top: 1pt solid #ccc;
                padding-top: 5pt;
              }
              
              @media print {
                body { 
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact;
                }
                
                .page-break { 
                  page-break-before: always; 
                }
                
                .no-break { 
                  page-break-inside: avoid; 
                }
                
                .pdf-footer {
                  position: fixed;
                  bottom: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="pdf-header">
              <h1>Documentation Export</h1>
              <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <div class="content">
              ${convertMarkdownToHTML(content)}
            </div>
            
            <div class="pdf-footer">
              <p>Page <span id="pageNumber"></span> | Documentation Export</p>
            </div>
            
            <script>
              window.addEventListener('load', function() {
                // Auto-print after content loads
                setTimeout(() => {
                  window.print();
                }, 500);
              });
              
              // Close window after printing (if user cancels or completes)
              window.addEventListener('afterprint', function() {
                setTimeout(() => {
                  window.close();
                }, 1000);
              });
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert('PDF export requires popup permissions. Please allow popups for this site and try again.');
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
    // Since we don't have a ZIP library, we'll create a structured export
    // by downloading multiple related files with clear naming
    
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const baseName = `documentation-export-${timestamp}`;
    
    // Export markdown file
    const markdownBlob = new Blob([content], { type: 'text/markdown' });
    downloadFile(markdownBlob, `${baseName}.md`);
    
    // Export JSON metadata
    const exportData = {
      timestamp: new Date().toISOString(),
      documentation: data,
      content: content,
      metadata: {
        exportFormat: 'zip-collection',
        version: '1.0',
        files: ['markdown', 'json', 'html']
      }
    };
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadFile(jsonBlob, `${baseName}-metadata.json`);
    
    // Export HTML version
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between downloads
    await exportAsHTML(content);
    
    // Create a README for the export
    const readmeContent = `# Documentation Export
    
This folder contains exported documentation files:

## Files Included:
- \`${baseName}.md\` - Main documentation in Markdown format
- \`${baseName}-metadata.json\` - Export metadata and structured data
- \`documentation.html\` - Formatted HTML version

## Export Details:
- Export Date: ${new Date().toLocaleDateString()}
- Export Time: ${new Date().toLocaleTimeString()}
- Content Length: ${content.length} characters
- Format: Multi-file collection (ZIP alternative)

To use these files, organize them in a single folder for easy access.
`;
    
    const readmeBlob = new Blob([readmeContent], { type: 'text/markdown' });
    await new Promise(resolve => setTimeout(resolve, 200)); // Delay between downloads
    downloadFile(readmeBlob, `${baseName}-README.md`);
    
    alert(`Documentation exported as multiple files! \n\nFiles downloaded:\n- ${baseName}.md\n- ${baseName}-metadata.json\n- documentation.html\n- ${baseName}-README.md\n\nOrganize these files in a single folder for easy access.`);
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
