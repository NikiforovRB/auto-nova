import { useId, useRef } from 'react'

interface FileButtonInputProps {
  accept?: string
  multiple?: boolean
  onFileSelected?: (file: File | null) => void
  onFilesSelected?: (files: FileList | null) => void
  buttonText?: string
  selectedFileName?: string | null
  disabled?: boolean
}

export function FileButtonInput({
  accept,
  multiple,
  onFileSelected,
  onFilesSelected,
  buttonText = 'Выбрать фото',
  selectedFileName,
  disabled,
}: FileButtonInputProps) {
  const inputId = useId()
  const ref = useRef<HTMLInputElement | null>(null)

  return (
    <div className="file-button-input">
      <input
        id={inputId}
        ref={ref}
        className="file-input-hidden"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const files = e.target.files
          if (onFilesSelected) onFilesSelected(files ?? null)
          if (onFileSelected) onFileSelected(files?.[0] ?? null)
        }}
      />
      <button
        type="button"
        className="file-button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
      >
        {buttonText}
      </button>
      <span className="file-name" title={selectedFileName ?? ''}>
        {selectedFileName ?? 'Файл не выбран'}
      </span>
    </div>
  )
}

