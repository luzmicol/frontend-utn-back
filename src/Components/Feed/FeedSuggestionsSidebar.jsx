import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { followUser, getFollowing, getUsers } from '../../services/userService'
import {
  getCommunities,
  getMyCommunities,
  joinCommunity
} from '../../services/communityService'
import Avatar from '../UI/Avatar'
import './FeedSuggestionsSidebar.css'

const MAX_SUGGESTIONS = 3

export default function FeedSuggestionsSidebar() {
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?._id || null

  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [suggestedCommunities, setSuggestedCommunities] = useState([])
  const [loading, setLoading] = useState(true)

  const [followedIds, setFollowedIds] = useState(() => new Set())
  const [busyUserIds, setBusyUserIds] = useState(() => new Set())

  const [joinedIds, setJoinedIds] = useState(() => new Set())
  const [busyCommunityIds, setBusyCommunityIds] = useState(() => new Set())

  useEffect(() => {
    if (!currentUserId) return

    let isMounted = true

    async function loadSuggestions() {
      try {
        const [usersRes, followingRes, communitiesRes, myCommunitiesRes] =
          await Promise.all([
            getUsers(),
            getFollowing(currentUserId),
            getCommunities(),
            getMyCommunities()
          ])

        if (!isMounted) return

        const allUsers = usersRes.data?.users ?? []
        const followingList = followingRes.data?.following ?? []
        const followingSet = new Set(followingList.map((u) => u._id))

        const filteredUsers = allUsers
          .filter((u) => u._id !== currentUserId && !followingSet.has(u._id))
          .slice(0, MAX_SUGGESTIONS)

        const allCommunities = communitiesRes.data?.communities ?? []
        const myCommunities = myCommunitiesRes.data?.communities ?? []
        const myCommunitySet = new Set(myCommunities.map((c) => c._id))

        const filteredCommunities = allCommunities
          .filter((c) => !myCommunitySet.has(c._id))
          .slice(0, MAX_SUGGESTIONS)

        setSuggestedUsers(filteredUsers)
        setSuggestedCommunities(filteredCommunities)
      } catch {
        // Silencioso para no interferir con el Feed principal
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadSuggestions()

    return () => {
      isMounted = false
    }
  }, [currentUserId])

  async function handleFollow(userId) {
    if (busyUserIds.has(userId) || followedIds.has(userId)) return

    setBusyUserIds((prev) => new Set(prev).add(userId))
    try {
      await followUser(userId)
      setFollowedIds((prev) => new Set(prev).add(userId))
    } catch {
      // Mantiene estado anterior si falla
    } finally {
      setBusyUserIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  async function handleJoin(communityId) {
    if (busyCommunityIds.has(communityId) || joinedIds.has(communityId)) return

    setBusyCommunityIds((prev) => new Set(prev).add(communityId))
    try {
      await joinCommunity(communityId)
      setJoinedIds((prev) => new Set(prev).add(communityId))
      setSuggestedCommunities((prev) =>
        prev.map((c) =>
          c._id === communityId
            ? { ...c, members_count: (c.members_count ?? 0) + 1 }
            : c
        )
      )
    } catch {
      // Mantiene estado anterior si falla
    } finally {
      setBusyCommunityIds((prev) => {
        const next = new Set(prev)
        next.delete(communityId)
        return next
      })
    }
  }

  return (
    <aside className='feed-suggestions' aria-label='Sugerencias'>
      <section className='feed-suggestions__card'>
        <header className='feed-suggestions__header'>
          <h2 className='feed-suggestions__title'>Sugerencias para ti</h2>
          <Link to='/explore' className='feed-suggestions__all'>
            Ver todos
          </Link>
        </header>

        {loading ? (
          <p className='feed-suggestions__empty'>Cargando sugerencias...</p>
        ) : suggestedUsers.length === 0 ? (
          <p className='feed-suggestions__empty'>No hay nuevas sugerencias por ahora.</p>
        ) : (
          <ul className='feed-suggestions__list'>
            {suggestedUsers.map((person) => {
              const isFollowed = followedIds.has(person._id)
              const isBusy = busyUserIds.has(person._id)
              return (
                <li key={person._id} className='feed-suggestions__item'>
                  <Link to={`/users/${person._id}`} className='feed-suggestions__link'>
                    <Avatar
                      name={person.nombre}
                      avatarUrl={person.avatar_url}
                      size='sm'
                    />
                    <div className='feed-suggestions__meta'>
                      <span className='feed-suggestions__name'>{person.nombre}</span>
                      {person.username && (
                        <span className='feed-suggestions__sub'>@{person.username}</span>
                      )}
                    </div>
                  </Link>

                  <button
                    type='button'
                    className={`feed-suggestions__btn${isFollowed ? ' feed-suggestions__btn--done' : ''}`}
                    onClick={() => handleFollow(person._id)}
                    disabled={isBusy || isFollowed}
                  >
                    {isFollowed ? 'Siguiendo' : isBusy ? '...' : 'Seguir'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className='feed-suggestions__card'>
        <header className='feed-suggestions__header'>
          <h2 className='feed-suggestions__title'>Comunidades para descubrir</h2>
          <Link to='/communities' className='feed-suggestions__all'>
            Ver todas
          </Link>
        </header>

        {loading ? (
          <p className='feed-suggestions__empty'>Cargando comunidades...</p>
        ) : suggestedCommunities.length === 0 ? (
          <p className='feed-suggestions__empty'>Ya conoces todas las comunidades.</p>
        ) : (
          <ul className='feed-suggestions__list'>
            {suggestedCommunities.map((community) => {
              const isJoined = joinedIds.has(community._id)
              const isBusy = busyCommunityIds.has(community._id)
              const membersCount = community.members_count ?? 0
              return (
                <li key={community._id} className='feed-suggestions__item'>
                  <Link
                    to={`/communities/${community._id}`}
                    className='feed-suggestions__link'
                  >
                    <Avatar
                      name={community.nombre}
                      avatarUrl={community.imagen_url}
                      size='sm'
                    />
                    <div className='feed-suggestions__meta'>
                      <span className='feed-suggestions__name'>{community.nombre}</span>
                      <span className='feed-suggestions__sub'>
                        {membersCount} {membersCount === 1 ? 'miembro' : 'miembros'}
                      </span>
                    </div>
                  </Link>

                  <button
                    type='button'
                    className={`feed-suggestions__btn${isJoined ? ' feed-suggestions__btn--done' : ''}`}
                    onClick={() => handleJoin(community._id)}
                    disabled={isBusy || isJoined}
                  >
                    {isJoined ? 'Unido' : isBusy ? '...' : 'Unirse'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}
