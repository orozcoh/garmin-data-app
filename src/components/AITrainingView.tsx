import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Copy, Check } from 'lucide-react'
import { useState, useMemo } from 'react'

interface AITrainingViewProps {
  aiResponse: string | null
  aiLoading: boolean
  aiError: string
  onAskAI: () => void
}

// Force blank lines before all block elements by processing line by line
function preprocessMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimStart();
    
    // Insert two blank lines before headings, lists, blockquotes, code blocks
    if (/^#{1,6}\s/.test(line) || /^[-*+]\s/.test(line) || /^\d+\.\s/.test(line) || /^>/.test(line) || /^```/.test(line)) {
      if (result.length > 0 && !result[result.length - 1].match(/^\s*$/)) {
        result.push('');
        result.push('');
      }
    }
    
    result.push(lines[i]);
  }
  
  let processed = result.join('\n');
  processed = processed.replace(/\n{4,}/g, '\n\n\n');
  return processed.trim();
}



export default function AITrainingView({ 
  aiResponse, 
  aiLoading, 
  aiError, 
  onAskAI 
}: AITrainingViewProps) {
  const [copied, setCopied] = useState(false)

  const processedResponse = useMemo(() => {
    return aiResponse ? preprocessMarkdown(aiResponse) : null
  }, [aiResponse])

  const handleCopy = async () => {
    if (aiResponse) {
      await navigator.clipboard.writeText(aiResponse)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="space-y-6">
      {!aiResponse && !aiLoading && (
        <div className="flex justify-center py-8">
          <button
            onClick={onAskAI}
            disabled={aiLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg font-medium transition-colors"
          >
            Ask AI for training
          </button>
        </div>
      )}
      {aiLoading && (
        <div className="flex justify-center py-8">
          <span className="flex items-center gap-2 text-slate-300">
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </span>
        </div>
      )}
      {aiResponse && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-slate-100">AI Training Insights</h3>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="p-5 prose prose-lg prose-invert prose-slate max-w-none 
            prose-headings:font-semibold prose-headings:text-slate-100 prose-headings:mt-12 prose-headings:mb-6
            prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-li:marker:text-slate-500 prose-li:text-slate-300
            prose-blockquote:border-l-amber-400 prose-blockquote:text-slate-400 prose-blockquote:not-italic prose-blockquote:mt-8 prose-blockquote:mb-6
            prose-strong:text-slate-100 prose-code:text-amber-300 prose-code:bg-slate-700/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-slate-700/50 prose-pre:mt-8 prose-pre:mb-6
            prose-ul:mt-4 prose-ul:mb-6 prose-ol:mt-4 prose-ol:mb-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{processedResponse}</ReactMarkdown>




          </div>
        </div>
      )}
      {aiError && (
        <div className="text-sm text-rose-300 border border-rose-800/60 bg-rose-900/40 rounded-lg px-4 py-3">
          {aiError}
        </div>
      )}
    </section>
  )
}
