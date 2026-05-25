import { useRef, useState } from 'react'
import type { UploadedFile } from '../types'

const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'text/markdown': '.md',
}

const MAX_BYTES = 3.5 * 1024 * 1024 // ~3.5 MB raw (base64 overhead)

interface Props {
  onFilesChange: (files: UploadedFile[]) => void
  compact?: boolean // smaller variant for mid-interview use
}

export function DocumentUpload({ onFilesChange, compact = false }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function readFile(file: File): Promise<UploadedFile> {
    return new Promise((resolve, reject) => {
      if (!ACCEPTED_TYPES[file.type]) {
        reject(new Error(`Nepodporovaný formát: ${file.name}`))
        return
      }
      if (file.size > MAX_BYTES) {
        reject(new Error(`Soubor ${file.name} je příliš velký (max 3.5 MB)`))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        resolve({ name: file.name, mimeType: file.type, data: base64 })
      }
      reader.onerror = () => reject(new Error(`Chyba čtení: ${file.name}`))
      reader.readAsDataURL(file)
    })
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setError('')

    const incoming = Array.from(fileList)
    const results: UploadedFile[] = []

    for (const f of incoming) {
      try {
        results.push(await readFile(f))
      } catch (e: any) {
        setError(e.message)
        return
      }
    }

    const merged = [...files, ...results]
    setFiles(merged)
    onFilesChange(merged)
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onFilesChange(next)
  }

  if (compact) {
    return (
      <div className="mt-1">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {files.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
          >
            Přidat dokument
          </button>
        ) : (
          <div className="flex flex-wrap gap-1.5 items-center">
            {files.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-gray-400 hover:text-gray-600 leading-none"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
            >
              + další
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mb-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {files.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          className={[
            'border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer transition-colors',
            dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          ].join(' ')}
        >
          <p className="text-xs text-gray-400">
            Přetáhni dokumenty nebo <span className="underline">klikni pro výběr</span>
          </p>
          <p className="text-xs text-gray-300 mt-1">PDF, Word, TXT, Markdown · max 3.5 MB / soubor</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-gray-400 hover:text-red-400 transition-colors leading-none"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
          >
            + přidat další
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}
