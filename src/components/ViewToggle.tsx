interface ViewToggleProps {
  viewMode: 'fileData' | 'aiTraining'
  onViewModeChange: (mode: 'fileData' | 'aiTraining') => void
}


export default function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
      <div className="flex gap-2">
        <button
          onClick={() => onViewModeChange('fileData')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'fileData'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          File Data
        </button>
        <button
          onClick={() => onViewModeChange('aiTraining')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'aiTraining'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          AI Training
        </button>
      </div>
    </div>
  )
}
