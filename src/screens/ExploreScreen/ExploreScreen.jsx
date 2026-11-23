import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getUsers } from '../../services/userService'
import { getPosts } from '../../services/postService'
import PostCard from '../../Components/Post/PostCard'
import Avatar from '../../Components/UI/Avatar'
import Alert from '../../Components/Alert/Alert'
import './ExploreScreen.css'

export default function ExploreScreen() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadExplore() {
      try {
        setLoading(true)
        setError(null)
        const [usersRes, postsRes] = await Promise.all([
          getUsers(),
          getPosts()
        ])
        if (isMounted) {
          setUsers(usersRes.data?.users ?? [])
          setPosts(postsRes.data?.posts ?? [])
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudo cargar la seccion Explorar.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadExplore()

    return () => {
      isMounted = false
    }
  }, [])

  const normalizedQuery = searchTerm.trim().toLowerCase()

  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) return users
    return users.filter((person) =>
      (person.nombre || '').toLowerCase().includes(normalizedQuery) ||
      (person.username || '').toLowerCase().includes(normalizedQuery)
    )
  }, [users, normalizedQuery])

  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return posts
    return posts.filter((post) => {
      const contentMatch = (post.contenido || '').toLowerCase().includes(normalizedQuery)
      const authorMatch = (post.fk_id_usuario?.nombre || '').toLowerCase().includes(normalizedQuery)
      const communityMatch = (post.fk_id_comunidad?.nombre || '').toLowerCase().includes(normalizedQuery)
      return contentMatch || authorMatch || communityMatch
    })
  }, [posts, normalizedQuery])

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
      <header className='loop-page__header'>
        <h1 className='loop-page__title'>Explorar</h1>
        <p className='loop-page__subtitle'>
          Busca personas y publicaciones en LOOP
        </p>
      </header>

      <div className='explore-search'>
        <Search size={16} className='explore-search__icon' aria-hidden='true' />
        <input
          type='search'
          className='explore-search__input'
          placeholder='Buscar personas, publicaciones o comunidades...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label='Buscar personas y publicaciones'
        />
      </div>

      {loading && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando contenido...</p>
        </div>
      )}

      {!loading && error && <Alert variant='error'>{error}</Alert>}

      {!loading && !error && (
        <>
          {!normalizedQuery && users.length === 0 && posts.length === 0 ? (
            <div className='loop-empty'>
              <span className='loop-empty__icon' aria-hidden='true'>
                <Users size={22} />
              </span>
              <h2 className='loop-empty__title'>Todavia no hay contenido para explorar</h2>
              <p className='loop-empty__text'>
                Escribi un termino en el buscador cuando haya personas y publicaciones disponibles.
              </p>
            </div>
          ) : (
            <>
              <section className='explore-section'>
                <h2 className='explore-section__title'>Personas</h2>

                {filteredUsers.length === 0 ? (
                  <div className='explore-empty'>
                    <p className='explore-empty__text'>
                      {normalizedQuery
                        ? 'No se encontraron personas para esta busqueda.'
                        : 'Todavia no hay personas registradas.'}
                    </p>
                  </div>
                ) : (
                  <ul className='explore-users'>
                    {filteredUsers.map((person) => (
                      <li key={person._id} className='explore-user-card'>
                        <Link to={getProfileLink(person._id)} className='explore-user-card__link'>
                          <Avatar name={person.nombre} avatarUrl={person.avatar_url} size='sm' />
                          <span className='explore-user-card__name'>
                            {person.nombre}
                            {person.username && (
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                @{person.username}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className='explore-section'>
                <h2 className='explore-section__title'>Publicaciones</h2>

                {filteredPosts.length === 0 ? (
                  <div className='explore-empty'>
                    <p className='explore-empty__text'>
                      {normalizedQuery
                        ? 'No se encontraron publicaciones para esta busqueda.'
                        : 'Todavia no hay publicaciones.'}
                    </p>
                  </div>
                ) : (
                  <div className='loop-page'>
                    {filteredPosts.map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        onPostUpdated={handlePostUpdated}
                        onPostDeleted={handlePostDeleted}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </section>
  )
}
