// Changelog and Git History Types

export interface GitCommit {
  sha: string
  message: string
  author: {
    name: string
    email: string
    date: string
  }
  committer: {
    name: string
    email: string
    date: string
  }
  url: string
  html_url: string
  stats?: {
    additions: number
    deletions: number
    total: number
  }
}

export interface FileChange {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed'
  additions: number
  deletions: number
  changes: number
  blob_url: string
  raw_url: string
  contents_url: string
  patch?: string
  previous_filename?: string
}

export interface ChangelogEntry {
  id: string
  commit: GitCommit
  files: FileChange[]
  message: string
  author: string
  date: string
  sha: string
  branch: string
  tags: string[]
  filesChanged: number
  linesAdded: number
  linesDeleted: number
}

export interface ChangelogFilter {
  author?: string
  dateFrom?: string
  dateTo?: string
  fileExtension?: string
  branch?: string
  searchQuery?: string
}

export interface ChangelogSearchResult {
  entries: ChangelogEntry[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

export interface CodeDiff {
  filename: string
  oldVersion: {
    content: string
    sha: string
    url: string
  }
  newVersion: {
    content: string
    sha: string
    url: string
  }
  hunks: DiffHunk[]
  status: FileChange['status']
  additions: number
  deletions: number
  isBinary: boolean
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
  header: string
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface ReviewComment {
  id: string
  user: string
  content: string
  timestamp: string
  line?: number
  file?: string
  type: 'general' | 'line-specific'
}

export interface ChangelogStats {
  totalCommits: number
  totalFiles: number
  totalAdditions: number
  totalDeletions: number
  topAuthors: Array<{
    name: string
    commits: number
    additions: number
    deletions: number
  }>
  fileTypeStats: Array<{
    extension: string
    files: number
    changes: number
  }>
  activityByDate: Array<{
    date: string
    commits: number
    changes: number
  }>
}

export interface GitRepository {
  name: string
  fullName: string
  owner: string
  defaultBranch: string
  branches: string[]
  url: string
  cloneUrl: string
  sshUrl: string
}

// API Response Types
export interface ChangelogApiResponse {
  status: 'success' | 'error'
  message?: string
  data: ChangelogSearchResult
}

export interface CommitDetailsApiResponse {
  status: 'success' | 'error'
  message?: string
  data: {
    commit: GitCommit
    files: FileChange[]
    diffs: CodeDiff[]
  }
}

export interface RepositoryInfoApiResponse {
  status: 'success' | 'error'
  message?: string
  data: GitRepository
}
