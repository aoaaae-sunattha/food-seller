'use client'

import { InputHTMLAttributes, useState, useEffect } from 'react'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
}

export function NumberInput({ value, onChange, ...props }: NumberInputProps) {
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
      type="number"
      value={localValue}
      onChange={e => {
        setLocalValue(e.target.value)
        onChange(e.target.value === '' ? 0 : Number(e.target.value))
      }}
    />
  )
}
