export function insertEmojiAtCursor(textareaRef, currentValue, emoji, maxLength, onChange) {
  const value = typeof currentValue === 'string' ? currentValue : ''
  const el = textareaRef?.current
  const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : value.length
  const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : value.length

  const nextValue = value.slice(0, start) + emoji + value.slice(end)

  if (typeof maxLength === 'number' && nextValue.length > maxLength) {
    if (el) el.focus()
    return
  }

  onChange(nextValue)

  const nextCursor = start + emoji.length
  requestAnimationFrame(() => {
    if (textareaRef?.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(nextCursor, nextCursor)
    }
  })
}
