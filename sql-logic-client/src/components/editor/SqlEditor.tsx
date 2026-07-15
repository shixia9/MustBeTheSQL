import React, { useEffect, useRef } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { useSettings } from '../../contexts/SettingsContext';
import { Loader2 } from 'lucide-react';

interface SqlEditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: string;
  readOnly?: boolean;
  onMount?: OnMount;
  editorRef?: React.MutableRefObject<any>;
  errorLine?: number | null;
  onExecuteAll?: () => void;
  onExecuteCurrent?: () => void;
}

export default function SqlEditor({ value, onChange, language = 'mysql', readOnly = false, onMount, editorRef, errorLine, onExecuteAll, onExecuteCurrent }: SqlEditorProps) {
  const { fontSize } = useSettings();
  const internalEditorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (internalEditorRef.current && monacoRef.current) {
      const editor = internalEditorRef.current;
      const monaco = monacoRef.current;
      
      if (errorLine && errorLine > 0) {
        const newDecorations = [{
          range: new monaco.Range(errorLine, 1, errorLine, 1),
          options: {
            isWholeLine: true,
            className: 'bg-error/20 border-l-4 border-error',
            glyphMarginClassName: 'bg-error',
            linesDecorationsClassName: 'bg-error w-1 text-transparent'
          }
        }];
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
        // Also scroll to the error line
        editor.revealLineInCenter(errorLine);
      } else {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      }
    }
  }, [errorLine]);

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('logicLedgerTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: 'a3e635' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'number', foreground: 'f472b6' },
        { token: 'operator', foreground: '94a3b8' },
        { token: 'identifier', foreground: 'e2e8f0' },
        { token: 'predefined', foreground: 'c084fc' },
      ],
      colors: {
        'editor.background': '#1e2433',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#33415550',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editorIndentGuide.background': '#334155',
        'editor.selectionBackground': '#38bdf830',
        'editorCursor.foreground': '#38bdf8',
        'editorWidget.background': '#0f172a',
        'editorWidget.border': '#334155',
        'editorSuggestWidget.background': '#0f172a',
        'editorSuggestWidget.border': '#334155',
        'editorSuggestWidget.selectedBackground': '#1e293b',
      }
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    internalEditorRef.current = editor;
    monacoRef.current = monaco;
    
    if (editorRef) {
      editorRef.current = editor;
    }
    
    // Bind Ctrl+Enter for Execute All
    if (onExecuteAll) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onExecuteAll();
      });
    }
    
    // Bind Ctrl+Shift+Enter for Execute Current
    if (onExecuteCurrent) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
        onExecuteCurrent();
      });
    }

    // Bind Ctrl+Shift+F for Format Document
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument').run();
    });

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  return (
    <Editor
      value={value}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      onChange={(val) => onChange && onChange(val || '')}
      language={language}
      theme="logicLedgerTheme"
      options={{
        readOnly: readOnly,
        minimap: { enabled: false },
        fontSize: fontSize,
        fontFamily: "'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
        lineHeight: 1.6,
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'all',
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      }}
      loading={
        <div className="flex items-center justify-center h-full text-slate-500">
          <Loader2 size={24} className="animate-spin opacity-50" />
        </div>
      }
    />
  );
}