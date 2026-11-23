import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, Lock, LogOut, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getCommunityById,
  getCommunityMembers,
  getMyCommunities,
  joinCommunity,
  leaveCommunity
} from '../../services/communityService'
import { getPosts } from '../../services/postService'
import PostComposer from '../../Components/Post/PostComposer'
import PostCard from '../../Components/Post/PostCard'
import Avatar from '../../Components/UI/Avatar'
import Alert from '../../Components/Alert/Alert'
import './CommunityDetailScreen.css'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export default function CommunityDetailScreen() {
  const { community_id } = useParams()
  const { user: currentUser } = useAuth()

  const [community, setCommunity] = useState(null)
  const [membershipRole, setMembershipRole] = useState(null)
  const [posts, setPosts] = useState([])
  const [postsPage, setPostsPage] = useState(1)
  const [hasMorePosts, setHasMorePosts] = useState(false)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const [members, setMembers] = useState([])
  const [membersForbidden, setMembersForbidden] = useState(false)
  const [membersError, setMembersError] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [membershipBusy, setMembershipBusy] = useState(false)
  const [membershipError, setMembershipError] = useState(null)

  const loadMembers = useCallback(async () => {
    try {
      setMembersError(null)
      setMembersForbidden(false)
      const res = await getCommunityMembers(community_id)
      setMembers(res.data?.members ?? [])
    } catch (err) {
      if (err.status === 403) {
        setMembersForbidden(true)
        setMembers([])
      } else {
        setMembersError(err.message || 'No se pudieron cargar los miembros.')
      }
    }
  }, [community_id])

  useEffect(() => {
    let isMounted = true

    async function loadCommunityDetail() {
      try {
        setLoading(true)
        setError(null)
        setMembershipError(null)

        const [commRes, myCommsRes, postsRes] = await Promise.all([
          getCommunityById(community_id),
          getMyCommunities(),
          getPosts({ community_id, page: 1, limit: 20 }),
          loadMembers()
        ])

        if (!isMounted) return

        const commData = commRes.data?.community ?? null
        setCommunity(commData)

        const myList = myCommsRes.data?.communities ?? []
        const myMembership = myList.find((c) => c._id === community_id)
        setMembershipRole(myMembership ? myMembership.rol || 'user' : null)

        setPosts(postsRes.data?.posts ?? [])
        setPostsPage(1)
        setHasMorePosts(Boolean(postsRes.data?.pagination?.has_more))
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudo cargar la comunidad.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadCommunityDetail()

    return () => {
      isMounted = false
    }
  }, [community_id, loadMembers])

  async function handleJoin() {
    try {
      setMembershipBusy(true)
      setMembershipError(null)
      await joinCommunity(community_id)
      setMembershipRole('user')
      await loadMembers()
    } catch (err) {
      setMembershipError(err.message || 'No se pudo unir a la comunidad.')
    } finally {
      setMembershipBusy(false)
    }
  }

  async function handleLeave() {
    try {
      setMembershipBusy(true)
      setMembershipError(null)
      await leaveCommunity(community_id)
      setMembershipRole(null)
      setMembers([])
      setMembersForbidden(true)
    } catch (err) {
      setMembershipError(err.message || 'No se pudo abandonar la comunidad.')
    } finally {
      setMembershipBusy(false)
    }
  }

  async function handleLoadMorePosts() {
    if (loadingMorePosts || !hasMorePosts || !community_id) return

    try {
      setLoadingMorePosts(true)
      const nextPage = postsPage + 1
      const res = await getPosts({ community_id, page: nextPage, limit: 20 })
      const incoming = res.data?.posts ?? []
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p._id))
        return [...prev, ...incoming.filter((p) => !seen.has(p._id))]
      })
      setPostsPage(nextPage)
      setHasMorePosts(Boolean(res.data?.pagination?.has_more))
    } catch {
      // Mantiene las publicaciones ya cargadas
    } finally {
      setLoadingMorePosts(false)
    }
  }

  function handlePostCreated(newPost) {
    setPosts((prev) => [newPost, ...prev])
  }

  function handlePostUpdated(updatedPost) {
    setPosts((prev) =>
      prev.map((item) => (item._id === updatedPost._id ? updatedPost : item))
    )
  }

  function handlePostDeleted(deletedPostId) {
    setPosts((prev) => prev.filter((item) => item._id !== deletedPostId))
  }

  const isMember = Boolean(membershipRole)

  return (
    <section className='loop-page'>
      <Link to='/communities' className='community-detail__back'>
        <ArrowLeft size={16} />
        <span>Volver a Comunidades</span>
      </Link>

      {loading && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando comunidad...</p>
        </div>
      )}

      {!loading && error && <Alert variant='error'>{error}</Alert>}

      {!loading && !error && community && (
        <>
          <header className='community-hero'>
            <div className='community-hero__top'>
              <div className='community-hero__identity'>
                <span className='community-hero__icon' aria-hidden='true'>
                  <Users size={22} />
                </span>
                <div>
                  <h1 className='community-hero__title'>{community.nombre}</h1>
                  <div className='community-hero__meta'>
                    {community.fk_id_creador?.nombre && (
                      <span>Creada por {community.fk_id_creador.nombre}</span>
                    )}
                    {community.fecha_creacion && (
                      <span className='community-hero__date'>
                        <Calendar size={13} />
                        {formatDate(community.fecha_creacion)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className='community-hero__actions'>
                {isMember ? (
                  <>
                    <span className='community-card__badge'>
                      <Check size={14} />
                      <span>{membershipRole === 'owner' ? 'Miembro · Owner' : 'Miembro'}</span>
                    </span>
                    <button
                      type='button'
                      className='community-card__btn community-card__btn--danger'
                      onClick={handleLeave}
                      disabled={membershipBusy}
                    >
                      <LogOut size={14} />
                      <span>{membershipBusy ? 'Saliendo...' : 'Abandonar'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type='button'
                    className='community-card__btn community-card__btn--primary'
                    onClick={handleJoin}
                    disabled={membershipBusy}
                  >
                    <UserPlus size={14} />
                    <span>{membershipBusy ? 'Uniendo...' : 'Unirme'}</span>
                  </button>
                )}
              </div>
            </div>

            {community.descripcion && (
              <p className='community-hero__description'>{community.descripcion}</p>
            )}

            {membershipError && <Alert variant='error'>{membershipError}</Alert>}
          </header>

          <section className='community-section'>
            <h2 className='community-section__title'>Publicaciones</h2>

            {isMember ? (
              <PostComposer
                communityId={community._id}
                placeholder={`Publicar en ${community.nombre}...`}
                onPostCreated={handlePostCreated}
              />
            ) : (
              <div className='community-notice'>
                <span>Unite a esta comunidad para publicar aqui.</span>
              </div>
            )}

            {posts.length === 0 ? (
              <div className='loop-empty'>
                <p className='loop-empty__text'>
                  Todavia no hay publicaciones en esta comunidad.
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

                {hasMorePosts && (
                  <div className='loop-empty'>
                    <button
                      type='button'
                      className='post-card__action-pill'
                      onClick={handleLoadMorePosts}
                      disabled={loadingMorePosts}
                    >
                      {loadingMorePosts ? 'Cargando...' : 'Cargar mas publicaciones'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className='community-section'>
            <h2 className='community-section__title'>Miembros</h2>

            {membersForbidden ? (
              <div className='community-notice'>
                <Lock size={16} />
                <span>Debes unirte a esta comunidad para ver la lista de miembros.</span>
              </div>
            ) : membersError ? (
              <Alert variant='error'>{membersError}</Alert>
            ) : members.length === 0 ? (
              <div className='loop-empty'>
                <p className='loop-empty__text'>No hay miembros registrados.</p>
              </div>
            ) : (
              <ul className='community-members-list'>
                {members.map((member) => (
                  <li key={member._id} className='community-member-item'>
                    {member.fk_id_usuario?._id ? (
                      <Link
                        to={
                          currentUser?._id === member.fk_id_usuario._id
                            ? '/profile'
                            : `/users/${member.fk_id_usuario._id}`
                        }
                        className='community-member-item__name'
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                      >
                        <Avatar
                          name={member.fk_id_usuario.nombre || 'Usuario'}
                          avatarUrl={member.fk_id_usuario.avatar_url}
                          size='sm'
                        />
                        <span>
                          {member.fk_id_usuario.nombre || 'Usuario'}
                          {member.fk_id_usuario.username && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 400 }}>
                              {' '}@{member.fk_id_usuario.username}
                            </span>
                          )}
                        </span>
                      </Link>
                    ) : (
                      <span className='community-member-item__name'>Usuario</span>
                    )}
                    <span className='community-member-item__role'>
                      {member.rol}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  )
}
