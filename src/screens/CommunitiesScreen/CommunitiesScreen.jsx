import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { getCommunities, getMyCommunities } from '../../services/communityService'
import { fetchWithCache, getCachedData } from '../../utils/memoryCache'
import CommunityCard from '../../Components/Community/CommunityCard'
import CommunityForm from '../../Components/Community/CommunityForm'
import Alert from '../../Components/Alert/Alert'
import './CommunitiesScreen.css'

const COMMUNITIES_ALL_KEY = 'communities:all'
const COMMUNITIES_ME_KEY = 'communities:me'

export default function CommunitiesScreen() {
  const cachedAll = getCachedData(COMMUNITIES_ALL_KEY)?.data
  const cachedMe = getCachedData(COMMUNITIES_ME_KEY)?.data
  const [allCommunities, setAllCommunities] = useState(() => cachedAll ?? [])
  const [myCommunities, setMyCommunities] = useState(() => cachedMe ?? [])
  const [loading, setLoading] = useState(() => !(cachedAll && cachedMe))
  const [error, setError] = useState(null)

  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    let isMounted = true
    const hasCached = Boolean(
      getCachedData(COMMUNITIES_ALL_KEY)?.data && getCachedData(COMMUNITIES_ME_KEY)?.data
    )

    async function loadData() {
      try {
        if (!hasCached) setLoading(true)
        setError(null)
        const [allList, myList] = await Promise.all([
          fetchWithCache(COMMUNITIES_ALL_KEY, async () => {
            const res = await getCommunities()
            return res.data?.communities ?? []
          }),
          fetchWithCache(COMMUNITIES_ME_KEY, async () => {
            const res = await getMyCommunities()
            return res.data?.communities ?? []
          })
        ])
        if (isMounted) {
          setAllCommunities(allList)
          setMyCommunities(myList)
        }
      } catch (err) {
        if (isMounted && !hasCached) {
          setError(err.message || 'No se pudieron cargar las comunidades.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const myRolesById = useMemo(() => {
    const map = new Map()
    for (const c of myCommunities) {
      map.set(c._id, c.rol || 'user')
    }
    return map
  }, [myCommunities])

  const visibleCommunities = useMemo(() => {
    const source = activeTab === 'mine' ? myCommunities : allCommunities
    const query = searchTerm.trim().toLowerCase()
    if (!query) return source
    return source.filter((c) => c.nombre.toLowerCase().includes(query))
  }, [activeTab, allCommunities, myCommunities, searchTerm])

  function handleCreated(newCommunity) {
    setAllCommunities((prev) => [newCommunity, ...prev])
    setMyCommunities((prev) => [{ ...newCommunity, rol: 'owner' }, ...prev])
    setShowCreateForm(false)
  }

  function handleJoined(community) {
    setMyCommunities((prev) => {
      if (prev.some((c) => c._id === community._id)) return prev
      return [{ ...community, rol: 'user' }, ...prev]
    })
  }

  function handleLeft(communityId) {
    setMyCommunities((prev) => prev.filter((c) => c._id !== communityId))
  }

  return (
    <section className='loop-page'>
      <header className='communities-header'>
        <div className='loop-page__header'>
          <h1 className='loop-page__title'>Comunidades</h1>
          <p className='loop-page__subtitle'>
            Explora espacios publicos, unite y gestiona tus comunidades
          </p>
        </div>

        <button
          type='button'
          className='communities-header__create'
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          <Plus size={16} />
          <span>Crear comunidad</span>
        </button>
      </header>

      {showCreateForm && (
        <CommunityForm
          onCreated={handleCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className='communities-controls'>
        <div className='communities-tabs' role='tablist'>
          <button
            type='button'
            role='tab'
            aria-selected={activeTab === 'all'}
            className={`communities-tab${activeTab === 'all' ? ' communities-tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todas ({allCommunities.length})
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={activeTab === 'mine'}
            className={`communities-tab${activeTab === 'mine' ? ' communities-tab--active' : ''}`}
            onClick={() => setActiveTab('mine')}
          >
            Mis comunidades ({myCommunities.length})
          </button>
        </div>

        <div className='communities-search'>
          <Search size={16} className='communities-search__icon' />
          <input
            type='search'
            className='communities-search__input'
            placeholder='Buscar por nombre...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label='Buscar comunidades por nombre'
          />
        </div>
      </div>

      {loading && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando comunidades...</p>
        </div>
      )}

      {!loading && error && <Alert variant='error'>{error}</Alert>}

      {!loading && !error && visibleCommunities.length === 0 && (
        <div className='loop-empty'>
          <span className='loop-empty__icon' aria-hidden='true'>
            <Users size={22} />
          </span>
          <h2 className='loop-empty__title'>
            {searchTerm.trim()
              ? 'Sin resultados para tu busqueda'
              : activeTab === 'mine'
                ? 'Todavia no perteneces a ninguna comunidad'
                : 'Todavia no hay comunidades creadas'}
          </h2>
          <p className='loop-empty__text'>
            {searchTerm.trim()
              ? 'Proba con otro termino o limpia el buscador.'
              : 'Podes crear una nueva comunidad o unirte a una existente.'}
          </p>
        </div>
      )}

      {!loading && !error && visibleCommunities.length > 0 && (
        <div className='loop-page'>
          {visibleCommunities.map((community) => (
            <CommunityCard
              key={community._id}
              community={community}
              membershipRole={myRolesById.get(community._id) || null}
              showLeave={activeTab === 'mine'}
              onJoined={handleJoined}
              onLeft={handleLeft}
            />
          ))}
        </div>
      )}
    </section>
  )
}
