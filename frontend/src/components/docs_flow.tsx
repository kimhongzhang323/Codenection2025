import { useState } from 'react';
import { FileText, Check, X, Edit3, Send } from 'lucide-react';
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
  onBackToApp
}: {
  onDocumentationCreated?: (content: string) => void;
  onBackToApp?: () => void;
}) {
  const [selectedFlow, setSelectedFlow] = useState<'custom' | 'suggested' | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedOutline, setSelectedOutline] = useState<SuggestedOutline | null>(null);

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

    // Clean skeleton (no generated filler text)
    const generateSkeleton = (block: SuggestedBlock): string => {
      return `## ${block.title}\n\n`;
    };

    const docContent = acceptedBlocks.map(block => generateSkeleton(block)).join('\n\n');
    const finalContent = `# ${selectedOutline.title}\n\n${selectedOutline.description}\n\n${docContent}\n`;

    onDocumentationCreated?.(finalContent);
  };



  // // Editor State
  // if (hasExistingDoc || currentIsEditing) {
  //   return (
  //     <div className="documentation-system">
  //       <div className="doc-header">
  //         <div className="doc-header-left">
  //           <button className="back-btn" onClick={onBackToApp}>
  //             ← Back to Main
  //           </button>
  //           <h1>Documentation Editor</h1>
  //         </div>
  //         <button className="sync-btn">
  //           <Save size={16} />
  //           Sync Changes
  //         </button>
  //       </div>

  //       <div className="doc-layout">
  //         <div className="left-sidebar">
  //           <h3>Navigation</h3>
  //           <div className="nav-item active">Current Document</div>
  //           <div className="nav-item">Other Docs</div>
  //         </div>

  //         <div className="main-panel">
  //           <div className="editor-container">
  //             <div className="editor-header">
  //               <h2>Documentation Editor</h2>
  //               <div className="refinement-input-group">
  //                 <input
  //                   type="text"
  //                   value={refinementPrompt}
  //                   onChange={(e) => setRefinementPrompt(e.target.value)}
  //                   placeholder="Ask for changes (e.g., 'Add examples')"
  //                   className="refinement-input"
  //                 />
  //                 <button
  //                   className="refine-btn"
  //                   onClick={handleRefinementSubmit}
  //                   disabled={!refinementPrompt.trim()}
  //                 >
  //                   <Sparkles size={16} />
  //                   Suggest
  //                 </button>
  //               </div>
  //             </div>

  //             <div className="editor-content">
  //               <textarea
  //                 value={generatedDoc}
  //                 onChange={(e) => setGeneratedDoc(e.target.value)}
  //                 className="doc-editor"
  //                 placeholder="Start writing your documentation..."
  //               />

  //               {inlineSuggestions.map(suggestion => (
  //                 <div key={suggestion.id} className="inline-suggestion">
  //                   <div className="suggestion-content">
  //                     <h4>AI Suggestion</h4>
  //                     <div className="suggestion-text">{suggestion.content}</div>
  //                   </div>
  //                   <div className="suggestion-actions">
  //                     <button
  //                       className="action-btn accept"
  //                       onClick={() => handleInlineSuggestionAction(suggestion.id, 'accept')}
  //                     >
  //                       <Check size={16} />
  //                       Accept
  //                     </button>
  //                     <button
  //                       className="action-btn reject"
  //                       onClick={() => handleInlineSuggestionAction(suggestion.id, 'reject')}
  //                     >
  //                       <X size={16} />
  //                       Reject
  //                     </button>
  //                     <button
  //                       className="action-btn edit"
  //                       onClick={() => handleInlineSuggestionAction(suggestion.id, 'edit')}
  //                     >
  //                       <Edit3 size={16} />
  //                       Edit
  //                     </button>
  //                   </div>
  //                 </div>
  //               ))}
  //             </div>
  //           </div>
  //         </div>

  //         <div className="right-sidebar">
  //           <h3>Table of Contents</h3>
  //           <div className="toc-content">
  //             {generatedDoc ? generateTOC(generatedDoc) : (
  //               <div className="toc-placeholder">Write content to generate TOC</div>
  //             )}
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Empty State - Show starter choices
  return (
    <div className="documentation-flow-container">
      {!selectedFlow && (
        <div className="starter-choices">
          <div className="flow-header">
            <div className="back-btn" onClick={onBackToApp}>
              ← Back to Main
            </div>
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
              <div className="choice-icon">📝</div>
              <h3>Custom Flow</h3>
              <p>Describe exactly what documentation you need and we'll generate it for you</p>
            </div>

            <div
              className="choice-card"
              onClick={() => setSelectedFlow('suggested')}
            >
              <div className="choice-icon">✨</div>
              <h3>Template Flow</h3>
              <p>Choose from professionally designed documentation templates</p>
            </div>
          </div>
        </div>
      )}

      {selectedFlow === 'custom' && (
        <div className="custom-flow">
          <div className="flow-header">
            <button className="back-btn" onClick={() => setSelectedFlow(null)}>
              ← Back to options
            </button>
            <h2>Describe Your Documentation</h2>
          </div>

          <div className="custom-input-section">
            <label htmlFor="custom-prompt"></label>
            <textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., API documentation for a REST service with authentication, endpoints, and examples..."
              className="custom-prompt-input"
              rows={4}
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
      )}

      {selectedFlow === 'suggested' && !selectedOutline && (
        <div className="suggested-flow">
          <div className="flow-header">
            <button className="back-btn" onClick={() => setSelectedFlow(null)}>
              ← Back to options
            </button>
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
                  <span>Select Template →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedOutline && (
        <div className="outline-refinement">
          <div className="flow-header">
            <button className="back-btn" onClick={() => setSelectedOutline(null)}>
              ← Back to templates
            </button>
            <h2>Customize Your {selectedOutline.title}</h2>
            <p>Review and select the sections you want to include in your documentation</p>
          </div>

          <div className="outline-blocks">
            {selectedOutline.blocks.map(block => (
              <div
                key={block.id}
                className={`outline-block ${block.accepted ? 'accepted' : ''} ${block.rejected ? 'rejected' : ''} ${block.editing ? 'editing' : ''}`}
              >
                {block.editing ? (
                  <div className="edit-form">
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
                  </div>
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
                      </button>
                      <button
                        className="action-btn reject"
                        onClick={() => handleBlockAction(block.id, 'reject')}
                        title="Reject this section"
                      >
                        <X size={16} />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => handleBlockAction(block.id, 'edit')}
                        title="Edit this section"
                      >
                        <Edit3 size={16} />
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
                {selectedOutline.blocks.filter(block => block.accepted).length} of {selectedOutline.blocks.length} sections selected
              </span>
            </div>
            <button
              className="finalize-btn primary"
              onClick={finalizeOutline}
              disabled={!selectedOutline.blocks.some(block => block.accepted)}
            >
              <FileText size={16} />
              Create Documentation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
