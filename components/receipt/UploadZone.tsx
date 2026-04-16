'use client'
import { useRef } from 'react'
import { Camera, FileUp, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      className={cn(
        "group relative border-2 border-dashed border-subtle-border rounded-[2rem] p-12 text-center cursor-pointer transition-all duration-300",
        preview 
          ? "border-emerald/30 bg-emerald/5" 
          : "hover:border-cinnabar hover:bg-cinnabar/5"
      )}
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <div className="relative inline-block group/preview">
          <img src={preview} alt="preview" className="max-h-72 mx-auto rounded-2xl shadow-xl border-4 border-white transition-transform group-hover/preview:scale-[1.02]" />
          <div className="absolute -bottom-3 -right-3 bg-cinnabar text-white p-3 rounded-full shadow-lg active:scale-90 transition-transform">
            <RefreshCcw size={20} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-20 h-20 bg-mist-gray rounded-3xl flex items-center justify-center mx-auto text-slate-400 group-hover:bg-cinnabar/10 group-hover:text-cinnabar group-hover:scale-110 transition-all duration-300">
            {accept.includes('image') ? <Camera size={36} /> : <FileUp size={36} />}
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-slate-deep tracking-tight">{title}</p>
            <p className="text-slate-500 text-sm font-medium">{subtitle}</p>
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
