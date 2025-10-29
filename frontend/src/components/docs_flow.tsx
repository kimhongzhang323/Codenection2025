import { useState, useEffect } from 'react';
import { FileText, Check, X, Edit3, Send, ArrowLeft, ArrowRight } from 'lucide-react';
import type { DocumentConfig } from '../services/api';
import { configApi } from '../services/api';
import './docs_flow.css';

interface SuggestedBlock {
  id: string;
  title: string;
  content: string;
  accepted?: boolean;
  rejected?: boolean;
  editing?: boolean;
  editedTitle?: string;
  editedContent?: string;
}

interface SuggestedOutline {
  id: string;
  title: string;
  description: string;
  blocks: SuggestedBlock[];
}

export default function DocumentationSystem({
  onDocumentationCreated,
  onBackToApp,
  repoUrl
}: {
  onDocumentationCreated?: (content: string) => void;
  onBackToApp?: () => void;
  repoUrl: string;
}) {
  const [selectedFlow, setSelectedFlow] = useState<'custom' | 'suggested' | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedOutline, setSelectedOutline] = useState<SuggestedOutline | null>(null);
  
  // Configuration state
  const [showConfigStep, setShowConfigStep] = useState(false);
  const [config, setConfig] = useState<DocumentConfig>({
    audience: 'technical project managers',
    tone: 'formal',
    documentationTemplate: '# Project: {{projectName}}\n\n## Section: {{sectionName}}\n\n{{content}}',
    extra: {
      include_diagrams: 'true'
    }
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Load existing configuration on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const existingConfig = await configApi.get(repoUrl);
        if (existingConfig) {
          setConfig(existingConfig.config);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
        setConfigError('Failed to load existing configuration');
      } finally {
        setConfigLoading(false);
      }
    };

    if (repoUrl) {
      loadConfig();
    }
  }, [repoUrl]);

  // Save configuration
  const saveConfig = async () => {
    try {
      setConfigLoading(true);
      setConfigError(null);
      await configApi.set(repoUrl, undefined, config);
      setShowConfigStep(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setConfigError('Failed to save configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  const suggestedOutlines: SuggestedOutline[] = [
    {
      id: '1',
      title: 'API Documentation',
      description: 'Complete API reference with endpoints and examples',
      blocks: [
        { id: '1-1', title: 'Getting Started', content: 'Introduction and authentication setup' },
        { id: '1-2', title: 'API Endpoints', content: 'List of available endpoints with parameters' },
        { id: '1-3', title: 'Examples', content: 'Code examples and use cases' },
        { id: '1-4', title: 'Error Handling', content: 'Common errors and troubleshooting' }
      ]
    },
    {
      id: '2',
      title: 'User Guide',
      description: 'Step-by-step guide for end users',
      blocks: [
        { id: '2-1', title: 'Installation', content: 'System requirements and installation steps' },
        { id: '2-2', title: 'Quick Start', content: 'Getting up and running quickly' },
        { id: '2-3', title: 'Features', content: 'Detailed feature explanations' },
        { id: '2-4', title: 'FAQ', content: 'Frequently asked questions' }
      ]
    },
    {
      id: '3',
      title: 'Developer Guide',
      description: 'Technical documentation for developers',
      blocks: [
        { id: '3-1', title: 'Architecture', content: 'System architecture overview' },
        { id: '3-2', title: 'Setup', content: 'Development environment setup' },
        { id: '3-3', title: 'Contributing', content: 'How to contribute to the project' },
        { id: '3-4', title: 'Deployment', content: 'Deployment instructions and best practices' }
      ]
    }
  ];

  const handleCustomSubmit = () => {
    if (!customPrompt.trim()) return;

    const mockGeneratedDoc = `# ${customPrompt}\n\n(Your documentation starts here)\n`;
    onDocumentationCreated?.(mockGeneratedDoc);
  };

  const handleOutlineSelect = (outline: SuggestedOutline) => {
    setSelectedOutline(outline);
  };

  const handleBlockAction = (blockId: string, action: 'accept' | 'reject' | 'edit') => {
    if (!selectedOutline) return;

    const updatedBlocks = selectedOutline.blocks.map(block => {
      if (block.id === blockId) {
        if (action === 'edit') {
          return {
            ...block,
            editing: true,
            editedTitle: block.editedTitle || block.title,
            editedContent: block.editedContent || block.content,
            accepted: false,
            rejected: false
          };
        } else {
          return {
            ...block,
            accepted: action === 'accept',
            rejected: action === 'reject',
            editing: false
          };
        }
      }
      return block;
    });

    setSelectedOutline({
      ...selectedOutline,
      blocks: updatedBlocks
    });
  };

  const handleEditSubmit = (blockId: string) => {
    if (!selectedOutline) return;

    const updatedBlocks = selectedOutline.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          title: block.editedTitle || block.title,
          content: block.editedContent || block.content,
          editing: false,
          accepted: true
        };
      }
      return block;
    });

    setSelectedOutline({
      ...selectedOutline,
      blocks: updatedBlocks
    });
  };

  const handleEditCancel = (blockId: string) => {
    if (!selectedOutline) return;

    const updatedBlocks = selectedOutline.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          editing: false,
          editedTitle: block.title,
          editedContent: block.content
        };
      }
      return block;
    });

    setSelectedOutline({
      ...selectedOutline,
      blocks: updatedBlocks
    });
  };

  const handleEditTitleChange = (blockId: string, newTitle: string) => {
    if (!selectedOutline) return;

    const updatedBlocks = selectedOutline.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          editedTitle: newTitle
        };
      }
      return block;
    });

    setSelectedOutline({
      ...selectedOutline,
      blocks: updatedBlocks
    });
  };

  const handleEditContentChange = (blockId: string, newContent: string) => {
    if (!selectedOutline) return;

    const updatedBlocks = selectedOutline.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          editedContent: newContent
        };
      }
      return block;
    });

    setSelectedOutline({
      ...selectedOutline,
      blocks: updatedBlocks
    });
  };

  const finalizeOutline = () => {
    if (!selectedOutline) return;

    const acceptedBlocks = selectedOutline.blocks.filter(block => block.accepted);

    // Handle case when no sections are accepted
    if (acceptedBlocks.length === 0) {
      const minimalContent = `# ${selectedOutline.title}\n\n${selectedOutline.description}\n\n*No sections were selected for this documentation.*\n`;
      onDocumentationCreated?.(minimalContent);
      return;
    }

    // Clean skeleton (no generated filler text)
    const generateSkeleton = (block: SuggestedBlock): string => {
      return `## ${block.title}\n\n`;
    };

    const docContent = acceptedBlocks.map(block => generateSkeleton(block)).join('\n\n');
    const finalContent = `# ${selectedOutline.title}\n\n${selectedOutline.description}\n\n${docContent}\n`;

    onDocumentationCreated?.(finalContent);
  };

  // Helper function to check if all sections have been decided (accept or reject)
  const allSectionsDecided = (): boolean => {
    if (!selectedOutline) return false;
    return selectedOutline.blocks.every(block => block.accepted || block.rejected);
  };

  // Empty State - Show starter choices
  return (
    <div className="documentation-flow-container">
      {!selectedFlow && (
        <div className="starter-choices">
          <button className="back-btn back-btn-fixed" onClick={onBackToApp}>
            <ArrowLeft size={16} />
            Back to Main
          </button>
          <div className="flow-header">
          </div>
          <div className="welcome-header">
            <h1>Create Your Documentation</h1>
            <p>Choose how you'd like to start building your project documentation</p>
          </div>

          <div className="choice-cards">
            <div
              className="choice-card"
              onClick={() => setSelectedFlow('custom')}
            >
              <div className="choice-icon">
                <Edit3 size={48} />
              </div>
              <h3>Custom Flow</h3>
              <p>Describe exactly what documentation you need and we'll generate it for you</p>
            </div>

            <div
              className="choice-card"
              onClick={() => setSelectedFlow('suggested')}
            >
              <div className="choice-icon">
                <FileText size={48} />
              </div>
              <h3>Template Flow</h3>
              <p>Choose from professionally designed documentation templates</p>
            </div>
          </div>
        </div>
      )}

      {selectedFlow === 'custom' && (
        <div className="custom-flow">
          <button className="back-btn back-btn-fixed" onClick={() => setSelectedFlow(null)}>
            <ArrowLeft size={16} />
            Back to options
          </button>
          
          <div className="custom-content">
            <div className="custom-header">
              <h1>Describe Your Documentation</h1>
              <p>Tell us exactly what documentation you need and we'll generate it for you</p>
            </div>

            <div className="custom-input-container">
              <div className="custom-input-section">
                <textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., API documentation for a REST service with authentication, endpoints, and examples..."
                  className="custom-prompt-input"
                  rows={6}
                />
                <div className="input-actions">
                  <button
                    className="generate-btn primary"
                    onClick={handleCustomSubmit}
                    disabled={!customPrompt.trim()}
                  >
                    <Send size={16} />
                    Generate Documentation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFlow === 'suggested' && !selectedOutline && (
        <div className="suggested-flow">
          <button className="back-btn back-btn-fixed" onClick={() => setSelectedFlow(null)}>
            <ArrowLeft size={16} />
            Back to options
          </button>
          <div className="flow-header">
            <h2>Choose a Documentation Template</h2>
            <p>Select a professional template that matches your project needs</p>
          </div>

          <div className="suggestion-cards">
            {suggestedOutlines.map(outline => (
              <div
                key={outline.id}
                className="suggestion-card"
                onClick={() => handleOutlineSelect(outline)}
              >
                <div className="suggestion-header">
                  <h3>{outline.title}</h3>
                  <p>{outline.description}</p>
                </div>
                <div className="suggestion-preview">
                  <div className="preview-label">Includes:</div>
                  {outline.blocks.map(block => (
                    <div key={block.id} className="preview-block">
                      <span className="block-icon">•</span>
                      {block.title}
                    </div>
                  ))}
                </div>
                <div className="suggestion-action">
                  <span>
                    Select Template
                    <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedOutline && (
        <>
          <button className="back-btn back-btn-fixed" onClick={() => setSelectedOutline(null)}>
            <ArrowLeft size={16} />
            Back to templates
          </button>
          <div className="outline-refinement">
            <div className="welcome-header">
              <h1>Customize Your {selectedOutline.title}</h1>
              <p>Review and select the sections you want to include in your documentation</p>
            </div>

          <div className="outline-blocks">
            {selectedOutline.blocks.map(block => (
              <div
                key={block.id}
                className={`outline-block ${block.accepted ? 'accepted' : ''} ${block.rejected ? 'rejected' : ''} ${block.editing ? 'editing' : ''}`}
              >
                {block.editing ? (
                  <>
                    <div className="edit-field">
                      <label htmlFor={`title-${block.id}`}>Section Title:</label>
                      <input
                        id={`title-${block.id}`}
                        type="text"
                        value={block.editedTitle || ''}
                        onChange={(e) => handleEditTitleChange(block.id, e.target.value)}
                        className="edit-title-input"
                      />
                    </div>
                    <div className="edit-field">
                      <label htmlFor={`content-${block.id}`}>Section Description:</label>
                      <textarea
                        id={`content-${block.id}`}
                        value={block.editedContent || ''}
                        onChange={(e) => handleEditContentChange(block.id, e.target.value)}
                        className="edit-content-input"
                        rows={3}
                      />
                    </div>
                    <div className="edit-actions">
                      <button
                        className="edit-submit-btn"
                        onClick={() => handleEditSubmit(block.id)}
                      >
                        <Check size={16} />
                        Save Changes
                      </button>
                      <button
                        className="edit-cancel-btn"
                        onClick={() => handleEditCancel(block.id)}
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="block-content">
                      <h4>{block.title}</h4>
                      <p>{block.content}</p>
                    </div>
                    <div className="block-actions">
                      <button
                        className="action-btn accept"
                        onClick={() => handleBlockAction(block.id, 'accept')}
                        title="Accept this section"
                      >
                        <Check size={16} />
                        <span>Accept</span>
                      </button>
                      <button
                        className="action-btn reject"
                        onClick={() => handleBlockAction(block.id, 'reject')}
                        title="Reject this section"
                      >
                        <X size={16} />
                        <span>Reject</span>
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => handleBlockAction(block.id, 'edit')}
                        title="Edit this section"
                      >
                        <Edit3 size={16} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="finalize-section">
            <div className="selection-summary">
              <span>
                {selectedOutline.blocks.filter(block => block.accepted || block.rejected).length} of {selectedOutline.blocks.length} sections reviewed
                {allSectionsDecided() && ` • ${selectedOutline.blocks.filter(block => block.accepted).length} selected`}
              </span>
            </div>
            <button
              className="finalize-btn primary"
              onClick={finalizeOutline}
              disabled={!allSectionsDecided()}
            >
              Create Documentation
            </button>
          </div>
        </div>
        </>
      )}

      {/* Configuration Modal */}
      {showConfigStep && (
        <div className="config-modal-overlay">
          <div className="config-modal">
            <div className="config-modal-header">
              <h3>Document Template Configuration</h3>
              <button 
                className="config-close-btn" 
                onClick={() => setShowConfigStep(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="config-modal-content">
              {configError && (
                <div className="config-error">
                  {configError}
                </div>
              )}
              
              <div className="config-field">
                <label htmlFor="audience">Target Audience</label>
                <select
                  id="audience"
                  value={config.audience}
                  onChange={(e) => setConfig({ ...config, audience: e.target.value })}
                >
                  <option value="technical project managers">Technical Project Managers</option>
                  <option value="developers">Developers</option>
                  <option value="end users">End Users</option>
                  <option value="business stakeholders">Business Stakeholders</option>
                </select>
              </div>

              <div className="config-field">
                <label htmlFor="tone">Tone</label>
                <select
                  id="tone"
                  value={config.tone}
                  onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                >
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>

              <div className="config-field">
                <label htmlFor="template">Documentation Template</label>
                <textarea
                  id="template"
                  value={config.documentationTemplate}
                  onChange={(e) => setConfig({ ...config, documentationTemplate: e.target.value })}
                  rows={6}
                  placeholder="Use variables like {{projectName}}, {{sectionName}}, {{content}}"
                />
              </div>

              <div className="config-field">
                <label>
                  <input
                    type="checkbox"
                    checked={config.extra?.include_diagrams === 'true'}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      extra: { 
                        ...config.extra, 
                        include_diagrams: e.target.checked ? 'true' : 'false' 
                      } 
                    })}
                  />
                  Include Diagrams
                </label>
              </div>
            </div>

            <div className="config-modal-actions">
              <button 
                className="config-cancel-btn" 
                onClick={() => setShowConfigStep(false)}
                disabled={configLoading}
              >
                Cancel
              </button>
              <button 
                className="config-save-btn" 
                onClick={saveConfig}
                disabled={configLoading}
              >
                {configLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
