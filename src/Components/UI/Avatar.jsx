import { useState } from 'react'
import './Avatar.css'

const SIZE_PX = {
  xs: 24,
  sm: 34,
  md: 44,
  lg: 60
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Avatar({ name = '', avatarUrl = '', size = 'md' }) {
  const [failedUrl, setFailedUrl] = useState('')
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl
  const px = SIZE_PX[size] || SIZE_PX.md
  const isPriority = size === 'lg'

  return (
    <span className={`loop-avatar loop-avatar--${size}`} aria-hidden='true'>
      {showImage ? (
        <img
          className='loop-avatar__img'
          src={avatarUrl}
          alt={name || 'Avatar'}
          width={px}
          height={px}
          loading={isPriority ? 'eager' : 'lazy'}
          decoding='async'
          fetchPriority={isPriority ? 'high' : 'auto'}
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
