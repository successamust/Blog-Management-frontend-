import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const selectRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current) {
      const initialContent = value || '';
      if (editorRef.current.innerHTML !== initialContent) {
        editorRef.current.innerHTML = initialContent;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update content when value changes (but not while user is typing)
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      const currentContent = editorRef.current.innerHTML;
      const newContent = value || '';
      // Only update if content changed and editor is not focused
      if (currentContent !== newContent && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = newContent;
      }
    }
  }, [value]);

  const handleInput = (e) => {
    const html = e.target.innerHTML;
    onChange(html);
  };

  const execCommand = (command, value = null) => {
    if (!editorRef.current) return;
    
    // Focus the editor
    editorRef.current.focus();
    
    // For commands that need selection (bold, italic, etc.), ensure we have a selection
    const needsSelection = ['bold', 'italic', 'underline', 'strikeThrough', 'createLink'].includes(command);
    
    if (needsSelection) {
      const selection = window.getSelection();
      // If no selection or collapsed, select the word at cursor or current block
      if (!selection.rangeCount || selection.isCollapsed) {
        const range = document.createRange();
        const anchorNode = selection.anchorNode;
        
        if (anchorNode && anchorNode.nodeType === Node.TEXT_NODE) {
          // Try to select the word at cursor
          const text = anchorNode.textContent;
          const offset = selection.anchorOffset;
          let start = offset;
          let end = offset;
          
          // Find word boundaries
          while (start > 0 && /\S/.test(text[start - 1])) start--;
          while (end < text.length && /\S/.test(text[end])) end++;
          
          if (start < end) {
            range.setStart(anchorNode, start);
            range.setEnd(anchorNode, end);
          } else {
            // Fallback: select the entire text node
            range.selectNodeContents(anchorNode);
          }
        } else {
          // Fallback: select all content
          range.selectNodeContents(editorRef.current);
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    
    // Execute the command
    const success = document.execCommand(command, false, value);
    
    // Update the value after command execution
    setTimeout(() => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML || '';
        onChange(html);
      }
    }, 0);
    
    return success;
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url && url.trim()) {
      // Ensure URL has protocol
      let finalUrl = url.trim();
      if (!finalUrl.match(/^https?:\/\//)) {
        finalUrl = 'https://' + finalUrl;
      }
      execCommand('createLink', finalUrl);
    }
  };

  const ToolbarButton = ({ onClick, children, title, isActive = false }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-gray-200' : ''
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1">
        <ToolbarButton onClick={() => execCommand('bold')} title="Bold">
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Italic">
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Underline">
          <Underline size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Numbered List">
          <List size={18} className="transform rotate-90" />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Align Left">
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Align Center">
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Align Right">
          <AlignRight size={18} />
        </ToolbarButton>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <ToolbarButton onClick={insertLink} title="Insert Link">
          <LinkIcon size={18} />
        </ToolbarButton>
        <div className="flex-1" />
        <select
          ref={selectRef}
          onChange={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const format = e.target.value;
            if (!format || !editorRef.current) {
              if (selectRef.current) selectRef.current.value = '';
              return;
            }
            
            const selectedFormat = format;
            
            // Focus the editor
            editorRef.current.focus();
            
            // Get current selection
            const selection = window.getSelection();
            
            // Helper function to find block element
            const findBlockElement = (node) => {
              while (node && node !== editorRef.current) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const tagName = node.tagName?.toLowerCase();
                  if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'blockquote', 'li'].includes(tagName)) {
                    return node;
                  }
                }
                node = node.parentNode;
              }
              return null;
            };
            
            // Find the current block element
            let blockElement = null;
            
            if (selection.anchorNode) {
              blockElement = findBlockElement(selection.anchorNode);
            }
            
            // If no block found, find or create one
            if (!blockElement || blockElement === editorRef.current) {
              // Check if editor has any element children
              const firstElement = editorRef.current.firstElementChild;
              
              if (firstElement) {
                // Use first element child
                blockElement = firstElement;
              } else {
                // No block elements, need to wrap content
                const p = document.createElement('p');
                
                // Check if there's any content
                if (editorRef.current.childNodes.length === 0) {
                  // Editor is empty, add non-breaking space
                  p.textContent = '\u00A0';
                } else {
                  // Move all children to paragraph
                  while (editorRef.current.firstChild) {
                    p.appendChild(editorRef.current.firstChild);
                  }
                }
                
                editorRef.current.appendChild(p);
                blockElement = p;
              }
            }
            
            // Now replace the block element with the new format
            if (blockElement && blockElement !== editorRef.current && blockElement.parentNode) {
              try {
                // Create new element with desired format
                const newElement = document.createElement(selectedFormat);
                
                // Move all children from old element to new element
                while (blockElement.firstChild) {
                  newElement.appendChild(blockElement.firstChild);
                }
                
                // If new element is empty, add a non-breaking space
                if (!newElement.hasChildNodes() || !newElement.textContent.trim()) {
                  newElement.textContent = '\u00A0';
                }
                
                // Replace the old element with new element
                blockElement.parentNode.replaceChild(newElement, blockElement);
                
                // Select the new element
                const range = document.createRange();
                range.selectNodeContents(newElement);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Update the value immediately
                const html = editorRef.current.innerHTML || '';
                onChange(html);
                
                // Reset select
                setTimeout(() => {
                  if (selectRef.current) {
                    selectRef.current.value = '';
                  }
                }, 10);
              } catch (error) {
                console.error('Error applying format:', error);
                if (selectRef.current) {
                  selectRef.current.value = '';
                }
              }
            } else {
              console.warn('Could not find block element to format', { blockElement, editor: editorRef.current });
              if (selectRef.current) {
                selectRef.current.value = '';
              }
            }
          }}
          className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
          defaultValue=""
        >
          <option value="">Format...</option>
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="blockquote">Quote</option>
        </select>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`min-h-[300px] p-4 focus:outline-none ${
          isFocused ? 'ring-2 ring-blue-500' : ''
        }`}
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
        }}
        data-placeholder={placeholder || "Write your post content here..."}
      />
      
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;

