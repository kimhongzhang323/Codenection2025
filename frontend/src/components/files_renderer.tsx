import React from 'react';
import { File, Folder, Tree } from './file_tree';

interface FilesRendererProps {
  children: string;
}

const FilesRenderer: React.FC<FilesRendererProps> = ({ children }) => {
  // Get all folder IDs for default expansion
  const getAllFolderIds = (content: string): string[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const folderIds: string[] = [];
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      const folderMatch = cleanLine.match(/<Folder\s+name="([^"]+)"(?:\s+defaultOpen)?\s*>/);
      if (folderMatch) {
        folderIds.push(folderMatch[1]);
      }
    });
    
    return folderIds;
  };

  // Parse the Files structure
  const parseFilesStructure = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    const tree: React.ReactNode[] = [];
    const folderStack: { folderName: string; folderId: string; children: React.ReactNode[] }[] = [];

    lines.forEach(line => {
      const cleanLine = line.trim();

      // Extract folder or file information
      const folderMatch = cleanLine.match(/<Folder\s+name="([^"]+)"(?:\s+defaultOpen)?\s*>/);
      const fileMatch = cleanLine.match(/<File\s+name="([^"]+)"\s*\/>/);
      const closeFolderMatch = cleanLine.match(/<\/Folder>/);

      if (folderMatch) {
        const folderName = folderMatch[1];
        const folderId = folderName;
        
        folderStack.push({ folderName, folderId, children: [] });
      } else if (fileMatch) {
        const fileName = fileMatch[1];
        const fileId = fileName;
        
        // Create file element
        const fileElement = (
          <File key={fileId} value={fileId}>
            {fileName}
          </File>
        );
        
        if (folderStack.length > 0) {
          // Add file to the current folder's children
          folderStack[folderStack.length - 1].children.push(fileElement);
        } else {
          // Top-level file
          tree.push(fileElement);
        }
      } else if (closeFolderMatch) {
        if (folderStack.length > 0) {
          const { folderName, folderId, children } = folderStack.pop()!;
          
          // Create the folder with its children
          const folderElement = (
            <Folder key={folderId} value={folderId} element={folderName}>
              {children}
            </Folder>
          );
          
          if (folderStack.length > 0) {
            // Add folder to parent folder's children
            folderStack[folderStack.length - 1].children.push(folderElement);
          } else {
            // Top-level folder
            tree.push(folderElement);
          }
        }
      }
    });

    return tree;
  };

  const treeElements = parseFilesStructure(children);

  return (
    <div className="my-6 border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800" style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--docs-normal-text)', fontWeight: 300 }}>
      <Tree className="w-full" initialExpandedItems={getAllFolderIds(children)}>
        {treeElements}
      </Tree>
    </div>
  );
};

export default FilesRenderer;
