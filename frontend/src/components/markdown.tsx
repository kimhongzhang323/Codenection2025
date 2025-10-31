import React, { createContext, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Mermaid from './mermaid.tsx';
import FilesRenderer from './files_renderer';
import Callout from './ui/callout';
import CopyMarkdownButton from './ui/copy_markdown_button';
import TldrButton from './ui/tldr_button';
import './markdown.css';
import { CopyIcon, type CopyIconHandle } from './icons/copy_icon';

const MarkdownRawContext = createContext<string>('');

interface MarkdownProps {
  content: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  // Helper to extract plain text from React children for nested markdown parsing
  const extractText = (node: React.ReactNode): string => {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (React.isValidElement(node)) return extractText((node.props as { children?: React.ReactNode })?.children);
    return '';
  };
  // Define markdown components
  const MarkdownComponents = {
    // Direct HTML Callout tag mapping: <Callout title="...">...</Callout>
    // Note: HTML inside Callout body (e.g., <a href="...">) will render. Markdown syntax inside HTML blocks is not parsed by default.
    callout: (props: { children?: React.ReactNode; title?: string; variant?: string }) => {
      const { children, title, variant } = props as { children?: React.ReactNode; title?: string; variant?: string };
      const inner = extractText(children);
      return (
        <Callout title={title} variant={variant as never}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: MarkdownComponents!.a,
              strong: MarkdownComponents!.strong,
              code: MarkdownComponents!.code,
              p: ({ children: c }) => <span style={{ fontSize: '0.9rem' }}>{c}</span>,
            }}
          >
            {inner}
          </ReactMarkdown>
        </Callout>
      );
    },
    // Custom component for Files structure
    pre: ({ children, ...props }: { children?: React.ReactNode }) => {
      const childrenStr = Array.isArray(children) ? children.join('') : String(children || '');
      
      // Check if this pre contains Files structure
      if (childrenStr.includes('<Files>') && childrenStr.includes('</Files>')) {
        const filesMatch = childrenStr.match(/<Files>([\s\S]*?)<\/Files>/);
        if (filesMatch) {
          return <FilesRenderer>{filesMatch[1]}</FilesRenderer>;
        }
      }
      // Render Callout blocks inside fenced HTML
      if (childrenStr.includes('<Callout') && childrenStr.includes('</Callout>')) {
        const titleMatch = childrenStr.match(/title="([^"]*)"/);
        const bodyMatch = childrenStr.match(/<Callout[^>]*>([\s\S]*?)<\/Callout>/);
        const title = titleMatch ? titleMatch[1] : undefined;
        const body = bodyMatch ? bodyMatch[1] : '';
        return (
          <Callout title={title}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: MarkdownComponents!.a,
                strong: MarkdownComponents!.strong,
                code: MarkdownComponents!.code,
                p: ({ children: c }) => <span style={{ fontSize: '0.9rem' }}>{c}</span>,
              }}
            >
              {body}
            </ReactMarkdown>
          </Callout>
        );
      }
      
      return <pre {...props}>{children}</pre>;
    },

    p({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--docs-normal-text)', fontWeight: 300 }} {...props}>
          {children}
        </p>
      );
    },
    h1({ children, ...props }: { children?: React.ReactNode }) {
      const raw = useContext(MarkdownRawContext);
      const text = typeof children === 'string' ? children : '';
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      return (
        <div>
          <h1 
            id={id}
            style={{ fontSize: '1.7rem', fontWeight: 500, marginTop: '0.75rem', marginBottom: '1.2rem', color: 'var(--docs-header-text)' }} 
            {...props}
          >
            {children}
          </h1>
          <div style={{ marginTop: '0.9rem', marginBottom: '1rem', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <CopyMarkdownButton content={raw} />
            <TldrButton onClick={() => {
              console.log('[Markdown] TL;DR button clicked for content:', raw.substring(0, 100))
              // Dispatch a custom event that can be caught by parent components
              window.dispatchEvent(new CustomEvent('tldr-requested', { 
                detail: { content: raw } 
              }))
            }} />
          </div>
        </div>
      );
    },
    h2({ children, ...props }: { children?: React.ReactNode }) {
      const text = typeof children === 'string' ? children : '';
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Special styling for ReAct headings
      if (children && typeof children === 'string') {
        const text = children.toString();
        if (text.includes('Thought') || text.includes('Action') || text.includes('Observation') || text.includes('Answer')) {
          return (
            <h2 
              id={id}
              style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '1rem', marginBottom: '0.75rem', color: 'var(--docs-header-text)' }} 
              {...props}
            >
              {children}
            </h2>
          );
        }
      }
      return (
        <h2 
          id={id}
          style={{ fontSize: '1.35rem', fontWeight: 500, marginTop: '2.25rem', marginBottom: '0.75rem', color: 'var(--docs-header-text)' }} 
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3({ children, ...props }: { children?: React.ReactNode }) {
      const text = typeof children === 'string' ? children : '';
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      return (
        <h3 
          id={id}
          style={{ fontSize: '1.25rem', fontWeight: 500, marginTop: '1.45rem', marginBottom: '0.2rem', color: 'var(--docs-header-text)' }} 
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4({ children, ...props }: { children?: React.ReactNode }) {
      const text = typeof children === 'string' ? children : '';
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      return (
        <h4 
          id={id}
          style={{ fontSize: '1.15rem', fontWeight: 500, marginTop: '0.5rem', marginBottom: '0.5rem', color: 'var(--docs-header-text)' }} 
          {...props}
        >
          {children}
        </h4>
      );
    },
    ul({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <ul
          className="list-disc pl-6"
          style={{ marginBottom: '1rem' }}
          {...props}
        >
          {children}
        </ul>
      );
    },
    ol({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <ol
          className="list-decimal pl-6"
          style={{ marginBottom: '1rem' }}
          {...props}
        >
          {children}
        </ol>
      );
    },
    li({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <li
          style={{
            marginBottom: '1rem',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: 'var(--docs-normal-text)',
            fontWeight: 300,
          }}
          {...props}
        >
          {children}
        </li>
      );
    },
    hr({ ...props }) {
      return (
        <hr style={{ 
          border: 'none', 
          height: '0.5px', 
          backgroundColor: 'var(--docs-text)',
          marginTop: '0.75rem',
          marginBottom: '2rem',
          opacity: 0.1
        }} {...props} />
      );
    },
    strong({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <strong style={{ color: 'var(--docs-bold-text)', fontWeight: 400 }} {...props}>
          {children}
        </strong>
      );
    },
    a({ children, href, ...props }: { children?: React.ReactNode; href?: string }) {
      return (
        <a
          href={href}
          style={{
            color: 'var(--docs-link-text)',
            textDecoration: 'underline',
            textDecorationColor: '#89b5fa',
            textUnderlineOffset: '2px',
            fontWeight: 300
          }}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },
    blockquote({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <blockquote
          className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-1 text-gray-700 dark:text-gray-300 italic my-4 text-sm"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    table({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <div className="markdown-table-container">
          <table className="markdown-table" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }: { children?: React.ReactNode }) {
      return <thead className="markdown-table-header" {...props}>{children}</thead>;
    },
    tbody({ children, ...props }: { children?: React.ReactNode }) {
      return <tbody className="markdown-table-body" {...props}>{children}</tbody>;
    },
    tr({ children, ...props }: { children?: React.ReactNode }) {
      return <tr className="markdown-table-row" {...props}>{children}</tr>;
    },
    th({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <th className="markdown-table-header-cell" {...props}>
          {children}
        </th>
      );
    },
    td({ children, ...props }: { children?: React.ReactNode }) {
      return <td className="markdown-table-data-cell" {...props}>{children}</td>;
    },
    code(props: {
      inline?: boolean;
      className?: string;
      children?: React.ReactNode;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any; // Using any here as it's required for ReactMarkdown components
    }) {
      const { inline, className, children, ...otherProps } = props;
      const rawMarkdown = React.useContext(MarkdownRawContext);
      const match = /language-(\w+)/.exec(className || '');
      const codeContent = children ? String(children).replace(/\n$/, '') : '';

      // Check if this code block contains Files structure
      if (!inline && codeContent.includes('<Files>') && codeContent.includes('</Files>')) {
        const filesMatch = codeContent.match(/<Files>([\s\S]*?)<\/Files>/);
        if (filesMatch) {
          return <FilesRenderer>{filesMatch[1]}</FilesRenderer>;
        }
      }

      // Handle Mermaid diagrams
      if (!inline && match && match[1] === 'mermaid') {
        return (
          <div className="my-8 bg-gray-50 dark:bg-gray-800 rounded-md overflow-visible shadow-sm">
            <Mermaid
              chart={codeContent}
              className="w-full max-w-full"
            />
          </div>
        );
      }

      // Handle code blocks
      if (!inline && match) {
        const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        const codeBlockBg = isDarkMode ? '#212121' : '#eaeaea';
        const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';
            
        // Use different themes for dark/light mode
        const theme = isDarkMode ? tomorrow : prism;
          
        const iconRef = React.useRef<CopyIconHandle | null>(null);
        return (
          <div className="my-6 codeblock codeblock-container" style={{ overflow: 'visible' }}>
            <div className="codeblock__header">
              <div className="codeblock__title">
                {(() => {
                  const node: any = (otherProps as any)?.node;
                  const candidates: Array<string | undefined> = [
                    node?.meta,
                    node?.data?.meta,
                    node?.data?.hProperties?.title,
                    (otherProps as any)?.meta,
                    (otherProps as any)?.["data-meta"],
                  ];
                  for (const raw of candidates) {
                    if (typeof raw !== 'string') continue;
                    const rawMeta = raw.trim();
                    // title="..." or title='...' or title=bare
                    const mQuoted = rawMeta.match(/title\s*=\s*"([^"]+)"/)
                      || rawMeta.match(/title\s*=\s*'([^']+)'/);
                    if (mQuoted && mQuoted[1]) return mQuoted[1];
                    const mBare = rawMeta.match(/title\s*=\s*([^\s]+)/);
                    if (mBare && mBare[1]) return mBare[1];
                    // If meta is just a filename without a key, use it directly
                    if (rawMeta.length > 0 && !rawMeta.includes('=')) return rawMeta;
                  }
                  // Fallback: scan the raw markdown to find the fence that contains this code
                  try {
                    if (typeof rawMarkdown === 'string' && codeContent) {
                      const normalized = codeContent.trim();
                      const blockIndex = rawMarkdown.indexOf(normalized);
                      if (blockIndex !== -1) {
                        const before = rawMarkdown.lastIndexOf('```', blockIndex);
                        if (before !== -1) {
                          const lineStart = rawMarkdown.lastIndexOf('\n', before) + 1;
                          const lineEnd = rawMarkdown.indexOf('\n', before);
                          const fenceLine = rawMarkdown.slice(lineStart, lineEnd === -1 ? rawMarkdown.length : lineEnd);
                          // fenceLine example: ```tsx title="components/rate.tsx"
                          const metaPart = fenceLine.replace(/^```\s*[^\s]*\s*/, '');
                          const mQuoted = metaPart.match(/title\s*=\s*"([^"]+)"/)
                            || metaPart.match(/title\s*=\s*'([^']+)'/);
                          if (mQuoted && mQuoted[1]) return mQuoted[1];
                          const mBare = metaPart.match(/title\s*=\s*([^\s]+)/);
                          if (mBare && mBare[1]) return mBare[1];
                          if (metaPart && !metaPart.includes('=') && metaPart.trim().length > 0) return metaPart.trim();
                        }
                      }
                    }
                  } catch {
                    // intentionally ignored
                  }
                  return 'Code';
                })()}
              </div>
              <div
                className="codeblock__copyicon"
                role="button"
                aria-label="Copy code"
                title="Copy code"
                onClick={() => {
                  navigator.clipboard.writeText(codeContent);
                  try {
                    iconRef.current?.startAnimation();
                    window.setTimeout(() => iconRef.current?.stopAnimation(), 600);
                  } catch {
                    // intentionally ignored
                  }
                }}
              >
                <CopyIcon ref={iconRef} size={16} />
              </div>
            </div>
            <SyntaxHighlighter
              language={(() => {
                const rawLang = match[1];
                // Normalize language names for better syntax highlighting
                const languageAliases: Record<string, string> = {
                  'js': 'javascript',
                  'jsx': 'jsx',
                  'ts': 'typescript',
                  'tsx': 'tsx',
                  'py': 'python',
                  'cpp': 'cpp',
                  'c++': 'cpp',
                  'cxx': 'cpp',
                  'cc': 'cpp',
                  'cs': 'csharp',
                  'fs': 'fsharp',
                  'vb': 'vbnet',
                  'rb': 'ruby',
                  'kt': 'kotlin',
                  'rs': 'rust',
                  'go': 'go',
                  'php': 'php',
                  'swift': 'swift',
                  'scala': 'scala',
                  'java': 'java',
                  'groovy': 'groovy',
                  'dart': 'dart',
                  'elm': 'elm',
                  'clj': 'clojure',
                  'cljs': 'clojure',
                  'ex': 'elixir',
                  'exs': 'elixir',
                  'erl': 'erlang',
                  'hs': 'haskell',
                  'ml': 'ocaml',
                  'sh': 'bash',
                  'bash': 'bash',
                  'zsh': 'zsh',
                  'fish': 'fish',
                  'ps1': 'powershell',
                  'powershell': 'powershell',
                  'bat': 'batch',
                  'cmd': 'batch',
                  'sql': 'sql',
                  'mysql': 'sql',
                  'pgsql': 'sql',
                  'plsql': 'plsql',
                  'html': 'html',
                  'htm': 'html',
                  'xml': 'xml',
                  'xsl': 'xml',
                  'svg': 'xml',
                  'css': 'css',
                  'scss': 'scss',
                  'sass': 'sass',
                  'less': 'less',
                  'stylus': 'stylus',
                  'json': 'json',
                  'json5': 'json5',
                  'yaml': 'yaml',
                  'yml': 'yaml',
                  'toml': 'toml',
                  'ini': 'ini',
                  'cfg': 'ini',
                  'conf': 'ini',
                  'properties': 'properties',
                  'dockerfile': 'dockerfile',
                  'docker': 'dockerfile',
                  'md': 'markdown',
                  'markdown': 'markdown',
                  'mdx': 'mdx',
                  'tex': 'latex',
                  'latex': 'latex',
                  'rst': 'rest',
                  'adoc': 'asciidoc',
                  'r': 'r',
                  'matlab': 'matlab',
                  'pl': 'perl',
                  'lua': 'lua',
                  'vim': 'vim',
                  'awk': 'awk',
                  'makefile': 'makefile',
                  'cmake': 'cmake',
                  'diff': 'diff',
                  'patch': 'diff',
                  'log': 'log',
                  'txt': 'text',
                  'text': 'text',
                  'csv': 'csv'
                };
                return languageAliases[rawLang.toLowerCase()] || rawLang;
              })()}
              style={theme}
              customStyle={{
                margin: 0,
                borderRadius: '0 0 12px 12px',
                padding: '0.75rem 1rem 0.75rem 0.5rem',
                marginBottom: 0,
                backgroundColor: codeBlockBg,
                color: textColor,
                fontSize: '0.85rem',
                lineHeight: 1.6,
                maxHeight: 'calc(35 * 1.6em)',
                overflow: 'auto',
                whiteSpace: 'pre',
              }}
              showLineNumbers={true}
              wrapLines={false}
              wrapLongLines={false}
              lineNumberStyle={{
                minWidth: '2rem',
                padding: '0 0.5rem 0 0.25rem',
                marginRight: '0.25rem',
                textAlign: 'right',
                userSelect: 'none',
                opacity: 0.6,
              }}
              {...otherProps}
            >
              {codeContent}
            </SyntaxHighlighter>
          </div>
        );
      }

      // Handle inline code styled as a compact code container
      const isDarkModeInline = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const inlineBg = isDarkModeInline ? '#212121' : '#f1f1f1';
      return (
        <code
          className={`${className} inline-block font-mono px-2 py-1 rounded-md border shadow-sm text-gray-800 dark:text-gray-100`}
          style={{
            fontSize: '0.85rem',
            lineHeight: 1.6,
            verticalAlign: 'baseline',
            backgroundColor: inlineBg,
            borderColor: isDarkModeInline ? '#3a3a3a' : '#d1d5db',
          }}
          {...otherProps}
        >
          {children}
        </code>
      );
    },
  } as unknown as React.ComponentProps<typeof ReactMarkdown>['components'];

  return (
    <div className="docs-md max-w-none px-2 py-4">
      <MarkdownRawContext.Provider value={content}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
      </MarkdownRawContext.Provider>
    </div>
  );
};

export default Markdown;
