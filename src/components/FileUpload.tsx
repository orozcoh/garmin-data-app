import { useRef, type ChangeEvent } from 'react'

interface FileUploadProps {
  fileName: string
  isLoading: boolean
  error: string
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export default function FileUpload({ fileName, isLoading, error, onFileChange }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="border border-slate-800 bg-slate-900/70 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col flex-wrap items-center gap-3">
          <label
            htmlFor="file-input"
            className="inline-flex cursor-pointer items-center gap-3 px-6 py-3 sm:px-4 sm:py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-base sm:text-sm font-medium hover:bg-slate-750 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Choose FIT file</span>
              </>
            )}
          </label>
          {fileName && (
            <span className="text-sm text-slate-300 truncate">{fileName}</span>
          )}
        </div>

        <input
          id="file-input"
          ref={fileInputRef}
          type="file"
          accept=".fit,application/octet-stream"
          onChange={onFileChange}
          disabled={isLoading}
          className="hidden"
        />

        {error && (
          <div className="text-sm text-rose-300 border border-rose-800/60 bg-rose-900/40 rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </section>
  )
}
