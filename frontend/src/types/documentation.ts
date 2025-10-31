export interface Documentation {
  content: string;
  sections?: { [key: string]: string };
  defaultKey?: string;
}

export interface DocumentationSection {
  title: string;
  content: string;
}

export interface ProgressStatus {
  step: 'generating' | 'parsing' | 'organizing' | 'complete';
  progress: number;
  message: string;
}