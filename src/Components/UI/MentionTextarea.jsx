import { useEffect, useRef, useState } from 'react'
import { searchUsers } from '../../services/userService'
import Avatar from './Avatar'
import './MentionTextarea.css'

// Detecta @query al inicio del texto o tras espacio/'(', nunca dentro de un email
const ACTIVE_MENTION_REGEX = /(?:^|[\s(])@([a-zA-Z0-9._]{0,30})$/

function getActiveMention(text, cursorPos) {
  const beforeCursor = text.slice(0, cursorPos)
  const match = ACTIVE_MENTION_REGEX.exec(beforeCursor)
  if (!match) return null

  const query = match[1]
  const atIndex = beforeCursor.lastIndexOf('@')
  return {
    query,
    startIndex: atIndex,
    endIndex: cursorPos
  }
}

export default function MentionTextarea({
  value,
  onChange,
  textareaRef: externalRef,
  className = '',
  placeholder = '',
  maxLength,
  rows = 3,
  disabled = false
}) {
  const internalRef = useRef(null)
  const ref = externalRef || internalRef

  const [mentionContext, setMentionContext] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!mentionContext || disabled) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(mentionContext.query, 6)
        if (cancelled) return
        const list = res.data?.users ?? []
        setSuggestions(list)
        setActiveIndex(0)
        setOpen(list.length > 0)
      } catch {
        if (!cancelled) {
          setSuggestions([])
          setOpen(false)
        }
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [mentionContext, disabled])

  function handleChange(event) {
    const nextValue = event.target.value
    const cursorPos = event.target.selectionStart ?? nextValue.length
    onChange(nextValue)

    const active = getActiveMention(nextValue, cursorPos)
    setMentionContext(active)
    if (!active) {
      setOpen(false)
      setSuggestions([])
    }
  }

  const [openUpward, setOpenUpward] = useState(false)
  const blurTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  function updateDropdownDirection() {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setOpenUpward(spaceBelow < 240 && spaceAbove > spaceBelow)
  }

  function insertMention(user) {
    if (!mentionContext || !user?.username) return

    const before = value.slice(0, mentionContext.startIndex)
    const after = value.slice(mentionContext.endIndex)
    const insertion = `@${user.username} `
    const nextValue = (before + insertion + after).slice(0, maxLength || undefined)
    const nextCursor = Math.min(before.length + insertion.length, nextValue.length)

    onChange(nextValue)
    setMentionContext(null)
    setSuggestions([])
    setOpen(false)

    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus()
        ref.current.setSelectionRange(nextCursor, nextCursor)
      }
    })
  }

  function handleKeyDown(event) {
    if (!open || suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      insertMention(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setMentionContext(null)
    }
  }

  return (
    <div className='mention-textarea'>
      <textarea
        ref={ref}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          updateDropdownDirection()
          handleChange(e)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          blurTimerRef.current = setTimeout(() => setOpen(false), 150)
        }}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
      />

      {open && suggestions.length > 0 && (
        <ul
          className={`mention-dropdown${openUpward ? ' mention-dropdown--upward' : ''}`}
          role='listbox'
          aria-label='Sugerencias de usuarios'
        >
          {suggestions.map((user, index) => (
            <li
              key={user._id}
              role='option'
              aria-selected={index === activeIndex}
              className={`mention-dropdown__item${index === activeIndex ? ' mention-dropdown__item--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(user)
              }}
            >
              <Avatar name={user.nombre} avatarUrl={user.avatar_url} size='xs' />
              <div className='mention-dropdown__info'>
                <span className='mention-dropdown__name'>{user.nombre}</span>
                {user.username && (
                  <span className='mention-dropdown__username'>@{user.username}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
