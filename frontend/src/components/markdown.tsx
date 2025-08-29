import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Mermaid from './mermaid';
import FilesRenderer from './files_renderer';
import Callout from './callout';

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
        <p style={{ marginBottom: '1rem', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--docs-normal-text)', fontWeight: 300 }} {...props}>
          {children}
        </p>
      );
    },
    h1({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <h1 style={{ fontSize: '1.85rem', fontWeight: 600, marginTop: '0.75rem', marginBottom: '0.75rem', color: 'var(--docs-header-text)' }} {...props}>
          {children}
        </h1>
      );
    },
    h2({ children, ...props }: { children?: React.ReactNode }) {
      // Special styling for ReAct headings
      if (children && typeof children === 'string') {
        const text = children.toString();
        if (text.includes('Thought') || text.includes('Action') || text.includes('Observation') || text.includes('Answer')) {
          return (
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.75rem', color: 'var(--docs-header-text)' }} {...props}>
              {children}
            </h2>
          );
        }
      }
      return (
        <h2 style={{ fontSize: '1.45rem', fontWeight: 600, marginTop: '2rem', marginBottom: '0.75rem', color: 'var(--docs-header-text)' }} {...props}>
          {children}
        </h2>
      );
    },
    h3({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.45rem', marginBottom: '0.2rem', color: 'var(--docs-header-text)' }} {...props}>
          {children}
        </h3>
      );
    },
    h4({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <h4 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '0.5rem', marginBottom: '0.5rem', color: 'var(--docs-header-text)' }} {...props}>
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
            fontSize: '0.95rem',
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
          margin: '2rem 0',
          opacity: 0.2
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
        <div className="overflow-x-auto my-6 rounded-md">
          <table className="min-w-full text-sm border-collapse" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }: { children?: React.ReactNode }) {
      return <thead className="bg-gray-100 dark:bg-gray-800" {...props}>{children}</thead>;
    },
    tbody({ children, ...props }: { children?: React.ReactNode }) {
      return <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props}>{children}</tbody>;
    },
    tr({ children, ...props }: { children?: React.ReactNode }) {
      return <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" {...props}>{children}</tr>;
    },
    th({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <th
          className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300"
          {...props}
        >
          {children}
        </th>
      );
    },
    td({ children, ...props }: { children?: React.ReactNode }) {
      return <td className="px-4 py-3 border-t border-gray-200 dark:border-gray-700" {...props}>{children}</td>;
    },
    code(props: {
      inline?: boolean;
      className?: string;
      children?: React.ReactNode;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any; // Using any here as it's required for ReactMarkdown components
    }) {
      const { inline, className, children, ...otherProps } = props;
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
          <div className="my-8 bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden shadow-sm">
            <Mermaid
              chart={codeContent}
              className="w-full max-w-full"
              zoomingEnabled={true}
            />
          </div>
        );
      }

      // Handle code blocks
      if (!inline && match) {
        const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        const codeBlockBg = isDarkMode ? '#212121' : '#f1f1f1';
        return (
            <div className="my-6 rounded-lg overflow-hidden text-sm shadow-sm">
            <div className="bg-gray-800 text-gray-200 px-5 py-2 text-sm flex justify-between items-center rounded-t-lg">
              <span>{match[1]}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeContent);
                }}
                className="text-gray-400 hover:text-white"
                title="Copy code"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
            <SyntaxHighlighter
              language={match[1]}
              style={tomorrow}
              className="!text-sm"
              customStyle={{ margin: 0, borderRadius: 3, padding: '1rem', backgroundColor: codeBlockBg }}
              showLineNumbers={true}
              wrapLines={true}
              wrapLongLines={true}
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
          className={`${className} inline-block font-mono text-sm px-2 py-1 rounded-md border shadow-sm text-gray-800 dark:text-gray-100`}
          style={{
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
