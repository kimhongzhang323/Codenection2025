import { ApiResponse } from '../types/api';
import type { Documentation, ProgressStatus } from '../types/documentation';

const BASE_URL = '/api/documentation';

export const documentationApi = {
  // Get all documentation for a repository
  getAll: async (gitUrl: string, branch?: string): Promise<Map<string, Documentation>> => {
    const params = new URLSearchParams({ gitUrl });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch documentation');
    const data: ApiResponse<Map<string, Documentation>> = await response.json();
    return data.data;
  },

  // Get specific documentation section
  getSection: async (gitUrl: string, key: string, sectionPath: string, branch?: string): Promise<string> => {
    const params = new URLSearchParams({ gitUrl, key, sectionPath });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/section?${params}`);
    if (!response.ok) throw new Error('Failed to fetch section');
    const data: ApiResponse<string> = await response.json();
    return data.data;
  },

  // List all sections in a documentation
  listSections: async (gitUrl: string, key: string, branch?: string): Promise<string[]> => {
    const params = new URLSearchParams({ gitUrl, key });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/sections?${params}`);
    if (!response.ok) throw new Error('Failed to list sections');
    const data: ApiResponse<string[]> = await response.json();
    return data.data;
  },

  // Get single documentation
  getSingle: async (gitUrl: string, key: string, branch?: string): Promise<Documentation> => {
    const params = new URLSearchParams({ gitUrl, key });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/single?${params}`);
    if (!response.ok) throw new Error('Failed to fetch documentation');
    const data: ApiResponse<Documentation> = await response.json();
    return data.data;
  },

  // Create new documentation
  create: async (gitUrl: string, key: string, content: string, branch?: string): Promise<void> => {
    const params = new URLSearchParams({ gitUrl, key });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/single?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content)
    });
    if (!response.ok) throw new Error('Failed to create documentation');
  },

  // Update existing documentation
  update: async (gitUrl: string, key: string, content: string, branch?: string): Promise<void> => {
    const params = new URLSearchParams({ gitUrl, key });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/single?${params}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content)
    });
    if (!response.ok) throw new Error('Failed to update documentation');
  },

  // Set default documentation
  setDefault: async (gitUrl: string, key: string, branch?: string): Promise<void> => {
    const params = new URLSearchParams({ gitUrl, key });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/default?${params}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to set default documentation');
  },

  // Get generation progress
  getProgress: async (gitUrl: string, branch?: string): Promise<ProgressStatus> => {
    const params = new URLSearchParams({ gitUrl });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/progress?${params}`);
    if (!response.ok) throw new Error('Failed to get progress');
    const data: ApiResponse<ProgressStatus> = await response.json();
    return data.data;
  },

  // Generate documentation
  generate: async (gitUrl: string, branch?: string): Promise<void> => {
    const params = new URLSearchParams({ gitUrl });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/generate?${params}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to generate documentation');
  },

  // Get extra markdown documents
  getExtraDocuments: async (gitUrl: string, branch?: string): Promise<string[]> => {
    const params = new URLSearchParams({ gitUrl });
    if (branch) params.append('branch', branch);
    const response = await fetch(`${BASE_URL}/extra?${params}`);
    if (!response.ok) throw new Error('Failed to fetch extra documents');
    const data: ApiResponse<string[]> = await response.json();
    return data.data;
  }
};