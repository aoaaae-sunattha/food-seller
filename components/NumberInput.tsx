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
      type="number"
      min="0"
      className={`${className} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      value={localValue}
      onChange={e => {
        const val = e.target.value
        // Only allow non-negative numbers
        if (val !== '' && Number(val) < 0) return
        
        setLocalValue(val)
        onChange(val === '' ? 0 : Number(val))
      }}
    />
  )
}
