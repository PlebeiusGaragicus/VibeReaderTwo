import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, ChevronDown, ChevronRight, Code2 } from 'lucide-react';
import { epubService } from '../../services/epubService';

interface ScriptViewerProps {
  onClose: () => void;
}

interface ScriptData {
  file: string;
  scripts: {
    content: string;
    src?: string;
    type?: string;
  }[];
}

export function ScriptViewer({ onClose }: ScriptViewerProps) {
  const [scripts, setScripts] = useState<ScriptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      setLoading(true);
      setError(null);
      const extractedScripts = await epubService.extractScripts();
      setScripts(extractedScripts);
      
      // Auto-expand if there's only one file
      if (extractedScripts.length === 1) {
        setExpandedFiles(new Set([extractedScripts[0].file]));
      }
    } catch (err) {
      console.error('Error loading scripts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (file: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(file)) {
      newExpanded.delete(file);
    } else {
      newExpanded.add(file);
    }
    setExpandedFiles(newExpanded);
  };

  const toggleScript = (key: string) => {
    const newExpanded = new Set(expandedScripts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedScripts(newExpanded);
  };

  const getTotalScriptCount = () => {
    return scripts.reduce((sum, file) => sum + file.scripts.length, 0);
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col z-20">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          <h2 className="font-semibold">EPUB Scripts (Debug)</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Code2 className="w-8 h-8 animate-pulse mx-auto mb-2" />
            <p>Scanning EPUB for scripts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-2">Error: {error}</p>
            <Button onClick={loadScripts} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No scripts found</p>
            <p className="text-sm mt-1">This EPUB doesn't contain any JavaScript</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-4">
              Found {getTotalScriptCount()} script{getTotalScriptCount() !== 1 ? 's' : ''} in {scripts.length} file{scripts.length !== 1 ? 's' : ''}
            </div>

            {scripts.map((fileData) => (
              <div key={fileData.file} className="border rounded-lg overflow-hidden">
                {/* File Header */}
                <button
                  onClick={() => toggleFile(fileData.file)}
                  className="w-full flex items-center gap-2 p-3 bg-accent/50 hover:bg-accent transition-colors text-left"
                >
                  {expandedFiles.has(fileData.file) ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="font-mono text-sm truncate flex-1">{fileData.file}</span>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                    {fileData.scripts.length} script{fileData.scripts.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {/* Scripts List */}
                {expandedFiles.has(fileData.file) && (
                  <div className="p-2 space-y-2">
                    {fileData.scripts.map((script, idx) => {
                      const scriptKey = `${fileData.file}-${idx}`;
                      const isExpanded = expandedScripts.has(scriptKey);
                      const hasContent = script.content.trim().length > 0;
                      const hasSrc = !!script.src;

                      return (
                        <div key={scriptKey} className="border rounded bg-background">
                          {/* Script Header */}
                          <button
                            onClick={() => toggleScript(scriptKey)}
                            className="w-full flex items-center gap-2 p-2 hover:bg-accent/50 transition-colors text-left"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium">Script {idx + 1}</span>
                            {script.type && (
                              <span className="text-xs text-muted-foreground">
                                ({script.type})
                              </span>
                            )}
                            {hasSrc && (
                              <span className="text-xs text-blue-500 truncate flex-1">
                                src: {script.src}
                              </span>
                            )}
                            {hasContent && (
                              <span className="text-xs text-muted-foreground">
                                {script.content.length} chars
                              </span>
                            )}
                          </button>

                          {/* Script Content */}
                          {isExpanded && (
                            <div className="border-t">
                              {hasSrc && (
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border-b">
                                  <div className="text-xs font-medium mb-1">External Source:</div>
                                  <div className="text-xs font-mono break-all text-blue-600 dark:text-blue-400">
                                    {script.src}
                                  </div>
                                </div>
                              )}
                              {hasContent ? (
                                <div className="p-2">
                                  <div className="text-xs font-medium mb-2">Inline Content:</div>
                                  <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto max-h-96 overflow-y-auto">
                                    <code>{script.content}</code>
                                  </pre>
                                </div>
                              ) : !hasSrc && (
                                <div className="p-2 text-xs text-muted-foreground italic">
                                  Empty script tag
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
