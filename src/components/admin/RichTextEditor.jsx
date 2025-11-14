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

// Create extensions array once at module level to avoid duplicates
// StarterKit includes: Blockquote, Bold, BulletList, Code, CodeBlock, Document, 
// Dropcursor, Gapcursor, HardBreak, Heading, History, HorizontalRule, Italic, 
// ListItem, OrderedList, Paragraph, Strike, Text
// It does NOT include Link or Underline, so we add them separately
// We create a function that returns extensions with a dynamic placeholder
let cachedExtensions = null;
let cachedPlaceholder = null;

const getExtensions = (placeholderText) => {
  // Only recreate if placeholder changes, otherwise reuse cached extensions
  if (cachedExtensions && cachedPlaceholder === placeholderText) {
    return cachedExtensions;
  }
  
  cachedExtensions = [
    StarterKit.configure({
      codeBlock: false, // We'll use CodeBlockLowlight instead
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }),
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
  const autosaveTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isUpdatingRef = useRef(false);
  
  // Get extensions - cached at module level to prevent duplicates
  const extensions = getExtensions(placeholder);

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
    extensions,
    content: value || '',
    immediatelyRender: false,
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
          ? 'prose prose-invert max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] dark:text-gray-100 bg-gray-800'
          : 'prose max-w-none focus:outline-none p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] text-[var(--text-primary)] bg-white',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMarkdown, editor]);

  // Flag to prevent infinite loops
  const isApplyingStylesRef = useRef(false);
  const styleTimeoutRef = useRef(null);

  // Function to apply dark mode styles to editor content
  const applyDarkModeStyles = useCallback(() => {
    if (!editor || isApplyingStylesRef.current) return;
    
    isApplyingStylesRef.current = true;
    
    try {
      const editorElement = editor.view.dom.closest('.ProseMirror') || editor.view.dom;
      if (!editorElement) return;
      
      if (isDark) {
        // Set cursor color on the editor element itself
        editorElement.style.setProperty('caret-color', '#f3f4f6', 'important');
        editorElement.style.setProperty('color', '#f3f4f6', 'important');
        
        // Specifically target headers first with more aggressive approach
        const headers = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headers.forEach(header => {
          header.style.setProperty('color', '#f3f4f6', 'important');
          header.style.setProperty('caret-color', '#f3f4f6', 'important');
          // Also set on any text nodes or nested elements within headers
          const headerChildren = header.querySelectorAll('*');
          headerChildren.forEach(child => {
            child.style.setProperty('color', '#f3f4f6', 'important');
          });
        });
        
        // Force all text elements to be light in dark mode with !important
        const allTextElements = editorElement.querySelectorAll('p, li, span, strong, em, blockquote, div');
        allTextElements.forEach(el => {
          el.style.setProperty('color', '#f3f4f6', 'important');
          el.style.setProperty('caret-color', '#f3f4f6', 'important');
        });
        
        // Also set on any nested elements that might be headers
        const allElements = editorElement.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.tagName && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
            el.style.setProperty('color', '#f3f4f6', 'important');
            el.style.setProperty('caret-color', '#f3f4f6', 'important');
          } else if (el.tagName && ['P', 'LI', 'SPAN', 'STRONG', 'EM', 'BLOCKQUOTE', 'DIV'].includes(el.tagName)) {
            el.style.setProperty('color', '#f3f4f6', 'important');
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
  }, [editor, isDark]);

  // Toggle dark mode - apply to editor and parent container
  useEffect(() => {
    if (!editor) return;
    
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
      editorElement.style.backgroundColor = '#1f2937'; // bg-gray-800
      editorElement.style.color = '#f3f4f6'; // text-gray-100
      editorElement.style.caretColor = '#f3f4f6'; // cursor color
      } else {
        editorElement.classList.remove('dark');
      editorElement.classList.remove('prose-invert');
      editorElement.style.backgroundColor = '#ffffff'; // bg-white
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
  }, [isDark, editor, applyDarkModeStyles]);

  // Reapply dark mode styles when editor content updates
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      if (isApplyingStylesRef.current) return;
      
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

  const handleLink = (e) => {
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
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onClick) {
          onClick(e);
        }
      }}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] dark:bg-emerald-900/50 dark:text-emerald-200'
          : `hover:bg-[var(--accent-soft)] dark:hover:bg-gray-700 ${isDark ? 'text-gray-300' : 'text-[var(--text-primary)]'}`
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );

  const editorContent = (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} transition-colors ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
      {/* Toolbar */}
      <div className={`border-b border-[var(--border-subtle)] dark:border-gray-700 ${isDark ? 'bg-gray-900' : 'bg-[var(--surface-subtle)]'} p-2 flex flex-wrap items-center gap-1 overflow-x-auto`}>
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
            onClick={() => {
              editor.chain().focus().toggleBulletList().run();
            }}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().toggleOrderedList().run();
            }}
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
            title={editor.isActive('link') ? 'Exit Link Mode' : 'Insert Link'}
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
      <div className="relative">
        {isPreview ? (
          <div className={`p-2 sm:p-4 min-h-[300px] sm:min-h-[400px] max-h-[400px] sm:max-h-[600px] overflow-y-auto ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white'}`}>
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
            className={`w-full min-h-[300px] sm:min-h-[400px] p-2 sm:p-4 border-0 focus:outline-none resize-none font-mono text-sm transition-colors ${
              isDark
                ? 'bg-gray-800 text-gray-100 caret-gray-100'
                : 'bg-white text-[var(--text-primary)] caret-[var(--text-primary)]'
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
          <div className={isDark ? 'bg-gray-800' : 'bg-white'}>
          <EditorContent editor={editor} />
          </div>
        )}

        {/* Stats Bar */}
        <div className={`border-t border-[var(--border-subtle)] dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs flex-wrap gap-2 transition-colors ${
          isDark ? 'bg-gray-900 text-gray-400' : 'bg-[var(--surface-subtle)] text-[var(--text-primary)]'
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
        .ProseMirror p {
          line-height: 1.4;
          margin-bottom: 0.75em;
          margin-top: 0;
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
          list-style-position: outside;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          display: list-item;
          margin-left: 0;
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)] dark:text-gray-100">
              Insert Link
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-gray-300 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] dark:bg-gray-700 dark:text-gray-100"
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
                <label className="block text-sm font-medium text-[var(--text-secondary)] dark:text-gray-300 mb-2">
                  Link Text (Optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] dark:bg-gray-700 dark:text-gray-100"
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
                  className="px-4 py-2 text-[var(--text-secondary)] dark:text-gray-300 bg-[var(--surface-subtle)] dark:bg-gray-700 rounded-lg hover:bg-[var(--accent-soft)] dark:hover:bg-gray-600 transition-colors"
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
    </>
  );
};

export default RichTextEditor;
