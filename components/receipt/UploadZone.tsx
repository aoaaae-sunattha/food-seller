'use client'
import { useRef } from 'react'

interface Props {
  onFile: (file: File) => void
  preview: string | null
}

export default function UploadZone({ onFile, preview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition"
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <img src={preview} alt="receipt" className="max-h-48 mx-auto rounded" />
      ) : (
        <div className="space-y-2">
          <p className="text-4xl">📷</p>
          <p className="text-gray-500">แตะเพื่อถ่ายรูปหรือเลือกไฟล์</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
      />
    </div>
  )
}
