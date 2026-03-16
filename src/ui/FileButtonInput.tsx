import { useId, useRef } from 'react'

interface FileButtonInputProps {
  accept?: string
  onFileSelected: (file: File | null) => void
  buttonText?: string
  selectedFileName?: string | null
  disabled?: boolean
}

export function FileButtonInput({
  accept,
  onFileSelected,
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
        disabled={disabled}
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
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

