import type { Documentation } from '../services/api'

/**
 * Find the newest document from a list of document keys
 * @param docs - Record of all documents
 * @param keys - Array of document keys to search through
 * @returns The key of the newest document based on lastUpdated timestamp
 */
export function findNewestDocument(
  docs: Record<string, Documentation>,
  keys: string[]
): string | null {
  if (keys.length === 0) return null
  
  let newestKey = keys[0]
  let newestTime = new Date(docs[newestKey].lastUpdated).getTime()
  
  for (const key of keys) {
    if (!docs[key]) continue
    
    const docTime = new Date(docs[key].lastUpdated).getTime()
    if (docTime > newestTime) {
      newestTime = docTime
      newestKey = key
    }
  }
  
  return newestKey
}

/**
 * Detect new documents by comparing current and previous keys
 * @param currentKeys - Current document keys
 * @param previousKeys - Previous document keys
 * @returns Array of new document keys
 */
export function detectNewDocuments(
  currentKeys: string[],
  previousKeys: string[]
): string[] {
  return currentKeys.filter(key => !previousKeys.includes(key))
}

/**
 * Parse potentially double-encoded JSON string content
 * @param content - The content to parse
 * @returns Parsed content or original if parsing fails
 */
export function parseDocumentContent(content: string): string {
  try {
    // Check if it's a stringified string (starts and ends with quotes)
    if (content.startsWith('"') && content.endsWith('"')) {
      return JSON.parse(content)
    }
  } catch (e) {
    // If parsing fails, use as-is
  }
  return content
}

/**
 * Sort documents by lastUpdated timestamp (newest first)
 * @param docs - Record of documents
 * @returns Sorted array of [key, document] entries
 */
export function sortDocumentsByDate(
  docs: Record<string, Documentation>
): [string, Documentation][] {
  return Object.entries(docs).sort(([, a], [, b]) => {
    const timeA = new Date(a.lastUpdated).getTime()
    const timeB = new Date(b.lastUpdated).getTime()
    return timeB - timeA // Newest first
  })
}
