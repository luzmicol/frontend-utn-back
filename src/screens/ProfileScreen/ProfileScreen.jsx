import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Calendar, UserCheck, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  followUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getMyProfile,
  getUserById,
  unfollowUser
} from '../../services/userService'
import { getPosts } from '../../services/postService'
import PostCard from '../../Components/Post/PostCard'
import Alert from '../../Components/Alert/Alert'
import './ProfileScreen.css'

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatJoinDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric'
  })
}

export default function ProfileScreen() {
  const { user_id } = useParams()
  const { user: currentUser } = useAuth()

  const isOwnRoute = !user_id
  const targetUserId = isOwnRoute ? currentUser?._id : user_id

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)

  const [activeTab, setActiveTab] = useState('posts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState(null)

  useEffect(() => {
    if (!targetUserId) return

    let isMounted = true

    async function loadProfileData() {
      try {
        setLoading(true)
        setError(null)
        setFollowError(null)
        setActiveTab('posts')

        const requests = [
          isOwnRoute ? getMyProfile() : getUserById(targetUserId),
          getFollowers(targetUserId),
          getFollowing(targetUserId),
          getPosts()
        ]

        if (!isOwnRoute) {
          requests.push(getFollowStatus(targetUserId))
        }

        const [profileRes, followersRes, followingRes, postsRes, statusRes] =
          await Promise.all(requests)

        if (!isMounted) return

        setProfile(profileRes.data?.user ?? null)
        setFollowers(followersRes.data?.followers ?? [])
        setFollowing(followingRes.data?.following ?? [])

        const allPosts = postsRes.data?.posts ?? []
        setPosts(allPosts.filter((p) => p.fk_id_usuario?._id === targetUserId))

        if (!isOwnRoute && statusRes) {
          setIsFollowing(Boolean(statusRes.data?.is_following))
        } else {
          setIsFollowing(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudo cargar el perfil.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProfileData()

    return () => {
      isMounted = false
    }
  }, [targetUserId, isOwnRoute])

  // Si alguien intenta abrir /users/:mi_propio_id, redirigir a /profile
  if (user_id && currentUser?._id && user_id === currentUser._id) {
    return <Navigate to='/profile' replace />
  }

  async function handleToggleFollow() {
    if (followBusy || !targetUserId) return

    try {
      setFollowBusy(true)
      setFollowError(null)
      if (isFollowing) {
        await unfollowUser(targetUserId)
        setIsFollowing(false)
        setFollowers((prev) => prev.filter((f) => f._id !== currentUser?._id))
      } else {
        await followUser(targetUserId)
        setIsFollowing(true)
        if (currentUser) {
          setFollowers((prev) => {
            if (prev.some((f) => f._id === currentUser._id)) return prev
            return [{ _id: currentUser._id, nombre: currentUser.nombre }, ...prev]
          })
        }
      }
    } catch (err) {
      setFollowError(err.message || 'No se pudo actualizar el seguimiento.')
    } finally {
      setFollowBusy(false)
    }
  }

  function handlePostUpdated(updatedPost) {
    setPosts((prev) =>
      prev.map((item) => (item._id === updatedPost._id ? updatedPost : item))
    )
  }

  function handlePostDeleted(deletedPostId) {
    setPosts((prev) => prev.filter((item) => item._id !== deletedPostId))
  }

  function getProfileLink(id) {
    return currentUser?._id === id ? '/profile' : `/users/${id}`
  }

  return (
    <section className='loop-page'>
      {loading && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando perfil...</p>
        </div>
      )}

      {!loading && error && <Alert variant='error'>{error}</Alert>}

      {!loading && !error && profile && (
        <>
          <header className='profile-hero'>
            <div className='profile-hero__top'>
              <div className='profile-hero__identity'>
                <div className='profile-avatar' aria-hidden='true'>
                  {getInitials(profile.nombre)}
                </div>
                <div className='profile-hero__info'>
                  <h1 className='profile-hero__name'>{profile.nombre}</h1>
                  {profile.fecha_creacion && (
                    <span className='profile-hero__date'>
                      <Calendar size={13} />
                      Se unio en {formatJoinDate(profile.fecha_creacion)}
                    </span>
                  )}
                </div>
              </div>

              {!isOwnRoute && (
                <button
                  type='button'
                  className={`profile-follow-btn${isFollowing ? ' profile-follow-btn--following' : ''}`}
                  onClick={handleToggleFollow}
                  disabled={followBusy}
                >
                  {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                  <span>
                    {followBusy
                      ? 'Actualizando...'
                      : isFollowing
                        ? 'Dejar de seguir'
                        : 'Seguir'}
                  </span>
                </button>
              )}
            </div>

            {followError && <Alert variant='error'>{followError}</Alert>}

            <div className='profile-stats'>
              <button
                type='button'
                className={`profile-stat${activeTab === 'posts' ? ' profile-stat--active' : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                <strong>{posts.length}</strong>
                <span>Publicaciones</span>
              </button>
              <button
                type='button'
                className={`profile-stat${activeTab === 'followers' ? ' profile-stat--active' : ''}`}
                onClick={() => setActiveTab('followers')}
              >
                <strong>{followers.length}</strong>
                <span>Seguidores</span>
              </button>
              <button
                type='button'
                className={`profile-stat${activeTab === 'following' ? ' profile-stat--active' : ''}`}
                onClick={() => setActiveTab('following')}
              >
                <strong>{following.length}</strong>
                <span>Siguiendo</span>
              </button>
            </div>
          </header>

          {activeTab === 'posts' && (
            posts.length === 0 ? (
              <div className='loop-empty'>
                <p className='loop-empty__text'>
                  {isOwnRoute
                    ? 'Todavia no realizaste ninguna publicacion.'
                    : 'Este usuario todavia no realizo publicaciones.'}
                </p>
              </div>
            ) : (
              <div className='loop-page'>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onPostUpdated={handlePostUpdated}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'followers' && (
            followers.length === 0 ? (
              <div className='loop-empty'>
                <span className='loop-empty__icon' aria-hidden='true'>
                  <Users size={20} />
                </span>
                <p className='loop-empty__text'>Todavia no tiene seguidores.</p>
              </div>
            ) : (
              <ul className='profile-user-list'>
                {followers.map((person) => (
                  <li key={person._id} className='profile-user-item'>
                    <Link to={getProfileLink(person._id)} className='profile-user-link'>
                      <span className='profile-avatar profile-avatar--sm' aria-hidden='true'>
                        {getInitials(person.nombre)}
                      </span>
                      <span className='profile-user-name'>{person.nombre}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}

          {activeTab === 'following' && (
            following.length === 0 ? (
              <div className='loop-empty'>
                <span className='loop-empty__icon' aria-hidden='true'>
                  <Users size={20} />
                </span>
                <p className='loop-empty__text'>Todavia no sigue a ningun usuario.</p>
              </div>
            ) : (
              <ul className='profile-user-list'>
                {following.map((person) => (
                  <li key={person._id} className='profile-user-item'>
                    <Link to={getProfileLink(person._id)} className='profile-user-link'>
                      <span className='profile-avatar profile-avatar--sm' aria-hidden='true'>
                        {getInitials(person.nombre)}
                      </span>
                      <span className='profile-user-name'>{person.nombre}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}
        </>
      )}
    </section>
  )
}
