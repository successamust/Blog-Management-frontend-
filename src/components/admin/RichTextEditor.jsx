import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { createLowlight } from 'lowlight';
import { marked } from 'marked';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TurndownService from 'turndown';
import { gfm as turndownGfm } from 'turndown-plugin-gfm';
import DOMPurify from 'dompurify';
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
  Save,
  Type,
  FileText,
  Maximize2,
  Minimize2,
  Grid3x3,
  Columns,
  Rows,
  MinusSquare,
  Trash2,
  SeparatorHorizontal,
  Undo2,
  Redo2,
  Indent,
  Outdent,
  Eraser,
} from 'lucide-react';
import { imagesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';

const lowlight = createLowlight();

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

registerLanguages();

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
});

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});
turndownService.use(turndownGfm);

const preprocessTableHTML = (html) => {
  if (!html) return html;
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
      const colgroups = table.querySelectorAll('colgroup');
      colgroups.forEach(colgroup => colgroup.remove());
      
      const thElements = table.querySelectorAll('th');
      thElements.forEach(th => {
        const heading = th.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) {
          th.innerHTML = heading.textContent || heading.innerText;
        }
        th.removeAttribute('colwidth');
        th.removeAttribute('colspan');
        th.removeAttribute('rowspan');
      });
      
      const tdElements = table.querySelectorAll('td');
      tdElements.forEach(td => {
        const pTag = td.querySelector('p');
        if (pTag && td.children.length === 1) {
          td.innerHTML = pTag.innerHTML;
        }
        td.removeAttribute('colwidth');
        td.removeAttribute('colspan');
        td.removeAttribute('rowspan');
      });
      
      table.removeAttribute('style');
      table.querySelectorAll('th, td').forEach(cell => {
        cell.removeAttribute('style');
      });
    });
    
    return doc.body.innerHTML;
  } catch (error) {
    console.warn('Failed to preprocess table HTML, using original:', error);
    return html;
  }
};

// Create extensions array once at module level to avoid duplicates
// StarterKit includes: Blockquote, Bold, BulletList, Code, CodeBlock, Document, 
// Dropcursor, Gapcursor, HardBreak, Heading, History, HorizontalRule, Italic, 
// ListItem, OrderedList, Paragraph, Strike, Text
// It does NOT include Link or Underline, so we add them separately
// We create a function that returns extensions with a dynamic placeholder
let cachedExtensions = null;
let cachedPlaceholder = null;
const TableWithBorders = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderless: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-borderless') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.borderless) return {};
          return { 'data-borderless': 'true' };
        },
      },
    };
  },
});

const getExtensions = (placeholderText) => {
  // Only recreate if placeholder changes, otherwise reuse cached extensions
  if (cachedExtensions && cachedPlaceholder === placeholderText) {
    return cachedExtensions;
  }
  
  // Configure StarterKit to exclude Link and Underline if they're included
  const starterKitConfig = {
    codeBlock: false, // We'll use CodeBlockLowlight instead
    link: false, // Explicitly disable Link in StarterKit to avoid duplicates
    underline: false, // Explicitly disable Underline in StarterKit to avoid duplicates
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  };
  
  cachedExtensions = [
    StarterKit.configure(starterKitConfig),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-[var(--accent)] underline',
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Placeholder.configure({
      placeholder: placeholderText,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TableWithBorders.configure({
      resizable: true,
      handleWidth: 6,
      lastColumnResizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Underline,
    CharacterCount,
  ];
  
  cachedPlaceholder = placeholderText;
  return cachedExtensions;
};

const RichTextEditor = ({ value, onChange, placeholder = 'Start writing...' }) => {
  const [isPreview, setIsPreview] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [tableShowBorder, setTableShowBorder] = useState(true);
  const autosaveTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isUpdatingRef = useRef(false);
  
  const isWysiwygMode = !isMarkdown;
  const getWysiwygTitle = (label) =>
    isWysiwygMode ? label : `${label} (WYSIWYG only)`;

  // Get extensions - cached at module level to prevent duplicates
  const extensions = getExtensions(placeholder);

  // Convert HTML to Markdown
  const htmlToMarkdown = useCallback((html) => {
    if (!html) return '';
    try {
      // Preprocess HTML to clean up TipTap table structure
      const cleanedHTML = preprocessTableHTML(html);
      return turndownService.turndown(cleanedHTML);
    } catch (error) {
      console.error('Failed to convert HTML to markdown', error);
      return html;
    }
  }, []);

  // Convert Markdown to HTML
  const markdownToHtml = useCallback((md) => {
    if (!md) return '';
    try {
      return marked.parse(md);
    } catch (error) {
      console.error('Failed to convert markdown to HTML', error);
      return md;
    }
  }, []);

  const editor = useEditor({
    extensions,
    content: value || '',
    immediatelyRender: false,
    onCreate: ({ editor }) => {
      // When editor is created, ensure background is set correctly in fullscreen
      if (isFullscreen && isDark && editor.view && editor.view.dom) {
        setTimeout(() => {
          const editorElement = editor.view.dom.closest('.ProseMirror') || editor.view.dom;
          if (editorElement) {
            editorElement.style.setProperty('background-color', '#1E293B', 'important');
            editorElement.style.setProperty('background', '#1E293B', 'important');
          }
        }, 100);
      }
    },
    onUpdate: ({ editor }) => {
      // Skip update if we're programmatically updating content
      if (isUpdatingRef.current) return;
      
      const html = editor.getHTML();
      onChange(html);
      
      // Update markdown content
      const md = htmlToMarkdown(html);
      setMarkdownContent(md);
      
      // Autosave
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      setIsSaving(true);
      autosaveTimerRef.current = setTimeout(() => {
        const draftKey = 'editor-draft-' + Date.now();
        localStorage.setItem(draftKey, JSON.stringify({
          html,
          markdown: md,
          timestamp: Date.now(),
        }));
        setLastSaved(new Date());
        setIsSaving(false);
        // Keep only last 5 drafts
        const keys = Object.keys(localStorage).filter(k => k.startsWith('editor-draft-'));
        if (keys.length > 5) {
          keys.sort().slice(0, keys.length - 5).forEach(k => localStorage.removeItem(k));
        }
      }, 2000);
    },
    editorProps: {
      attributes: {
        class: isFullscreen && isDark
          ? 'prose prose-invert max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] dark:text-[var(--text-primary)]'
          : isDark
          ? 'prose prose-invert max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] dark:text-[var(--text-primary)] bg-[var(--surface-bg)]'
          : 'prose max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] text-[var(--text-primary)] bg-[var(--surface-bg)]',
      },
    },
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (!editor || isUpdatingRef.current) return;
    
    const currentContent = editor.getHTML();
    const newContent = value || '';
    
    // Only update if content actually changed to avoid infinite loops
    // Normalize empty content for comparison
    const normalizedCurrent = currentContent.trim() || '<p></p>';
    const normalizedNew = newContent.trim() || '<p></p>';
    
    if (normalizedNew !== normalizedCurrent) {
      isUpdatingRef.current = true;
      
      try {
        editor.commands.setContent(newContent, false); // false = don't emit update event
        const md = htmlToMarkdown(newContent);
        setMarkdownContent(md);
      } catch (error) {
        console.error('Error updating editor content:', error);
      } finally {
        // Reset flag after a short delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    }
  }, [value, editor, htmlToMarkdown]);

  // Toggle between Markdown and WYSIWYG mode
  useEffect(() => {
    if (!editor) return;
    
    if (isMarkdown) {
      // Switch to Markdown mode - convert current HTML to Markdown
      const currentHtml = editor.getHTML();
      const md = htmlToMarkdown(currentHtml);
      setMarkdownContent(md || '');
    } else {
      // Switch to WYSIWYG mode - convert Markdown to HTML
      if (markdownContent) {
        try {
          isUpdatingRef.current = true;
        const html = markdownToHtml(markdownContent);
          editor.commands.setContent(html || '', false);
          onChange(html || '');
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 100);
        } catch (error) {
          console.error('Error converting markdown to HTML:', error);
          isUpdatingRef.current = false;
        }
      } else {
        // If no markdown content, ensure editor has current content
        const currentHtml = editor.getHTML();
        if (currentHtml) {
          onChange(currentHtml);
        }
      }
    }
  }, [isMarkdown, editor]);

  // Flag to prevent infinite loops
  const isApplyingStylesRef = useRef(false);
  const styleTimeoutRef = useRef(null);

  // Function to apply dark mode styles to editor content
  const applyDarkModeStyles = useCallback(() => {
    if (!editor || isApplyingStylesRef.current) return;
    
    // Check if editor view is available
    if (!editor.view || !editor.view.dom) return;
    
    isApplyingStylesRef.current = true;
    
    try {
      const editorElement = editor.view.dom.closest('.ProseMirror') || editor.view.dom;
      if (!editorElement) return;
      
      if (isDark) {
        const textColor = isFullscreen ? '#F1F5F9' : '#f3f4f6';
        const caretColor = isFullscreen ? '#FFFFFF' : '#f3f4f6';
        const bgColor = isFullscreen ? '#1E293B' : '#1f2937';
        
        editorElement.style.setProperty('background-color', bgColor, 'important');
        editorElement.style.setProperty('background', bgColor, 'important');
        editorElement.style.setProperty('caret-color', caretColor, 'important');
        editorElement.style.setProperty('color', textColor, 'important');
        
        // Specifically target headers first with more aggressive approach
        const headers = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headers.forEach(header => {
          header.style.setProperty('color', textColor, 'important');
          header.style.setProperty('caret-color', caretColor, 'important');
          // Also set on any text nodes or nested elements within headers
          const headerChildren = header.querySelectorAll('*');
          headerChildren.forEach(child => {
            child.style.setProperty('color', textColor, 'important');
          });
        });
        
        // Force all text elements to be light in dark mode with !important
        const allTextElements = editorElement.querySelectorAll('p, li, span, strong, em, blockquote, div');
        allTextElements.forEach(el => {
          el.style.setProperty('color', textColor, 'important');
          el.style.setProperty('caret-color', caretColor, 'important');
        });
        
        // Also set on any nested elements that might be headers
        const allElements = editorElement.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.tagName && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
            el.style.setProperty('color', textColor, 'important');
            el.style.setProperty('caret-color', caretColor, 'important');
          } else if (el.tagName && ['P', 'LI', 'SPAN', 'STRONG', 'EM', 'BLOCKQUOTE', 'DIV'].includes(el.tagName)) {
            el.style.setProperty('color', textColor, 'important');
          }
        });
      } else {
        // Reset cursor color
        editorElement.style.removeProperty('caret-color');
        editorElement.style.removeProperty('color');
        
        // Reset text elements to dark in light mode
        const allTextElements = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, span, strong, em, blockquote, div');
        allTextElements.forEach(el => {
          el.style.removeProperty('color');
          el.style.removeProperty('caret-color');
        });
      }
    } finally {
      // Reset flag after a short delay
      setTimeout(() => {
        isApplyingStylesRef.current = false;
      }, 50);
    }
  }, [editor, isDark, isFullscreen]);

  // Toggle dark mode - apply to editor and parent container
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;
    
      const editorElement = editor.view.dom.closest('.ProseMirror') || editor.view.dom;
    if (!editorElement) return;
    
    // Clear any pending style updates
    if (styleTimeoutRef.current) {
      clearTimeout(styleTimeoutRef.current);
    }
    
    // Update editor element classes and styles
      if (isDark) {
        editorElement.classList.add('dark');
      editorElement.classList.add('prose-invert');
      if (isFullscreen) {
        editorElement.style.setProperty('background-color', '#1E293B', 'important');
        editorElement.style.setProperty('background', '#1E293B', 'important');
        editorElement.style.setProperty('color', '#F1F5F9', 'important');
        editorElement.style.setProperty('caret-color', '#FFFFFF', 'important');
      } else {
        editorElement.style.backgroundColor = '#1f2937'; // bg-[var(--surface-bg)]
        editorElement.style.color = '#f3f4f6'; // text-[var(--text-primary)]
        editorElement.style.caretColor = '#f3f4f6'; // cursor color
      }
      } else {
        editorElement.classList.remove('dark');
      editorElement.classList.remove('prose-invert');
      editorElement.style.backgroundColor = '#ffffff'; // bg-[var(--surface-bg)]
      editorElement.style.color = 'var(--text-primary)'; // text-primary
      editorElement.style.caretColor = 'var(--text-primary)'; // cursor color
    }
    
    // Apply styles immediately and then again after a delay
    applyDarkModeStyles();
    styleTimeoutRef.current = setTimeout(() => {
      applyDarkModeStyles();
    }, 100);
    
    // Also apply styles after a longer delay to catch any late DOM updates
    setTimeout(() => {
      applyDarkModeStyles();
    }, 300);
    
    // Use MutationObserver to watch for DOM changes (but not style changes)
    const observer = new MutationObserver((mutations) => {
      // Only react to actual content changes, not style changes
      const hasContentChange = mutations.some(mutation => 
        mutation.type === 'childList' || 
        (mutation.type === 'attributes' && mutation.attributeName !== 'style')
      );
      
      // Also check if headers were added or modified
      const hasHeaderChange = mutations.some(mutation => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          return addedNodes.some(node => 
            node.nodeType === 1 && 
            ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName)
          );
        }
        return false;
      });
      
      if ((hasContentChange || hasHeaderChange) && !isApplyingStylesRef.current) {
        // Debounce style application
        if (styleTimeoutRef.current) {
          clearTimeout(styleTimeoutRef.current);
        }
        styleTimeoutRef.current = setTimeout(() => {
          applyDarkModeStyles();
        }, 50);
      }
    });
    
    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'] // Only watch class changes, not style
    });
    
    return () => {
      observer.disconnect();
      if (styleTimeoutRef.current) {
        clearTimeout(styleTimeoutRef.current);
      }
    };
  }, [isDark, editor, applyDarkModeStyles, isFullscreen]);

  // Update editor attributes when fullscreen changes
  useEffect(() => {
    if (!editor) return;
    
    // Update editor props when fullscreen mode changes
    try {
      if (editor.setOptions) {
        editor.setOptions({
          editorProps: {
            attributes: {
              class: isFullscreen && isDark
                ? 'prose prose-invert max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] dark:text-[var(--text-primary)]'
                : isDark
                ? 'prose prose-invert max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] dark:text-[var(--text-primary)] bg-[var(--surface-bg)]'
                : 'prose max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] text-[var(--text-primary)] bg-[var(--surface-bg)]',
            },
          },
        });
      }
    } catch (e) {
      // Editor might not support setOptions, that's okay
    }
  }, [isFullscreen, isDark, editor]);

  // Force update background when entering fullscreen in dark mode
  useEffect(() => {
    if (!isFullscreen || !isDark || !editor || !editor.view || !editor.view.dom) return;
    
    // Use a more aggressive approach - directly find and update all relevant elements
    const updateFullscreenBackground = () => {
      // First, try to update via editor view DOM directly
      if (editor.view && editor.view.dom) {
        const viewDom = editor.view.dom;
        // The ProseMirror element is usually the view.dom itself or its parent
        if (viewDom.classList && viewDom.classList.contains('ProseMirror')) {
          viewDom.style.setProperty('background-color', '#1E293B', 'important');
          viewDom.style.setProperty('background', '#1E293B', 'important');
          viewDom.style.backgroundColor = '#1E293B';
          viewDom.style.background = '#1E293B';
        }
      }
      // Find ProseMirror element - try multiple methods
      let editorElement = editor.view.dom.closest('.ProseMirror') || editor.view.dom;
      if (!editorElement || !editorElement.classList.contains('ProseMirror')) {
        // Fallback: find by querySelector
        editorElement = document.querySelector('[data-fullscreen-editor="true"] .ProseMirror');
      }
      if (!editorElement) return;
      
      // Remove any background classes that might be white
      editorElement.classList.remove('bg-[var(--surface-bg)]', 'bg-white', 'bg-gray-50', 'bg-slate-50');
      
      // Remove any background classes that might be white
      editorElement.classList.remove('bg-[var(--surface-bg)]', 'bg-white', 'bg-gray-50', 'bg-slate-50');
      
      // Force set background on ProseMirror with maximum priority
      editorElement.style.setProperty('background-color', '#1E293B', 'important');
      editorElement.style.setProperty('background', '#1E293B', 'important');
      editorElement.style.backgroundColor = '#1E293B';
      editorElement.style.background = '#1E293B';
      
      // Also remove background from computed styles if any
      const computedStyle = window.getComputedStyle(editorElement);
      const bgColor = computedStyle.backgroundColor;
      // Check if background is white or light
      if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'white' || bgColor.includes('255, 255, 255')) {
        editorElement.style.setProperty('background-color', '#1E293B', 'important');
        editorElement.style.setProperty('background', '#1E293B', 'important');
        editorElement.style.backgroundColor = '#1E293B';
        editorElement.style.background = '#1E293B';
      }
      
      // Also check and update the wrapper div that contains EditorContent
      const editorContentWrapper = editorElement.closest('div.relative')?.parentElement;
      if (editorContentWrapper) {
        editorContentWrapper.classList.remove('bg-[var(--surface-bg)]', 'bg-white', 'bg-gray-50', 'bg-slate-50');
        editorContentWrapper.style.setProperty('background-color', '#1E293B', 'important');
        editorContentWrapper.style.setProperty('background', '#1E293B', 'important');
        editorContentWrapper.style.backgroundColor = '#1E293B';
        editorContentWrapper.style.background = '#1E293B';
      }
      
      // Find and update ALL parent divs
      let current = editorElement.parentElement;
      while (current && current !== document.body) {
        if (current.classList.contains('relative') || current.classList.contains('rich-text-editor') || current.tagName === 'DIV') {
          current.style.setProperty('background-color', '#1E293B', 'important');
          current.style.setProperty('background', '#1E293B', 'important');
          current.style.backgroundColor = '#1E293B';
          current.style.background = '#1E293B';
        }
        current = current.parentElement;
      }
      
      // Also update parent wrapper divs specifically
      const relativeDiv = editorElement.closest('.rich-text-editor > div.relative');
      if (relativeDiv) {
        relativeDiv.style.setProperty('background-color', '#1E293B', 'important');
        relativeDiv.style.setProperty('background', '#1E293B', 'important');
        relativeDiv.style.backgroundColor = '#1E293B';
        relativeDiv.style.background = '#1E293B';
      }
      
      // Update all divs inside relative div
      const allDivsInRelative = relativeDiv?.querySelectorAll('div');
      if (allDivsInRelative) {
        allDivsInRelative.forEach(div => {
          div.style.setProperty('background-color', '#1E293B', 'important');
          div.style.setProperty('background', '#1E293B', 'important');
          div.style.backgroundColor = '#1E293B';
          div.style.background = '#1E293B';
        });
      }
      
      // Update the rich-text-editor container
      const richTextEditor = editorElement.closest('.rich-text-editor');
      if (richTextEditor) {
        richTextEditor.style.setProperty('background-color', '#0F172A', 'important');
        richTextEditor.style.setProperty('background', '#0F172A', 'important');
        richTextEditor.style.backgroundColor = '#0F172A';
        richTextEditor.style.background = '#0F172A';
      }
      
      // Also find by class name as fallback - update ALL ProseMirror elements
      const allProseMirrors = document.querySelectorAll('[data-fullscreen-editor="true"] .ProseMirror');
      allProseMirrors.forEach(el => {
        // Remove all background classes
        Array.from(el.classList).forEach(cls => {
          if (cls.includes('bg-') || cls.includes('background')) {
            el.classList.remove(cls);
          }
        });
        
        el.style.setProperty('background-color', '#1E293B', 'important');
        el.style.setProperty('background', '#1E293B', 'important');
        el.style.backgroundColor = '#1E293B';
        el.style.background = '#1E293B';
        
        // Also update all parent divs of each ProseMirror
        let parent = el.parentElement;
        while (parent && parent !== document.body && parent !== document.querySelector('[data-fullscreen-editor="true"]')) {
          if (parent.tagName === 'DIV') {
            // Remove background classes from parent too
            Array.from(parent.classList).forEach(cls => {
              if (cls.includes('bg-') || cls.includes('background')) {
                parent.classList.remove(cls);
              }
            });
            
            parent.style.setProperty('background-color', '#1E293B', 'important');
            parent.style.setProperty('background', '#1E293B', 'important');
            parent.style.backgroundColor = '#1E293B';
            parent.style.background = '#1E293B';
          }
          parent = parent.parentElement;
        }
      });
      
      // Also find and update ALL divs inside the fullscreen container that might have white backgrounds
      const fullscreenContainer = document.querySelector('[data-fullscreen-editor="true"]');
      if (fullscreenContainer) {
        const allDivs = fullscreenContainer.querySelectorAll('div');
        allDivs.forEach(div => {
          const computedBg = window.getComputedStyle(div).backgroundColor;
          // If background is white or light, update it
          if (computedBg === 'rgb(255, 255, 255)' || 
              computedBg === 'white' || 
              computedBg.includes('255, 255, 255') ||
              computedBg === 'rgba(255, 255, 255, 1)' ||
              computedBg === 'rgba(255, 255, 255, 0)') {
            // Remove background classes
            Array.from(div.classList).forEach(cls => {
              if (cls.includes('bg-') || cls.includes('background')) {
                div.classList.remove(cls);
              }
            });
            
            div.style.setProperty('background-color', '#1E293B', 'important');
            div.style.setProperty('background', '#1E293B', 'important');
            div.style.backgroundColor = '#1E293B';
            div.style.background = '#1E293B';
          }
        });
      }
      
      // Also update editor attributes if editor API supports it
      if (editor && editor.setOptions) {
        try {
          editor.setOptions({
            editorProps: {
              attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] dark:text-[var(--text-primary)]',
                style: 'background-color: #1E293B !important; background: #1E293B !important; color: #F1F5F9 !important;'
              },
            },
          });
        } catch (e) {
          // Editor might not support setOptions, that's okay
        }
      }
    };
    
    // Apply immediately
    updateFullscreenBackground();
    
    // Use MutationObserver to watch for ProseMirror element creation
    const observer = new MutationObserver(() => {
      updateFullscreenBackground();
    });
    
    // Observe the fullscreen container
    const fullscreenContainer = document.querySelector('[data-fullscreen-editor="true"]');
    if (fullscreenContainer) {
      observer.observe(fullscreenContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
    
    // Apply again after delays to catch any late DOM updates
    const timeout1 = setTimeout(updateFullscreenBackground, 50);
    const timeout2 = setTimeout(updateFullscreenBackground, 200);
    const timeout3 = setTimeout(updateFullscreenBackground, 500);
    const timeout4 = setTimeout(updateFullscreenBackground, 1000);
    
    return () => {
      observer.disconnect();
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
    };
  }, [isFullscreen, isDark, editor]);

  // Reapply dark mode styles when editor content updates
  useEffect(() => {
    if (!editor || !editor.view) return;
    
    const handleUpdate = () => {
      if (isApplyingStylesRef.current || !editor.view) return;
      
      // Debounce style application
      if (styleTimeoutRef.current) {
        clearTimeout(styleTimeoutRef.current);
      }
      styleTimeoutRef.current = setTimeout(() => {
        applyDarkModeStyles();
      }, 100);
    };
    
    const handleSelectionUpdate = () => {
      if (isApplyingStylesRef.current) return;
      
      // Reapply styles on selection change with debounce
      // This is important for headers that might be selected
      requestAnimationFrame(() => {
        if (styleTimeoutRef.current) {
          clearTimeout(styleTimeoutRef.current);
        }
        styleTimeoutRef.current = setTimeout(() => {
          applyDarkModeStyles();
        }, 30);
      });
    };
    
    // Also listen for transaction updates which happen when formatting changes
    const handleTransaction = () => {
      if (isApplyingStylesRef.current) return;
      
      requestAnimationFrame(() => {
        if (styleTimeoutRef.current) {
          clearTimeout(styleTimeoutRef.current);
        }
        styleTimeoutRef.current = setTimeout(() => {
          applyDarkModeStyles();
        }, 50);
      });
    };
    
    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleTransaction);
    
    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleTransaction);
      if (styleTimeoutRef.current) {
        clearTimeout(styleTimeoutRef.current);
      }
    };
  }, [editor, applyDarkModeStyles]);

  // Cleanup autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

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

  const handleLink = (e) => {
    if (isMarkdown) {
      toast.error('Switch to WYSIWYG mode to manage links');
      return;
    }
    // If we're already in a link, just move cursor out of link to allow normal text typing
    // Don't unlink the text, just exit link mode (toggle off)
    if (editor.isActive('link')) {
      const { from, to } = editor.state.selection;
      const doc = editor.state.doc;
      
      // Find the end of the link by looking forward from current position
      let endPos = Math.max(from, to);
      
      // Check forward until we find a position without link mark
      for (let pos = endPos; pos < doc.content.size; pos++) {
        const resolved = doc.resolve(pos);
        const marks = resolved.marks();
        const hasLink = marks.some(m => m.type.name === 'link');
        if (!hasLink) {
          endPos = pos;
          break;
        }
        // Safety check - don't loop forever
        if (pos - endPos > 1000) break;
      }
      
      // Move cursor to just after the link
      editor.chain().focus().setTextSelection(endPos).run();
      
      // Remove link mark from cursor position to prevent extending
      setTimeout(() => {
        const { view } = editor;
        const { state } = view;
        const { tr } = state;
        
        // Remove link mark from stored marks
        const linkMark = state.schema.marks.link;
        if (linkMark) {
          const marks = tr.storedMarks || tr.selection.$from.marks();
          const marksWithoutLink = marks.filter(mark => mark.type.name !== 'link');
          tr.setStoredMarks(marksWithoutLink);
          view.dispatch(tr);
        }
      }, 10);
      
      return;
    }
    
    // If we're not in a link, open modal to insert link
    // Get selected text if any
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    if (selectedText) {
      setLinkText(selectedText);
    } else {
      setLinkText('');
    }
    
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Validate and normalize URL format
    let finalUrl = linkUrl.trim();
    
    try {
      new URL(finalUrl);
    } catch (e) {
      // If not a valid URL, try adding https://
      const urlWithProtocol = finalUrl.startsWith('http://') || finalUrl.startsWith('https://') 
        ? finalUrl 
        : `https://${finalUrl}`;
      
      try {
        new URL(urlWithProtocol);
        finalUrl = urlWithProtocol;
      } catch (e2) {
        toast.error('Please enter a valid URL');
        return;
      }
    }

    // Helper function to move cursor outside link
    const moveCursorOutsideLink = () => {
      requestAnimationFrame(() => {
        const { from, to } = editor.state.selection;
        const doc = editor.state.doc;
        
        // Start from the end of current selection and find where link mark ends
        let endPos = Math.max(from, to);
        
        // Check if we're still in a link at the end position
        const checkPos = doc.resolve(endPos);
        const hasLinkAtPos = checkPos.marks().some(m => m.type.name === 'link');
        
        if (hasLinkAtPos) {
          // Find where the link mark ends by checking forward
          for (let pos = endPos; pos < doc.content.size; pos++) {
            const resolved = doc.resolve(pos);
            const marks = resolved.marks();
            const hasLink = marks.some(m => m.type.name === 'link');
            if (!hasLink) {
              endPos = pos;
              break;
            }
            // If we've checked many positions and still in link, break
            if (pos - endPos > 1000) break;
          }
          
          // If we couldn't find the end, insert a space to create a position outside the link
          if (endPos === Math.max(from, to)) {
            // Insert a space after the link
            editor.chain().focus().insertContent(' ').run();
            
            // Move cursor to the space (outside link)
            requestAnimationFrame(() => {
              const spacePos = editor.state.selection.from;
              
              // Delete the space but keep cursor outside
              setTimeout(() => {
                const { view } = editor;
                const { state } = view;
                const { tr } = state;
                
                // Delete the space
                tr.delete(spacePos - 1, spacePos);
                
                // Set cursor to where the space was (outside link)
                // After deletion, this is selectionEnd + 1, but that position doesn't exist
                // So we'll set it to selectionEnd, then move forward
                const selection = TextSelection.create(tr.doc, spacePos - 1);
                tr.setSelection(selection);
                view.dispatch(tr);
                
                // Now move cursor forward by one position (outside link)
                setTimeout(() => {
                  const { view: newView } = editor;
                  const { state: newState } = newView;
                  const { tr: newTr } = newState;
                  
                  const currentPos = newTr.selection.from;
                  const newPos = Math.min(currentPos + 1, newState.doc.content.size);
                  
                  if (newPos > currentPos && newPos <= newState.doc.content.size) {
                    try {
                      const newSelection = TextSelection.create(newState.doc, newPos);
                      newTr.setSelection(newSelection);
                      newView.dispatch(newTr);
                    } catch (e) {
                      editor.chain().focus().setTextSelection(newPos).run();
                    }
                  }
                }, 5);
              }, 5);
            });
            return;
          }
        }
        
        // Move cursor to just after the link
        editor.chain().focus().setTextSelection(endPos).run();
      });
    };

    if (linkText.trim()) {
      // Insert link with text
      editor.chain().focus().insertContent(`<a href="${finalUrl}">${linkText.trim()}</a>`).run();
      
      // Move cursor outside the link
      moveCursorOutsideLink();
    } else {
      // Insert or update link on selected text
      if (editor.isActive('link')) {
        // Update existing link
        editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
        moveCursorOutsideLink();
      } else {
        // Get the selected text and its range
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        
        if (selectedText) {
          // Get the selection range before setting link
          const { from, to } = editor.state.selection;
          const linkEndPos = to;
          
          // Set the link on the selected text
          editor.chain()
            .focus()
            .setLink({ href: finalUrl })
            .run();
          
          // Move cursor outside the link and remove link mark from cursor position
          setTimeout(() => {
            // Move cursor to just after the link
            editor.chain().focus().setTextSelection(linkEndPos).run();
            
            // Remove link mark from cursor position to prevent extending
            setTimeout(() => {
              const { view } = editor;
              const { state } = view;
              const { tr } = state;
              
              // Remove link mark from stored marks
              const linkMark = state.schema.marks.link;
              if (linkMark) {
                const marks = tr.storedMarks || tr.selection.$from.marks();
                const marksWithoutLink = marks.filter(mark => mark.type.name !== 'link');
                tr.setStoredMarks(marksWithoutLink);
                view.dispatch(tr);
              }
            }, 10);
          }, 10);
        } else {
          // No text selected, just set link mark (will apply to next typed text)
          editor.chain().focus().setLink({ href: finalUrl }).run();
        }
      }
    }

    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    toast.success('Link inserted successfully');
  };

  const handleCancelLink = () => {
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleUnlink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      toast.success('Link removed');
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleOpenTableModal = useCallback(() => {
    if (!editor || !isWysiwygMode) {
      toast.error('Switch to WYSIWYG mode to insert tables');
      return;
    }
    setShowTableModal(true);
  }, [editor, isWysiwygMode]);

  const handleCreateTable = useCallback(() => {
    if (!editor || !isWysiwygMode) return;

    const rows = Math.min(Math.max(parseInt(tableRows, 10) || 0, 1), 20);
    const cols = Math.min(Math.max(parseInt(tableCols, 10) || 0, 1), 12);

    const chain = editor
      .chain()
      .focus()
      .insertTable({
        rows,
        cols,
        withHeaderRow: tableHasHeader,
      });

    if (!tableShowBorder) {
      chain.updateAttributes('table', { borderless: true });
    }

    chain.run();

    setShowTableModal(false);
    setTableRows(rows);
    setTableCols(cols);
  }, [editor, isWysiwygMode, tableRows, tableCols, tableHasHeader, tableShowBorder]);

  const handleCancelTable = useCallback(() => {
    setShowTableModal(false);
  }, []);

  const handleAddTableRow = useCallback(() => {
    if (!editor || !isWysiwygMode) return;
    editor.chain().focus().addRowAfter().run();
  }, [editor, isWysiwygMode]);

  const handleAddTableColumn = useCallback(() => {
    if (!editor || !isWysiwygMode) return;
    editor.chain().focus().addColumnAfter().run();
  }, [editor, isWysiwygMode]);

  const handleDeleteTableRow = useCallback(() => {
    if (!editor || !isWysiwygMode) return;
    editor.chain().focus().deleteRow().run();
  }, [editor, isWysiwygMode]);

  const handleDeleteTableColumn = useCallback(() => {
    if (!editor || !isWysiwygMode) return;
    editor.chain().focus().deleteColumn().run();
  }, [editor, isWysiwygMode]);

  const handleDeleteTable = useCallback(() => {
    if (!editor || !isWysiwygMode) return;
    editor.chain().focus().deleteTable().run();
  }, [editor, isWysiwygMode]);

  const handleClearFormatting = useCallback(() => {
    if (!editor || !isWysiwygMode) return;
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }, [editor, isWysiwygMode]);

  const handleInsertHorizontalRule = useCallback(() => {
    if (!editor || !isWysiwygMode) return;
    editor.chain().focus().setHorizontalRule().run();
  }, [editor, isWysiwygMode]);

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const textContent = text.replace(/<[^>]*>/g, '');
    const wordCount = textContent.trim().split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes;
  };

  if (!editor) {
    return null;
  }

  const editorCan = editor?.can?.();
  const isTableActive = editor?.isActive('table') ?? false;
  const disableFormatting = !editor || !isWysiwygMode;
  const disableTableManipulation = disableFormatting || !isTableActive;
  const canIndent = Boolean(isWysiwygMode && editorCan?.sinkListItem?.('listItem'));
  const canOutdent = Boolean(isWysiwygMode && editorCan?.liftListItem?.('listItem'));
  const canUndo = Boolean(editorCan?.undo?.());
  const canRedo = Boolean(editorCan?.redo?.());
  const readingSource = isMarkdown ? markdownContent : editor.getHTML();
  const wordCount = editor.storage.characterCount?.words() || 0;
  const characterCount = editor.storage.characterCount?.characters() || 0;
  const readingTime = calculateReadingTime(readingSource);

  const ToolbarButton = ({ onClick, isActive = false, children, title, disabled = false }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onClick) {
          onClick(e);
        }
      }}
      disabled={disabled}
      title={title}
      aria-pressed={isActive}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] dark:bg-emerald-900/50 dark:text-emerald-200'
          : `hover:bg-[var(--accent-soft)] ${isDark ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );

  const editorContent = (
    <div className={`rich-text-editor border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--surface-bg)] transition-colors ${isFullscreen ? 'rounded-none h-full flex flex-col' : ''}`} style={isFullscreen && isDark ? { backgroundColor: '#0F172A', borderColor: '#334155' } : isFullscreen ? { backgroundColor: '#ffffff', borderColor: '#E2E8F0' } : {}}>
      {/* Toolbar */}
      <div className={`border-b border-[var(--border-subtle)] ${isDark ? 'bg-[var(--surface-bg)]' : 'bg-[var(--surface-subtle)]'} p-2 flex flex-wrap items-center gap-1 overflow-x-auto flex-shrink-0`} style={isFullscreen && isDark ? { backgroundColor: '#0F172A', borderColor: '#334155' } : {}}>
        {/* Formatting */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title={getWysiwygTitle('Bold (Ctrl+B)')}
            disabled={disableFormatting}
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title={getWysiwygTitle('Italic (Ctrl+I)')}
            disabled={disableFormatting}
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title={getWysiwygTitle('Underline (Ctrl+U)')}
            disabled={disableFormatting}
          >
            <UnderlineIcon size={18} />
          </ToolbarButton>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title={getWysiwygTitle('Heading 1')}
            disabled={disableFormatting}
          >
            <Heading1 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title={getWysiwygTitle('Heading 2')}
            disabled={disableFormatting}
          >
            <Heading2 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title={getWysiwygTitle('Heading 3')}
            disabled={disableFormatting}
          >
            <Heading3 size={18} />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().toggleBulletList().run();
            }}
            isActive={editor.isActive('bulletList')}
            title={getWysiwygTitle('Bullet list')}
            disabled={disableFormatting}
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().toggleOrderedList().run();
            }}
            isActive={editor.isActive('orderedList')}
            title={getWysiwygTitle('Numbered list')}
            disabled={disableFormatting}
          >
            <ListOrdered size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            isActive={false}
            title={getWysiwygTitle('Indent list item')}
            disabled={disableFormatting || !canIndent}
          >
            <Indent size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            isActive={false}
            title={getWysiwygTitle('Outdent list item')}
            disabled={disableFormatting || !canOutdent}
          >
            <Outdent size={18} />
          </ToolbarButton>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title={getWysiwygTitle('Align left')}
            disabled={disableFormatting}
          >
            <AlignLeft size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title={getWysiwygTitle('Align center')}
            disabled={disableFormatting}
          >
            <AlignCenter size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title={getWysiwygTitle('Align right')}
            disabled={disableFormatting}
          >
            <AlignRight size={18} />
          </ToolbarButton>
        </div>

        {/* Code, Quote & Divider */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title={getWysiwygTitle('Code block')}
            disabled={disableFormatting}
          >
            <Code size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title={getWysiwygTitle('Quote')}
            disabled={disableFormatting}
          >
            <Quote size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleInsertHorizontalRule}
            isActive={false}
            title={getWysiwygTitle('Horizontal rule')}
            disabled={disableFormatting}
          >
            <SeparatorHorizontal size={18} />
          </ToolbarButton>
        </div>

        {/* Table tools */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={handleOpenTableModal}
            isActive={isTableActive}
            title={getWysiwygTitle('Insert custom table')}
            disabled={disableFormatting}
          >
            <Grid3x3 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleAddTableRow}
            isActive={false}
            title={getWysiwygTitle('Add row below')}
            disabled={disableTableManipulation}
          >
            <Rows size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleAddTableColumn}
            isActive={false}
            title={getWysiwygTitle('Add column to the right')}
            disabled={disableTableManipulation}
          >
            <Columns size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleDeleteTableRow}
            isActive={false}
            title={getWysiwygTitle('Delete current row')}
            disabled={disableTableManipulation}
          >
            <MinusSquare size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleDeleteTableColumn}
            isActive={false}
            title={getWysiwygTitle('Delete current column')}
            disabled={disableTableManipulation}
          >
            <MinusSquare size={18} className="transform rotate-90" />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleDeleteTable}
            isActive={false}
            title={getWysiwygTitle('Delete table')}
            disabled={disableTableManipulation}
          >
            <Trash2 size={18} />
          </ToolbarButton>
        </div>

        {/* Link & Image */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={handleLink}
            isActive={editor.isActive('link')}
            title={editor.isActive('link') ? getWysiwygTitle('Exit link mode') : getWysiwygTitle('Insert link')}
            disabled={disableFormatting}
          >
            <LinkIcon size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={insertImage}
            title="Insert Image"
            disabled={!editor}
          >
            <ImageIcon size={18} />
          </ToolbarButton>
        </div>

        {/* History & cleanup */}
        <div className="flex items-center gap-1 border-r border-[var(--border-subtle)] pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            isActive={false}
            title={getWysiwygTitle('Undo (Ctrl+Z)')}
            disabled={disableFormatting || !canUndo}
          >
            <Undo2 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            isActive={false}
            title={getWysiwygTitle('Redo (Ctrl+Shift+Z)')}
            disabled={disableFormatting || !canRedo}
          >
            <Redo2 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={handleClearFormatting}
            isActive={false}
            title={getWysiwygTitle('Clear formatting')}
            disabled={disableFormatting}
          >
            <Eraser size={18} />
          </ToolbarButton>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0 z-10 relative">
          <ToolbarButton
            onClick={() => {
              if (editor) {
                setIsMarkdown(!isMarkdown);
              }
            }}
            isActive={isMarkdown}
            disabled={!editor}
            title={isMarkdown ? 'Switch to WYSIWYG' : 'Switch to Markdown'}
          >
            {isMarkdown ? <Type size={18} /> : <FileText size={18} />}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              setIsPreview(!isPreview);
            }}
            isActive={isPreview}
            disabled={!editor}
            title="Toggle Preview"
          >
            {isPreview ? <EyeOff size={18} /> : <Eye size={18} />}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              setIsFullscreen(!isFullscreen);
            }}
            isActive={isFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <div className={`relative ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
        {isPreview ? (
          <div className={`p-2 sm:p-4 ${isFullscreen ? 'flex-1 overflow-y-auto' : 'min-h-[300px] sm:min-h-[400px] max-h-[400px] sm:max-h-[600px] overflow-y-auto'} ${isDark ? 'bg-[var(--surface-bg)] text-[var(--text-primary)]' : 'bg-[var(--surface-bg)]'}`}>
            {isMarkdown ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className={isDark ? 'prose prose-invert max-w-none' : 'prose max-w-none'}
              >
                {markdownContent}
              </ReactMarkdown>
            ) : (
              <div
                className={isDark ? 'prose prose-invert max-w-none' : 'prose max-w-none'}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(editor.getHTML(), {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'video', 'div', 'span', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col'],
                    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel', 'colspan', 'rowspan', 'width', 'data-borderless'],
                    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
                  })
                }}
              />
            )}
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
            className={`w-full min-h-[300px] sm:min-h-[400px] p-2 sm:p-4 border-0 focus:outline-none resize-none font-mono text-sm transition-colors ${
              isDark
                ? 'bg-[var(--surface-bg)] text-[var(--text-primary)] caret-[var(--accent)]'
                : 'bg-[var(--surface-bg)] text-[var(--text-primary)] caret-[var(--text-primary)]'
            }`}
            style={isDark ? { 
              color: '#f3f4f6', 
              caretColor: '#f3f4f6' 
            } : { 
              color: 'var(--text-primary)', 
              caretColor: 'var(--text-primary)' 
            }}
            placeholder={placeholder}
          />
        ) : (
          <div 
            className={`${isFullscreen && isDark ? '' : isDark ? 'bg-[var(--surface-bg)]' : 'bg-[var(--surface-bg)]'} ${isFullscreen ? 'flex-1 overflow-y-auto h-full' : ''}`} 
            style={isFullscreen && isDark ? { 
              backgroundColor: '#1E293B', 
              background: '#1E293B',
              color: '#F1F5F9' 
            } : isFullscreen ? { 
              backgroundColor: '#ffffff', 
              color: '#0F172A' 
            } : {}}
            ref={(el) => {
              if (el && isFullscreen && isDark) {
                // Remove any background classes
                Array.from(el.classList).forEach(cls => {
                  if (cls.includes('bg-')) {
                    el.classList.remove(cls);
                  }
                });
                el.style.setProperty('background-color', '#1E293B', 'important');
                el.style.setProperty('background', '#1E293B', 'important');
                el.style.backgroundColor = '#1E293B';
                el.style.background = '#1E293B';
              }
            }}
          >
            <EditorContent editor={editor} />
          </div>
        )}

        {/* Stats Bar */}
        <div className={`border-t border-[var(--border-subtle)] px-4 py-2 flex items-center justify-between text-xs flex-wrap gap-2 transition-colors ${
          isDark ? 'bg-[var(--surface-bg)] text-[var(--text-muted)]' : 'bg-[var(--surface-subtle)] text-[var(--text-primary)]'
        }`}>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span>{wordCount} words</span>
            <span className="hidden sm:inline">{characterCount} characters</span>
            <span>~{readingTime} min read</span>
            {isSaving ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Spinner size="xs" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Saving</span>
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Save size={12} />
                <span className="hidden sm:inline">Saved {lastSaved.toLocaleTimeString()}</span>
                <span className="sm:hidden">Saved</span>
              </span>
            ) : null}
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
      <>
        <div 
          className="fixed inset-0 z-50"
          style={{
            backgroundColor: isDark ? '#0F172A' : '#ffffff'
          }}
        >
          {editorContent}
        </div>
        <style>{`
          [data-fullscreen-editor="true"] {
            background-color: ${isDark ? '#0F172A' : '#ffffff'} !important;
          }
          [data-fullscreen-editor="true"] .rich-text-editor {
            background-color: ${isDark ? '#0F172A' : '#ffffff'} !important;
            background: ${isDark ? '#0F172A' : '#ffffff'} !important;
          }
          [data-fullscreen-editor="true"] .rich-text-editor > div.relative {
            background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
            background: ${isDark ? '#1E293B' : '#ffffff'} !important;
          }
          [data-fullscreen-editor="true"] .rich-text-editor > div.relative > div,
          [data-fullscreen-editor="true"] div.relative > div,
          [data-fullscreen-editor="true"] .rich-text-editor div.relative div {
            background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
            background: ${isDark ? '#1E293B' : '#ffffff'} !important;
          }
          /* Target the wrapper div that contains EditorContent */
          [data-fullscreen-editor="true"] .rich-text-editor > div.relative > div[class*="flex"],
          [data-fullscreen-editor="true"] .rich-text-editor div[class*="overflow-y-auto"],
          [data-fullscreen-editor="true"] .rich-text-editor div[class*="h-full"] {
            background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
            background: ${isDark ? '#1E293B' : '#ffffff'} !important;
          }
          [data-fullscreen-editor="true"] .rich-text-editor .ProseMirror,
          [data-fullscreen-editor="true"] .ProseMirror,
          [data-fullscreen-editor="true"] div.ProseMirror,
          [data-fullscreen-editor="true"] .rich-text-editor div.ProseMirror,
          [data-fullscreen-editor="true"] .ProseMirror.prose,
          [data-fullscreen-editor="true"] .ProseMirror[class*="prose"] {
            min-height: auto !important;
            height: 100% !important;
            border-radius: 0 !important;
            border: none !important;
            background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
            background: ${isDark ? '#1E293B' : '#ffffff'} !important;
            color: ${isDark ? '#F1F5F9' : '#0F172A'} !important;
            padding: 1.5rem !important;
          }
          /* Maximum specificity override for ProseMirror - target all possible selectors */
          [data-fullscreen-editor="true"] .rich-text-editor > div.relative > div > .ProseMirror,
          [data-fullscreen-editor="true"] .rich-text-editor > div > div > .ProseMirror,
          [data-fullscreen-editor="true"] div.relative div.ProseMirror,
          [data-fullscreen-editor="true"] .rich-text-editor div.relative .ProseMirror,
          [data-fullscreen-editor="true"] .ProseMirror.editor,
          [data-fullscreen-editor="true"] .ProseMirror[contenteditable] {
            background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
            background: ${isDark ? '#1E293B' : '#ffffff'} !important;
          }
          /* Override any Tailwind classes that might be setting white background */
          [data-fullscreen-editor="true"] .ProseMirror.bg-\\[var\\(--surface-bg\\)\\],
          [data-fullscreen-editor="true"] .ProseMirror.bg-white,
          [data-fullscreen-editor="true"] .ProseMirror[class*="bg-"] {
            background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
            background: ${isDark ? '#1E293B' : '#ffffff'} !important;
          }
          [data-fullscreen-editor="true"] .rich-text-editor .ProseMirror * {
            color: ${isDark ? '#F1F5F9' : '#0F172A'} !important;
          }
          .rich-text-editor .ProseMirror p,
          .rich-text-editor .ProseMirror h1,
          .rich-text-editor .ProseMirror h2,
          .rich-text-editor .ProseMirror h3,
          .rich-text-editor .ProseMirror h4,
          .rich-text-editor .ProseMirror h5,
          .rich-text-editor .ProseMirror h6,
          .rich-text-editor .ProseMirror li,
          .rich-text-editor .ProseMirror span,
          .rich-text-editor .ProseMirror strong,
          .rich-text-editor .ProseMirror em,
          .rich-text-editor .ProseMirror blockquote {
            color: ${isDark ? '#F1F5F9' : '#0F172A'} !important;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      {editorContent}
      <style>{`
        .rich-text-editor .ProseMirror {
          outline: none;
          background-color: var(--surface-bg) !important;
          color: var(--text-primary) !important;
          caret-color: var(--accent) !important;
          border-radius: 0.75rem;
          padding: 1.5rem;
          min-height: 320px;
          border: 1px solid var(--border-subtle);
        }
        ${isFullscreen && isDark ? `
        .rich-text-editor .ProseMirror::selection {
          background-color: rgba(255, 255, 255, 0.2) !important;
        }
        ` : ''}
        ${isFullscreen ? `
        [data-fullscreen-editor="true"],
        [data-fullscreen-editor="true"] *,
        .rich-text-editor,
        .rich-text-editor * {
          background-color: ${isDark ? '#0F172A' : '#ffffff'} !important;
        }
        .rich-text-editor > div.relative,
        .rich-text-editor > div.relative * {
          background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
        }
        .rich-text-editor .ProseMirror {
          min-height: auto !important;
          height: 100% !important;
          border-radius: 0 !important;
          border: none !important;
          background-color: ${isDark ? '#1E293B' : '#ffffff'} !important;
          background: ${isDark ? '#1E293B' : '#ffffff'} !important;
          color: ${isDark ? '#F1F5F9' : '#0F172A'} !important;
          caret-color: ${isDark ? '#FFFFFF' : '#0F172A'} !important;
          padding: 1.5rem !important;
        }
        .rich-text-editor .ProseMirror * {
          background-color: transparent !important;
          color: ${isDark ? '#F1F5F9' : '#0F172A'} !important;
        }
        .rich-text-editor .ProseMirror p,
        .rich-text-editor .ProseMirror h1,
        .rich-text-editor .ProseMirror h2,
        .rich-text-editor .ProseMirror h3,
        .rich-text-editor .ProseMirror h4,
        .rich-text-editor .ProseMirror h5,
        .rich-text-editor .ProseMirror h6,
        .rich-text-editor .ProseMirror li,
        .rich-text-editor .ProseMirror span,
        .rich-text-editor .ProseMirror strong,
        .rich-text-editor .ProseMirror em,
        .rich-text-editor .ProseMirror blockquote,
        .rich-text-editor .ProseMirror div {
          color: ${isDark ? '#F1F5F9' : '#0F172A'} !important;
          background-color: transparent !important;
        }
        .rich-text-editor .border-b {
          background-color: ${isDark ? '#0F172A' : '#ffffff'} !important;
          border-color: ${isDark ? '#334155' : '#E2E8F0'} !important;
        }
        ` : ''}
        .rich-text-editor .ProseMirror p {
          line-height: 1.6;
          margin-bottom: 0.85em;
          margin-top: 0;
          color: inherit;
        }
        .rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }
        .rich-text-editor .ProseMirror code {
          background-color: rgba(148, 163, 184, 0.18);
          color: var(--text-primary);
          padding: 0.2em 0.45em;
          border-radius: 0.4rem;
          font-size: 0.92em;
        }
        .rich-text-editor .ProseMirror pre {
          background: var(--surface-subtle);
          color: var(--text-primary);
          padding: 1rem;
          border-radius: 0.75rem;
          overflow-x: auto;
        }
        .rich-text-editor .ProseMirror pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
        .rich-text-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .rich-text-editor .ProseMirror blockquote {
          border-left: 4px solid var(--accent);
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
        }
        .rich-text-editor .ProseMirror table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          table-layout: fixed;
          border: 1px solid var(--border-subtle);
        }
        .rich-text-editor .ProseMirror table:first-child {
          margin-top: 0;
        }
        .rich-text-editor .ProseMirror table:last-child {
          margin-bottom: 0;
        }
        .rich-text-editor .ProseMirror p + table {
          margin-top: 0.75em;
        }
        .rich-text-editor .ProseMirror table + p {
          margin-top: 0.75em;
        }
        .rich-text-editor .ProseMirror th,
        .rich-text-editor .ProseMirror td {
          border: 1px solid var(--border-subtle);
          text-align: left;
          vertical-align: top;
        }
        .rich-text-editor .ProseMirror th {
          background-color: rgba(148, 163, 184, 0.08);
          font-weight: 600;
          padding: 0.5rem 1rem;
        }
        .rich-text-editor .ProseMirror td {
          padding: 0.75rem 1rem 0.5rem 1rem;
        }
        .rich-text-editor .ProseMirror .selectedCell {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }
        .rich-text-editor .ProseMirror table[data-borderless="true"],
        .prose table[data-borderless="true"] {
          border: none;
        }
        .rich-text-editor .ProseMirror table[data-borderless="true"] th,
        .rich-text-editor .ProseMirror table[data-borderless="true"] td,
        .prose table[data-borderless="true"] th,
        .prose table[data-borderless="true"] td {
          border-color: transparent;
        }
        .rich-text-editor .ProseMirror ul, .rich-text-editor .ProseMirror ol {
          padding-left: 1.5rem;
          list-style-position: outside;
        }
        .rich-text-editor .ProseMirror ul {
          list-style-type: disc;
        }
        .rich-text-editor .ProseMirror ol {
          list-style-type: decimal;
        }
        .rich-text-editor .ProseMirror li {
          display: list-item;
          margin-left: 0;
        }
        .rich-text-editor .ProseMirror h1, .rich-text-editor .ProseMirror h2, .rich-text-editor .ProseMirror h3 {
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .rich-text-editor .ProseMirror h1 {
          font-size: 2rem;
        }
        .rich-text-editor .ProseMirror h2 {
          font-size: 1.5rem;
        }
        .rich-text-editor .ProseMirror h3 {
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
        .dark .ProseMirror th,
        .dark .ProseMirror td {
          border-color: #374151;
        }
        .dark .ProseMirror th {
          background-color: rgba(243, 244, 246, 0.05);
        }
        .dark .ProseMirror {
          caret-color: #f3f4f6 !important;
          color: #f3f4f6 !important;
        }
        .dark .ProseMirror h1,
        .dark .ProseMirror h2,
        .dark .ProseMirror h3,
        .dark .ProseMirror h4,
        .dark .ProseMirror h5,
        .dark .ProseMirror h6 {
          color: #f3f4f6 !important;
          caret-color: #f3f4f6 !important;
        }
        .dark .ProseMirror p,
        .dark .ProseMirror li,
        .dark .ProseMirror span,
        .dark .ProseMirror div,
        .dark .ProseMirror strong,
        .dark .ProseMirror em {
          color: #f3f4f6 !important;
        }
        .dark .ProseMirror * {
          caret-color: #f3f4f6 !important;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .prose table:first-child {
          margin-top: 0;
        }
        .prose table:last-child {
          margin-bottom: 0;
        }
        .prose p + table {
          margin-top: 0.75em;
        }
        .prose table + p {
          margin-top: 0.75em;
        }
        .prose th,
        .prose td {
          border: 1px solid rgba(148, 163, 184, 0.4);
          text-align: left;
        }
        .prose th {
          background-color: rgba(15, 23, 42, 0.05);
          padding: 0.5rem 1rem;
        }
        .prose td {
          padding: 0.75rem 1rem 0.5rem 1rem;
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

      {/* Link Modal */}
      {showLinkModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleCancelLink}
        >
          <div 
            className="bg-[var(--surface-bg)] dark:bg-[var(--surface-bg)] rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Insert Link
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertLink();
                    } else if (e.key === 'Escape') {
                      handleCancelLink();
                    }
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                  Link Text (Optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text"
                  className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertLink();
                    } else if (e.key === 'Escape') {
                      handleCancelLink();
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              {editor.isActive('link') && (
                <button
                  onClick={handleUnlink}
                  className="px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  Remove Link
                </button>
              )}
              <div className="flex justify-end gap-3 ml-auto">
                <button
                  onClick={handleCancelLink}
                  className="px-4 py-2 text-[var(--text-secondary)] bg-[var(--surface-subtle)] rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertLink}
                  className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                >
                  {editor.isActive('link') ? 'Update Link' : 'Insert Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCancelTable}
        >
          <div
            className="bg-[var(--surface-bg)] dark:bg-[var(--surface-bg)] rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              Insert Table
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                  Rows
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={tableCols}
                  onChange={(e) => setTableCols(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--surface-bg)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                id="table-header-toggle"
                type="checkbox"
                checked={tableHasHeader}
                onChange={(e) => setTableHasHeader(e.target.checked)}
                className="h-4 w-4 text-[var(--accent)] border-[var(--border-subtle)] rounded focus:ring-[var(--accent)]"
              />
              <label
                htmlFor="table-header-toggle"
                className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] select-none"
              >
                Include header row
              </label>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                id="table-border-toggle"
                type="checkbox"
                checked={tableShowBorder}
                onChange={(e) => setTableShowBorder(e.target.checked)}
                className="h-4 w-4 text-[var(--accent)] border-[var(--border-subtle)] rounded focus:ring-[var(--accent)]"
              />
              <label
                htmlFor="table-border-toggle"
                className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] select-none"
              >
                Show table borders
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelTable}
                className="px-4 py-2 text-[var(--text-secondary)] bg-[var(--surface-subtle)] rounded-lg hover:bg-[var(--accent-soft)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RichTextEditor;

