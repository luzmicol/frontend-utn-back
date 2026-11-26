import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Search, Sparkles, UserCheck, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { followUser, getUsers, unfollowUser } from '../../services/userService'
import { getTrendingPosts } from '../../services/exploreService'
import { getCommunities, getMyCommunities, joinCommunity } from '../../services/communityService'
import PostCard from '../../Components/Post/PostCard'
import Avatar from '../../Components/UI/Avatar'
import Alert from '../../Components/Alert/Alert'
import './ExploreScreen.css'

const TABS = [
  { id: 'for_you', label: 'Para vos' },
  { id: 'trending', label: 'Tendencias' },
  { id: 'people', label: 'Personas' },
  { id: 'communities', label: 'Comunidades' }
]

const PEOPLE_PAGE_LIMIT = 15
const TRENDING_PAGE_LIMIT = 15
const FOR_YOU_PEOPLE_LIMIT = 4
const FOR_YOU_COMMUNITIES_LIMIT = 3
const FOR_YOU_POSTS_LIMIT = 5

const SWIPE_MIN_X = 60
const SWIPE_MAX_Y = 80
const SWIPE_EDGE_MARGIN = 24
const SWIPE_MAX_DURATION_MS = 600

function mergeUniqueById(existing, incoming) {
  const seen = new Set(existing.map((item) => String(item._id)))
  const merged = [...existing]
  for (const item of incoming) {
    const id = String(item._id)
    if (!seen.has(id)) {
      seen.add(id)
      merged.push(item)
    }
  }
  return merged
}

export default function ExploreScreen() {
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?._id || null

  const [activeTab, setActiveTab] = useState('for_you')

  // Estado de "Para vos"
  const [forYouPeople, setForYouPeople] = useState([])
  const [forYouCommunities, setForYouCommunities] = useState([])
  const [forYouPosts, setForYouPosts] = useState([])
  const [forYouLoading, setForYouLoading] = useState(true)
  const [forYouError, setForYouError] = useState(null)
  const forYouLoadedRef = useRef(false)

  // Estado de "Tendencias"
  const [trendingPosts, setTrendingPosts] = useState([])
  const [trendingPage, setTrendingPage] = useState(1)
  const [trendingHasMore, setTrendingHasMore] = useState(false)
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [trendingLoadingMore, setTrendingLoadingMore] = useState(false)
  const [trendingError, setTrendingError] = useState(null)
  const trendingLoadedRef = useRef(false)

  // Estado de "Personas"
  const [people, setPeople] = useState([])
  const [peoplePage, setPeoplePage] = useState(1)
  const [peopleHasMore, setPeopleHasMore] = useState(false)
  const [peopleQuery, setPeopleQuery] = useState('')
  const [debouncedPeopleQuery, setDebouncedPeopleQuery] = useState('')
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleLoadingMore, setPeopleLoadingMore] = useState(false)
  const [peopleError, setPeopleError] = useState(null)
  const peopleLoadedQueryRef = useRef(null)

  // Estado de "Comunidades"
  const [communities, setCommunities] = useState([])
  const [myCommunityIds, setMyCommunityIds] = useState(() => new Set())
  const [communitiesQuery, setCommunitiesQuery] = useState('')
  const [communitiesLoading, setCommunitiesLoading] = useState(false)
  const [communitiesError, setCommunitiesError] = useState(null)
  const communitiesLoadedRef = useRef(false)

  // Acciones en curso (seguir / unirse)
  const [busyFollowIds, setBusyFollowIds] = useState(() => new Set())
  const [busyJoinIds, setBusyJoinIds] = useState(() => new Set())
  const swipeStartRef = useRef(null)

  function handleSwipeTouchStart(event) {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) {
      swipeStartRef.current = null
      return
    }
    if (event.touches.length !== 1) {
      swipeStartRef.current = null
      return
    }
    if (event.target?.closest?.('input, textarea, select')) {
      swipeStartRef.current = null
      return
    }
    const touch = event.touches[0]
    if (
      touch.clientX < SWIPE_EDGE_MARGIN ||
      touch.clientX > window.innerWidth - SWIPE_EDGE_MARGIN
    ) {
      swipeStartRef.current = null
      return
    }
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
  }

  function handleSwipeTouchEnd(event) {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    if (!start || event.changedTouches.length !== 1) return

    const elapsed = Date.now() - start.time
    if (elapsed > SWIPE_MAX_DURATION_MS) return

    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    if (
      Math.abs(dx) < SWIPE_MIN_X ||
      Math.abs(dy) > SWIPE_MAX_Y ||
      Math.abs(dx) <= Math.abs(dy) * 1.5
    ) {
      return
    }

    const currentIndex = TABS.findIndex((t) => t.id === activeTab)
    if (currentIndex === -1) return

    if (dx < 0 && currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id)
    } else if (dx > 0 && currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id)
    }
  }

  function handleSwipeTouchCancel() {
    swipeStartRef.current = null
  }

  // Debounce de busqueda en Personas
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPeopleQuery(peopleQuery.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [peopleQuery])

  // Carga inicial de "Para vos"
  useEffect(() => {
    if (activeTab !== 'for_you' || forYouLoadedRef.current) return
    let isMounted = true

    async function loadForYou() {
      try {
        setForYouLoading(true)
        setForYouError(null)
        const [usersRes, allCommsRes, myCommsRes, trendingRes] = await Promise.all([
          getUsers({ page: 1, limit: 10 }),
          getCommunities(),
          getMyCommunities(),
          getTrendingPosts({ page: 1, limit: FOR_YOU_POSTS_LIMIT })
        ])

        if (!isMounted) return

        const rawUsers = (usersRes.data?.users ?? []).filter(
          (u) => String(u._id) !== String(currentUserId)
        )
        const suggestedUsers = rawUsers.filter((u) => !u.is_following).slice(0, FOR_YOU_PEOPLE_LIMIT)
        const fallbackUsers =
          suggestedUsers.length > 0 ? suggestedUsers : rawUsers.slice(0, FOR_YOU_PEOPLE_LIMIT)

        const allComms = allCommsRes.data?.communities ?? []
        const myComms = myCommsRes.data?.communities ?? []
        const mySet = new Set(myComms.map((c) => String(c._id)))

        const suggestedComms = allComms
          .filter((c) => !mySet.has(String(c._id)))
          .slice(0, FOR_YOU_COMMUNITIES_LIMIT)

        setForYouPeople(fallbackUsers)
        setForYouCommunities(suggestedComms)
        setForYouPosts(trendingRes.data?.posts ?? [])

        // Aprovechamos los datos de comunidades ya descargados
        setCommunities(allComms)
        setMyCommunityIds(mySet)
        communitiesLoadedRef.current = true
        forYouLoadedRef.current = true
      } catch (err) {
        if (isMounted) {
          setForYouError(err.message || 'No se pudo cargar la sección Para vos.')
        }
      } finally {
        if (isMounted) setForYouLoading(false)
      }
    }

    loadForYou()
    return () => {
      isMounted = false
    }
  }, [activeTab, currentUserId])

  // Carga de "Tendencias"
  useEffect(() => {
    if (activeTab !== 'trending' || trendingLoadedRef.current) return
    let isMounted = true

    async function loadTrending() {
      try {
        setTrendingLoading(true)
        setTrendingError(null)
        const res = await getTrendingPosts({ page: 1, limit: TRENDING_PAGE_LIMIT })
        if (!isMounted) return

        setTrendingPosts(res.data?.posts ?? [])
        setTrendingPage(1)
        setTrendingHasMore(Boolean(res.data?.pagination?.has_more))
        trendingLoadedRef.current = true
      } catch (err) {
        if (isMounted) {
          setTrendingError(err.message || 'No se pudieron cargar las tendencias.')
        }
      } finally {
        if (isMounted) setTrendingLoading(false)
      }
    }

    loadTrending()
    return () => {
      isMounted = false
    }
  }, [activeTab])

  // Carga de "Personas" (paginada y con busqueda en backend)
  useEffect(() => {
    if (activeTab !== 'people') return
    if (peopleLoadedQueryRef.current === debouncedPeopleQuery) return
    let isMounted = true

    async function loadPeople() {
      try {
        setPeopleLoading(true)
        setPeopleError(null)
        const res = await getUsers({
          page: 1,
          limit: PEOPLE_PAGE_LIMIT,
          q: debouncedPeopleQuery
        })
        if (!isMounted) return

        const list = (res.data?.users ?? []).filter(
          (u) => String(u._id) !== String(currentUserId)
        )
        setPeople(list)
        setPeoplePage(1)
        setPeopleHasMore(Boolean(res.data?.pagination?.has_more))
        peopleLoadedQueryRef.current = debouncedPeopleQuery
      } catch (err) {
        if (isMounted) {
          setPeopleError(err.message || 'No se pudieron cargar las personas.')
        }
      } finally {
        if (isMounted) setPeopleLoading(false)
      }
    }

    loadPeople()
    return () => {
      isMounted = false
    }
  }, [activeTab, debouncedPeopleQuery, currentUserId])

  // Carga de "Comunidades" si aun no se cargo
  useEffect(() => {
    if (activeTab !== 'communities' || communitiesLoadedRef.current) return
    let isMounted = true

    async function loadCommunities() {
      try {
        setCommunitiesLoading(true)
        setCommunitiesError(null)
        const [allRes, myRes] = await Promise.all([getCommunities(), getMyCommunities()])
        if (!isMounted) return

        setCommunities(allRes.data?.communities ?? [])
        setMyCommunityIds(new Set((myRes.data?.communities ?? []).map((c) => String(c._id))))
        communitiesLoadedRef.current = true
      } catch (err) {
        if (isMounted) {
          setCommunitiesError(err.message || 'No se pudieron cargar las comunidades.')
        }
      } finally {
        if (isMounted) setCommunitiesLoading(false)
      }
    }

    loadCommunities()
    return () => {
      isMounted = false
    }
  }, [activeTab])

  async function handleLoadMoreTrending() {
    if (trendingLoadingMore || !trendingHasMore) return
    const nextPage = trendingPage + 1
    try {
      setTrendingLoadingMore(true)
      const res = await getTrendingPosts({ page: nextPage, limit: TRENDING_PAGE_LIMIT })
      const incoming = res.data?.posts ?? []
      setTrendingPosts((prev) => mergeUniqueById(prev, incoming))
      setTrendingPage(nextPage)
      setTrendingHasMore(Boolean(res.data?.pagination?.has_more))
    } catch (err) {
      setTrendingError(err.message || 'No se pudieron cargar más tendencias.')
    } finally {
      setTrendingLoadingMore(false)
    }
  }

  async function handleLoadMorePeople() {
    if (peopleLoadingMore || !peopleHasMore) return
    const nextPage = peoplePage + 1
    try {
      setPeopleLoadingMore(true)
      const res = await getUsers({
        page: nextPage,
        limit: PEOPLE_PAGE_LIMIT,
        q: debouncedPeopleQuery
      })
      const incoming = (res.data?.users ?? []).filter(
        (u) => String(u._id) !== String(currentUserId)
      )
      setPeople((prev) => mergeUniqueById(prev, incoming))
      setPeoplePage(nextPage)
      setPeopleHasMore(Boolean(res.data?.pagination?.has_more))
    } catch (err) {
      setPeopleError(err.message || 'No se pudieron cargar más personas.')
    } finally {
      setPeopleLoadingMore(false)
    }
  }

  async function handleToggleFollow(person) {
    const id = String(person._id)
    if (busyFollowIds.has(id)) return

    const nextFollowing = !person.is_following
    setBusyFollowIds((prev) => new Set(prev).add(id))

    try {
      if (nextFollowing) {
        await followUser(id)
      } else {
        await unfollowUser(id)
      }

      const updateList = (list) =>
        list.map((u) => (String(u._id) === id ? { ...u, is_following: nextFollowing } : u))

      setPeople(updateList)
      setForYouPeople(updateList)
    } catch {
      // Mantiene estado anterior si falla
    } finally {
      setBusyFollowIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleJoinCommunity(communityId) {
    const id = String(communityId)
    if (busyJoinIds.has(id) || myCommunityIds.has(id)) return

    setBusyJoinIds((prev) => new Set(prev).add(id))
    try {
      await joinCommunity(id)
      setMyCommunityIds((prev) => new Set(prev).add(id))
    } catch {
      // Mantiene estado anterior si falla
    } finally {
      setBusyJoinIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handlePostUpdated = useCallback((updatedPost) => {
    const updater = (prev) =>
      prev.map((item) => (item._id === updatedPost._id ? { ...item, ...updatedPost } : item))
    setForYouPosts(updater)
    setTrendingPosts(updater)
  }, [])

  const handlePostDeleted = useCallback((deletedPostId) => {
    const filterer = (prev) => prev.filter((item) => item._id !== deletedPostId)
    setForYouPosts(filterer)
    setTrendingPosts(filterer)
  }, [])

  const filteredCommunities = useMemo(() => {
    const q = communitiesQuery.trim().toLowerCase()
    if (!q) return communities
    return communities.filter(
      (c) =>
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.descripcion || '').toLowerCase().includes(q)
    )
  }, [communities, communitiesQuery])

  function renderPersonCard(person) {
    const id = String(person._id)
    const isBusy = busyFollowIds.has(id)
    const isFollowing = Boolean(person.is_following)

    return (
      <li key={id} className='explore-person-card'>
        <Link to={`/users/${id}`} className='explore-person-card__main'>
          <Avatar name={person.nombre} avatarUrl={person.avatar_url} size='sm' />
          <div className='explore-person-card__info'>
            <span className='explore-person-card__name'>{person.nombre}</span>
            {person.username && (
              <span className='explore-person-card__username'>@{person.username}</span>
            )}
            {person.bio && <p className='explore-person-card__bio'>{person.bio}</p>}
          </div>
        </Link>
        <button
          type='button'
          className={`explore-action-btn${isFollowing ? ' explore-action-btn--active' : ''}`}
          disabled={isBusy}
          onClick={() => handleToggleFollow(person)}
        >
          {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
          <span>{isBusy ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}</span>
        </button>
      </li>
    )
  }

  function renderCommunityCard(community) {
    const id = String(community._id)
    const isMember = myCommunityIds.has(id)
    const isBusy = busyJoinIds.has(id)

    return (
      <li key={id} className='explore-community-card'>
        <Link to={`/communities/${id}`} className='explore-community-card__main'>
          {community.imagen_url ? (
            <img
              src={community.imagen_url}
              alt={community.nombre}
              className='explore-community-card__img'
            />
          ) : (
            <span className='explore-community-card__icon' aria-hidden='true'>
              <Users size={18} />
            </span>
          )}
          <div className='explore-community-card__info'>
            <span className='explore-community-card__name'>{community.nombre}</span>
            {community.descripcion && (
              <p className='explore-community-card__desc'>{community.descripcion}</p>
            )}
          </div>
        </Link>
        <button
          type='button'
          className={`explore-action-btn${isMember ? ' explore-action-btn--active' : ''}`}
          disabled={isBusy || isMember}
          onClick={() => handleJoinCommunity(id)}
        >
          <span>{isBusy ? '...' : isMember ? 'Miembro' : 'Unirse'}</span>
        </button>
      </li>
    )
  }

  return (
    <section
      className='loop-page explore-page'
      onTouchStart={handleSwipeTouchStart}
      onTouchEnd={handleSwipeTouchEnd}
      onTouchCancel={handleSwipeTouchCancel}
    >
      <header className='loop-page__header'>
        <h1 className='loop-page__title'>Explorar</h1>
        <p className='loop-page__subtitle'>
          Descubrí personas, tendencias y comunidades en LOOP
        </p>
      </header>

      <nav className='explore-tabs' role='tablist' aria-label='Categorías de Explorar'>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              className={`explore-tab${isActive ? ' explore-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>

      {/* PESTAÑA: PARA VOS */}
      {activeTab === 'for_you' && (
        <div className='explore-panel' role='tabpanel'>
          {forYouLoading && (
            <div className='loop-empty'>
              <p className='loop-empty__text'>Cargando recomendaciones...</p>
            </div>
          )}

          {!forYouLoading && forYouError && <Alert variant='error'>{forYouError}</Alert>}

          {!forYouLoading && !forYouError && (
            <>
              {forYouPeople.length === 0 &&
              forYouCommunities.length === 0 &&
              forYouPosts.length === 0 ? (
                <div className='loop-empty'>
                  <span className='loop-empty__icon' aria-hidden='true'>
                    <Sparkles size={22} />
                  </span>
                  <h2 className='loop-empty__title'>Todavía no hay contenido para descubrir</h2>
                  <p className='loop-empty__text'>
                    Cuando haya más personas, comunidades y publicaciones aparecerán acá.
                  </p>
                </div>
              ) : (
                <>
                  {forYouPeople.length > 0 && (
                    <section className='explore-section'>
                      <div className='explore-section__header'>
                        <h2 className='explore-section__title'>Personas que podrías seguir</h2>
                        <button
                          type='button'
                          className='explore-section__more'
                          onClick={() => setActiveTab('people')}
                        >
                          Ver más
                        </button>
                      </div>
                      <ul className='explore-list'>{forYouPeople.map(renderPersonCard)}</ul>
                    </section>
                  )}

                  {forYouCommunities.length > 0 && (
                    <section className='explore-section'>
                      <div className='explore-section__header'>
                        <h2 className='explore-section__title'>
                          Comunidades que podrían interesarte
                        </h2>
                        <button
                          type='button'
                          className='explore-section__more'
                          onClick={() => setActiveTab('communities')}
                        >
                          Ver más
                        </button>
                      </div>
                      <ul className='explore-list'>
                        {forYouCommunities.map(renderCommunityCard)}
                      </ul>
                    </section>
                  )}

                  {forYouPosts.length > 0 && (
                    <section className='explore-section'>
                      <div className='explore-section__header'>
                        <h2 className='explore-section__title'>Publicaciones destacadas</h2>
                        <button
                          type='button'
                          className='explore-section__more'
                          onClick={() => setActiveTab('trending')}
                        >
                          Ver más
                        </button>
                      </div>
                      <div className='explore-posts'>
                        {forYouPosts.map((post) => (
                          <PostCard
                            key={post._id}
                            post={post}
                            onPostUpdated={handlePostUpdated}
                            onPostDeleted={handlePostDeleted}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* PESTAÑA: TENDENCIAS */}
      {activeTab === 'trending' && (
        <div className='explore-panel' role='tabpanel'>
          {trendingLoading && (
            <div className='loop-empty'>
              <p className='loop-empty__text'>Cargando tendencias...</p>
            </div>
          )}

          {!trendingLoading && trendingError && <Alert variant='error'>{trendingError}</Alert>}

          {!trendingLoading && !trendingError && trendingPosts.length === 0 && (
            <div className='loop-empty'>
              <span className='loop-empty__icon' aria-hidden='true'>
                <Flame size={22} />
              </span>
              <h2 className='loop-empty__title'>Sin tendencias recientes</h2>
              <p className='loop-empty__text'>
                Todavía no hay publicaciones con actividad en los últimos 7 días.
              </p>
            </div>
          )}

          {!trendingLoading && trendingPosts.length > 0 && (
            <>
              <div className='explore-posts'>
                {trendingPosts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onPostUpdated={handlePostUpdated}
                    onPostDeleted={handlePostDeleted}
                  />
                ))}
              </div>
              {trendingHasMore && (
                <button
                  type='button'
                  className='explore-load-more'
                  disabled={trendingLoadingMore}
                  onClick={handleLoadMoreTrending}
                >
                  {trendingLoadingMore ? 'Cargando...' : 'Cargar más'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* PESTAÑA: PERSONAS */}
      {activeTab === 'people' && (
        <div className='explore-panel' role='tabpanel'>
          <div className='explore-search'>
            <Search size={16} className='explore-search__icon' aria-hidden='true' />
            <input
              type='search'
              className='explore-search__input'
              placeholder='Buscar personas por nombre o @usuario...'
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              aria-label='Buscar personas'
            />
          </div>

          {peopleLoading && (
            <div className='loop-empty'>
              <p className='loop-empty__text'>Buscando personas...</p>
            </div>
          )}

          {!peopleLoading && peopleError && <Alert variant='error'>{peopleError}</Alert>}

          {!peopleLoading && !peopleError && people.length === 0 && (
            <div className='explore-empty'>
              <p className='explore-empty__text'>
                {debouncedPeopleQuery
                  ? 'No se encontraron personas para esta búsqueda.'
                  : 'No hay personas disponibles para mostrar.'}
              </p>
            </div>
          )}

          {!peopleLoading && people.length > 0 && (
            <>
              <ul className='explore-list'>{people.map(renderPersonCard)}</ul>
              {peopleHasMore && (
                <button
                  type='button'
                  className='explore-load-more'
                  disabled={peopleLoadingMore}
                  onClick={handleLoadMorePeople}
                >
                  {peopleLoadingMore ? 'Cargando...' : 'Cargar más'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* PESTAÑA: COMUNIDADES */}
      {activeTab === 'communities' && (
        <div className='explore-panel' role='tabpanel'>
          <div className='explore-search'>
            <Search size={16} className='explore-search__icon' aria-hidden='true' />
            <input
              type='search'
              className='explore-search__input'
              placeholder='Buscar comunidades...'
              value={communitiesQuery}
              onChange={(e) => setCommunitiesQuery(e.target.value)}
              aria-label='Buscar comunidades'
            />
          </div>

          {communitiesLoading && (
            <div className='loop-empty'>
              <p className='loop-empty__text'>Cargando comunidades...</p>
            </div>
          )}

          {!communitiesLoading && communitiesError && (
            <Alert variant='error'>{communitiesError}</Alert>
          )}

          {!communitiesLoading && !communitiesError && filteredCommunities.length === 0 && (
            <div className='explore-empty'>
              <p className='explore-empty__text'>
                {communitiesQuery.trim()
                  ? 'No se encontraron comunidades para esta búsqueda.'
                  : 'Todavía no hay comunidades disponibles.'}
              </p>
            </div>
          )}

          {!communitiesLoading && filteredCommunities.length > 0 && (
            <ul className='explore-list'>{filteredCommunities.map(renderCommunityCard)}</ul>
          )}
        </div>
      )}
    </section>
  )
}
