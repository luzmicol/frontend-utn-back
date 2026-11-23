import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './RichTextWithMentions.css'

const MENTION_SPLIT_REGEX = /(^|[\s(])(@[a-zA-Z0-9._]{3,30})\b/g

export default function RichTextWithMentions({ text = '', mentions = [] }) {
  const { user: currentUser } = useAuth()

  if (!text) return null

  const mentionMap = new Map()
  if (Array.isArray(mentions)) {
    for (const item of mentions) {
      const userObj = item?.fk_id_usuario
      if (!userObj || !userObj._id) continue

      const entry = {
        _id: userObj._id,
        currentUsername: userObj.username || item.username_al_mencionar
      }

      if (item.username_al_mencionar) {
        mentionMap.set(item.username_al_mencionar.toLowerCase(), entry)
      }
      if (userObj.username) {
        mentionMap.set(userObj.username.toLowerCase(), entry)
      }
    }
  }

  if (mentionMap.size === 0) {
    return text
  }

  const nodes = []
  let lastIndex = 0
  let match
  const regex = new RegExp(MENTION_SPLIT_REGEX.source, 'g')

  while ((match = regex.exec(text)) !== null) {
    const fullMatchStart = match.index
    const prefix = match[1]
    const mentionToken = match[2]
    const rawUsername = mentionToken.slice(1).toLowerCase()
    const resolved = mentionMap.get(rawUsername)

    if (fullMatchStart > lastIndex) {
      nodes.push(text.slice(lastIndex, fullMatchStart))
    }

    if (prefix) {
      nodes.push(prefix)
    }

    if (resolved) {
      const to =
        currentUser?._id === resolved._id ? '/profile' : `/users/${resolved._id}`
      nodes.push(
        <Link key={`${fullMatchStart}-${resolved._id}`} to={to} className='mention-link'>
          @{resolved.currentUsername}
        </Link>
      )
    } else {
      nodes.push(mentionToken)
    }

    lastIndex = fullMatchStart + prefix.length + mentionToken.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.map((node, i) => <Fragment key={i}>{node}</Fragment>)
}
