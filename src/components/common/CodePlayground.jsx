import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Copy, Check, Code, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CodePlayground = ({ code, language = 'javascript', editable = true }) => {
  const [editedCode, setEditedCode] = useState(code);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const runCode = () => {
    if (!editable) return;
    
    setIsRunning(true);
    setOutput('');

    try {
      if (language === 'javascript' || language === 'js') {
        // Create a safe execution environment
        const consoleLogs = [];
        const originalLog = console.log;
        console.log = (...args) => {
          consoleLogs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
        };

        try {
          // SECURITY WARNING: Using eval() is dangerous. Only use in trusted/admin contexts.
          // Consider using a sandboxed environment or disabling in production.
          const result = eval(editedCode);
          if (result !== undefined) {
            consoleLogs.push(String(result));
          }
        } catch (error) {
          consoleLogs.push(`Error: ${error.message}`);
        }

        console.log = originalLog;
        setOutput(consoleLogs.join('\n'));
      } else if (language === 'html') {
        // For HTML, render in iframe
        if (iframeRef.current) {
          const iframe = iframeRef.current;
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.open();
          doc.write(editedCode);
          doc.close();
        }
      } else {
        setOutput('Code execution not supported for this language');
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(editedCode);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300 uppercase">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <button
              onClick={runCode}
              disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
          <button
            onClick={copyCode}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="relative">
        {editable ? (
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="w-full h-64 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
            placeholder="Enter your code here..."
          />
        ) : (
          <pre className="p-4 bg-gray-900 text-gray-100 font-mono text-sm overflow-x-auto">
            <code>{editedCode}</code>
          </pre>
        )}
      </div>

      {/* Output */}
      {(output || language === 'html') && (
        <div className="border-t border-gray-700">
          <div className="px-4 py-2 bg-gray-800 text-sm text-gray-400">
            {language === 'html' ? 'Preview' : 'Output'}
          </div>
          {language === 'html' ? (
            <iframe
              ref={iframeRef}
              className="w-full h-64 border-0"
              title="Code preview"
            />
          ) : (
            <pre className="p-4 bg-gray-900 text-gray-100 font-mono text-sm overflow-x-auto">
              {output || 'No output'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default CodePlayground;

