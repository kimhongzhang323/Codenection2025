import React from 'react';
import './view_code_dialog.css';
import { CodeIcon } from '../icons/code_icon';
import { GithubIcon } from '../icons/github_icon';
import { GlobeIcon } from '../icons/globe_icon';
import { XIcon } from '../icons/close_icon';

interface ViewCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repoUrl?: string;
}

const ViewCodeDialog: React.FC<ViewCodeDialogProps> = ({ isOpen, onClose, repoUrl }) => {
  if (!isOpen) return null;

  const handleIDEOpen = () => {
    if (repoUrl) {
      // Try to open in VS Code first (if vscode:// protocol is available)
      const vscodeUrl = `vscode://vscode.git/clone?url=${encodeURIComponent(repoUrl)}`;
      window.location.href = vscodeUrl;
      
      // Fallback: Open GitHub desktop if available
      setTimeout(() => {
        const githubDesktopUrl = `github-windows://openRepo/${repoUrl}`;
        window.location.href = githubDesktopUrl;
      }, 1000);
    }
    onClose();
  };

  const handleOnlineViewer = () => {
    if (repoUrl) {
      // Use GitHub1s for online viewing (VS Code in browser)
      const github1sUrl = repoUrl.replace('github.com', 'github1s.com');
      window.open(github1sUrl, '_blank');
    }
    onClose();
  };

  const handleGitHubOpen = () => {
    if (repoUrl) {
      window.open(repoUrl, '_blank');
    }
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="view-code-dialog-overlay" onClick={handleOverlayClick}>
      <div className="view-code-dialog">
        <div className="view-code-dialog-header">
          <div className="view-code-dialog-title">
            <CodeIcon size={20} />
            <h3>View Code</h3>
          </div>
          <button className="view-code-dialog-close" onClick={onClose} aria-label="Close dialog">
            <XIcon size={16} />
          </button>
        </div>
        
        <div className="view-code-dialog-content">
          <p>Choose how you'd like to view the code:</p>
          
          <div className="view-code-options">
            <button className="view-code-option" onClick={handleIDEOpen}>
              <div className="view-code-option-icon">
                <CodeIcon size={24} />
              </div>
              <div className="view-code-option-content">
                <h4>Open in IDE</h4>
                <p>Clone and open in VS Code or GitHub Desktop</p>
              </div>
            </button>

            <button className="view-code-option" onClick={handleOnlineViewer}>
              <div className="view-code-option-icon">
                <GlobeIcon size={24} />
              </div>
              <div className="view-code-option-content">
                <h4>Online Code Viewer</h4>
                <p>Browse code in VS Code for the web</p>
              </div>
            </button>

            <button className="view-code-option" onClick={handleGitHubOpen}>
              <div className="view-code-option-icon">
                <GithubIcon />
              </div>
              <div className="view-code-option-content">
                <h4>View on GitHub</h4>
                <p>Open the repository on GitHub</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCodeDialog;
