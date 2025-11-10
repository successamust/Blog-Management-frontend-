import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import { createLowlight } from 'lowlight';
import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Save,
  Type,
  FileText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { imagesAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Create lowlight instance with common languages
const lowlight = createLowlight();

// Register common languages for syntax highlighting
const registerLanguages = async () => {
  try {
    const [
      javascript,
      typescript,
      python,
      java,
      cpp,
      css,
      xml,
      json,
      bash,
      sql,
    ] = await Promise.all([
      import('highlight.js/lib/languages/javascript'),
      import('highlight.js/lib/languages/typescript'),
      import('highlight.js/lib/languages/python'),
      import('highlight.js/lib/languages/java'),
      import('highlight.js/lib/languages/cpp'),
      import('highlight.js/lib/languages/css'),
      import('highlight.js/lib/languages/xml'),
      import('highlight.js/lib/languages/json'),
      import('highlight.js/lib/languages/bash'),
      import('highlight.js/lib/languages/sql'),
    ]);

    lowlight.register('javascript', javascript.default);
    lowlight.register('typescript', typescript.default);
    lowlight.register('python', python.default);
    lowlight.register('java', java.default);
    lowlight.register('cpp', cpp.default);
    lowlight.register('css', css.default);
    lowlight.register('html', xml.default);
    lowlight.register('xml', xml.default);
    lowlight.register('json', json.default);
    lowlight.register('bash', bash.default);
    lowlight.register('sql', sql.default);
  } catch (e) {
    console.warn('Could not load all highlight.js languages:', e);
  }
};

// Register languages on module load
registerLanguages();

const RichTextEditor = ({ value, onChange, placeholder = 'Start writing...' }) => {
  const [isPreview, setIsPreview] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const autosaveTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Convert HTML to Markdown
  const htmlToMarkdown = useCallback((html) => {
    if (!html) return '';
    // Simple HTML to Markdown conversion
    let md = html
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '```\n$1\n```')
      .replace(/<blockquote>(.*?)<\/blockquote>/gis, '> $1')
      .replace(/<ul>(.*?)<\/ul>/gis, '$1')
      .replace(/<ol>(.*?)<\/ol>/gis, '$1')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img src="(.*?)" alt="(.*?)"\/?>/gi, '![$2]($1)')
      .replace(/<[^>]+>/g, '')
      .trim();
    return md;
  }, []);

  // Convert Markdown to HTML
  const markdownToHtml = useCallback((md) => {
    if (!md) return '';
    return marked.parse(md);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        // Note: StarterKit v3 doesn't include Link or Underline by default
        // But we exclude them explicitly to prevent any conflicts
        link: false,
        underline: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline.configure({
        // Explicitly configure to avoid conflicts
      }),
      CharacterCount,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Update markdown content
      const md = htmlToMarkdown(html);
      setMarkdownContent(md);
      
      // Autosave
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        const draftKey = 'editor-draft-' + Date.now();
        localStorage.setItem(draftKey, JSON.stringify({
          html,
          markdown: md,
          timestamp: Date.now(),
        }));
        setLastSaved(new Date());
        // Keep only last 5 drafts
        const keys = Object.keys(localStorage).filter(k => k.startsWith('editor-draft-'));
        if (keys.length > 5) {
          keys.sort().slice(0, keys.length - 5).forEach(k => localStorage.removeItem(k));
        }
      }, 2000);
    },
    editorProps: {
      attributes: {
        class: isDark
          ? 'prose prose-invert max-w-none focus:outline-none p-4 min-h-[400px] dark:text-gray-100'
          : 'prose max-w-none focus:outline-none p-4 min-h-[400px] text-gray-900',
      },
    },
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
      const md = htmlToMarkdown(value || '');
      setMarkdownContent(md);
    }
  }, [value, editor, htmlToMarkdown]);

  // Toggle between Markdown and WYSIWYG mode
  useEffect(() => {
    if (!editor) return;
    
    if (isMarkdown) {
      // Switch to Markdown mode - convert current HTML to Markdown
      const currentHtml = editor.getHTML();
      const md = htmlToMarkdown(currentHtml);
      setMarkdownContent(md);
    } else {
      // Switch to WYSIWYG mode - convert Markdown to HTML
      if (markdownContent) {
        const html = markdownToHtml(markdownContent);
        editor.commands.setContent(html);
        onChange(html);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarkdown, editor]);

  // Toggle dark mode
  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom.closest('.ProseMirror') || editor.view.dom;
      if (isDark) {
        editorElement.classList.add('dark');
      } else {
        editorElement.classList.remove('dark');
      }
    }
  }, [isDark, editor]);

  // Cleanup autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  const handleImageUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      const response = await imagesAPI.upload(uploadFormData);
      const imageUrl = response.data.image?.url || response.data.url || response.data.imageUrl;
      
      if (!imageUrl) {
        toast.error('Failed to get image URL from response');
        return;
      }

      if (isMarkdown) {
        // Insert markdown image syntax
        const imageMarkdown = `![${file.name}](${imageUrl})\n`;
        const currentMarkdown = markdownContent || '';
        const newMarkdown = currentMarkdown + imageMarkdown;
        setMarkdownContent(newMarkdown);
        const html = markdownToHtml(newMarkdown);
        onChange(html);
      } else {
        // Insert image in WYSIWYG mode
        editor.chain().focus().setImage({ src: imageUrl }).run();
      }
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    }
  };

  const handleLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const textContent = text.replace(/<[^>]*>/g, '');
    const wordCount = textContent.trim().split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes;
  };

  const wordCount = editor.storage.characterCount?.words() || 0;
  const characterCount = editor.storage.characterCount?.characters() || 0;
  const readingTime = calculateReadingTime(isMarkdown ? markdownContent : editor.getHTML());

  const ToolbarButton = ({ onClick, isActive = false, children, title, disabled = false }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  const editorContent = (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-colors ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 flex flex-wrap items-center gap-1 overflow-x-auto">
        {/* Formatting */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={18} />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={18} />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight size={18} />
          </ToolbarButton>
        </div>

        {/* Code & Quote */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote size={18} />
          </ToolbarButton>
        </div>

        {/* Link & Image */}
        <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
          <ToolbarButton
            onClick={handleLink}
            isActive={editor.isActive('link')}
            title="Insert Link"
          >
            <LinkIcon size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={insertImage}
            title="Insert Image"
          >
            <ImageIcon size={18} />
          </ToolbarButton>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <ToolbarButton
            onClick={() => setIsMarkdown(!isMarkdown)}
            isActive={isMarkdown}
            title={isMarkdown ? 'Switch to WYSIWYG' : 'Switch to Markdown'}
          >
            {isMarkdown ? <Type size={18} /> : <FileText size={18} />}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setIsPreview(!isPreview)}
            isActive={isPreview}
            title="Toggle Preview"
          >
            {isPreview ? <EyeOff size={18} /> : <Eye size={18} />}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setIsDark(!isDark)}
            isActive={isDark}
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setIsFullscreen(!isFullscreen)}
            isActive={isFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        {isPreview ? (
          <div className={`p-4 min-h-[400px] max-h-[600px] overflow-y-auto ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
            <ReactMarkdown
              className={isDark ? 'prose prose-invert max-w-none' : 'prose max-w-none'}
            >
              {isMarkdown ? markdownContent : (editor ? htmlToMarkdown(editor.getHTML()) : '')}
            </ReactMarkdown>
          </div>
        ) : isMarkdown ? (
          <textarea
            value={markdownContent}
            onChange={(e) => {
              const newMarkdown = e.target.value;
              setMarkdownContent(newMarkdown);
              const html = markdownToHtml(newMarkdown);
              onChange(html);
            }}
            className={`w-full min-h-[400px] p-4 border-0 focus:outline-none resize-none font-mono text-sm ${
              isDark
                ? 'bg-gray-800 text-gray-100'
                : 'bg-white text-gray-900'
            }`}
            placeholder={placeholder}
          />
        ) : (
          <EditorContent editor={editor} />
        )}

        {/* Stats Bar */}
        <div className={`border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs flex-wrap gap-2 ${
          isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-600'
        }`}>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span>{wordCount} words</span>
            <span className="hidden sm:inline">{characterCount} characters</span>
            <span>~{readingTime} min read</span>
            {lastSaved && (
              <span className="flex items-center gap-1">
                <Save size={12} />
                <span className="hidden sm:inline">Saved {lastSaved.toLocaleTimeString()}</span>
                <span className="sm:hidden">Saved</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImageUpload(file);
          }
          e.target.value = ''; // Reset input
        }}
        className="hidden"
      />
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
        {editorContent}
      </div>
    );
  }

  return (
    <>
      {editorContent}
      <style>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror code {
          background-color: rgba(97, 97, 97, 0.1);
          color: #616161;
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.9em;
        }
        .ProseMirror pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        .ProseMirror pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
        }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror h1 {
          font-size: 2rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
        }
        .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .ProseMirror a:hover {
          color: #2563eb;
        }
        .dark .ProseMirror code {
          background-color: rgba(255, 255, 255, 0.1);
          color: #e5e7eb;
        }
        .dark .ProseMirror blockquote {
          border-left-color: #60a5fa;
        }
        .dark .ProseMirror a {
          color: #60a5fa;
        }
        .dark .ProseMirror a:hover {
          color: #93c5fd;
        }
        .hljs {
          display: block;
          overflow-x: auto;
          padding: 0.5em;
          background: #1e1e1e;
          color: #d4d4d4;
        }
        .hljs-comment,
        .hljs-quote {
          color: #6a9955;
        }
        .hljs-variable,
        .hljs-template-variable,
        .hljs-tag,
        .hljs-name,
        .hljs-selector-id,
        .hljs-selector-class,
        .hljs-regexp,
        .hljs-deletion {
          color: #f48771;
        }
        .hljs-number,
        .hljs-built_in,
        .hljs-builtin-name,
        .hljs-literal,
        .hljs-type,
        .hljs-params,
        .hljs-meta,
        .hljs-link {
          color: #b5cea8;
        }
        .hljs-attribute {
          color: #9cdcfe;
        }
        .hljs-string,
        .hljs-symbol,
        .hljs-bullet,
        .hljs-addition {
          color: #ce9178;
        }
        .hljs-title,
        .hljs-section {
          color: #4ec9b0;
        }
        .hljs-keyword,
        .hljs-selector-tag {
          color: #569cd6;
        }
        .hljs-emphasis {
          font-style: italic;
        }
        .hljs-strong {
          font-weight: bold;
        }
      `}</style>
    </>
  );
};

export default RichTextEditor;
