'use client'
import { useRef } from 'react'

interface Props {
  onFile: (file: File) => void
  preview: string | null
  accept?: string
  capture?: 'user' | 'environment'
  title?: string
  subtitle?: string
  testId?: string
}

export default function UploadZone({ 
  onFile, 
  preview, 
  accept = "image/*", 
  capture = "environment",
  title = "Scan Receipt",
  subtitle = "Tap to take a photo or upload",
  testId
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className="group relative border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all duration-300"
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-2xl shadow-lg border-4 border-white rotate-1 group-hover:rotate-0 transition-transform" />
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-full shadow-md">
            <span className="text-sm font-bold">🔄 Change</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-amber-100 group-hover:scale-110 transition-all duration-300">
            <span className="text-4xl">{accept.includes('image') ? '📷' : '📂'}</span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-black text-slate-700">{title}</p>
            <p className="text-slate-400 text-sm font-medium">{subtitle}</p>
          </div>
        </div>
      )}
      <input
        id="receipt-upload-input"
        data-testid={testId}
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture === 'environment' || capture === 'user' ? capture : undefined}
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
      />
    </div>
  )
}
