'use client'

import { InputHTMLAttributes, useState, useEffect } from 'react'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
}

export function NumberInput({ value, onChange, className = '', ...props }: NumberInputProps) {
  const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString())

  useEffect(() => {
    setLocalValue(prev => {
      const numericLocal = prev === '' ? 0 : Number(prev)
      if (numericLocal !== value) {
        return value === 0 ? '' : value.toString()
      }
      return prev
    })
  }, [value])

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      className={className}
      value={localValue}
      onChange={e => {
        const val = e.target.value
        // Only allow valid non-negative decimal numbers
        if (val !== '' && !/^\d*\.?\d*$/.test(val)) return

        setLocalValue(val)
        onChange(val === '' ? 0 : Number(val))
      }}
    />
  )
}
