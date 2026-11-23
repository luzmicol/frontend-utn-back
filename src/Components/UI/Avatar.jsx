import { useState } from 'react'
import './Avatar.css'

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Avatar({ name = '', avatarUrl = '', size = 'md' }) {
  const [failedUrl, setFailedUrl] = useState('')
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl

  return (
    <span className={`loop-avatar loop-avatar--${size}`} aria-hidden='true'>
      {showImage ? (
        <img
          className='loop-avatar__img'
          src={avatarUrl}
          alt={name || 'Avatar'}
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
