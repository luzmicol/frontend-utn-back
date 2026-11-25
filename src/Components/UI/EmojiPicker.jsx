import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Smile } from 'lucide-react'
import './EmojiPicker.css'

const RECENT_STORAGE_KEY = 'loop_recent_emojis'
const MAX_RECENT = 16

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    label: 'Caritas',
    icon: '😀',
    items: [
      { e: '😀', k: 'feliz sonrisa risa alegre happy smile' },
      { e: '😂', k: 'risa llorando carcajada lol haha' },
      { e: '🤣', k: 'risa rodando carcajada rofl' },
      { e: '😊', k: 'sonrisa tierno amable blush' },
      { e: '😍', k: 'enamorado corazon amor love' },
      { e: '🥰', k: 'amor corazones tierno love' },
      { e: '😘', k: 'beso amor kiss' },
      { e: '😎', k: 'cool lentes facha sunglasses' },
      { e: '🤩', k: 'estrellas asombrado fan star' },
      { e: '🥳', k: 'fiesta cumple celebracion party' },
      { e: '😉', k: 'guino complicidad wink' },
      { e: '🤔', k: 'pensando duda hmm think' },
      { e: '😮', k: 'sorpresa wow boca abierta' },
      { e: '😢', k: 'triste llanto lagrima sad' },
      { e: '😭', k: 'llorando mucho triste cry' },
      { e: '😤', k: 'enojado resoplo angry' },
      { e: '😡', k: 'furia enojado rabia mad' },
      { e: '🤯', k: 'mente explotada sorpresa mindblown' },
      { e: '😴', k: 'sueno dormido zzz sleep' },
      { e: '🤗', k: 'abrazo carino hug' },
      { e: '😬', k: 'mueca nervioso awkward' },
      { e: '🥺', k: 'por favor ojitos tierno please' },
      { e: '😇', k: 'angel inocente santo' },
      { e: '🤪', k: 'loco divertido crazy' }
    ]
  },
  {
    id: 'gestures',
    label: 'Gestos',
    icon: '👋',
    items: [
      { e: '👋', k: 'hola chau saludo mano wave' },
      { e: '👍', k: 'ok bien pulgar arriba like' },
      { e: '👎', k: 'mal pulgar abajo dislike' },
      { e: '👏', k: 'aplauso bravo bien clap' },
      { e: '🙌', k: 'celebracion manos arriba yay' },
      { e: '🤝', k: 'acuerdo trato saludo handshake' },
      { e: '🙏', k: 'gracias por favor rezar pray' },
      { e: '💪', k: 'fuerza musculo gym strong' },
      { e: '✌️', k: 'paz victoria dedos peace' },
      { e: '🤞', k: 'suerte dedos cruzados luck' },
      { e: '👌', k: 'perfecto ok genial' },
      { e: '🫶', k: 'corazon manos amor love' },
      { e: '👀', k: 'ojos mirando atento eyes' },
      { e: '🫡', k: 'saludo respeto ok' },
      { e: '🤦', k: 'facepalm verguenza ay' },
      { e: '🤷', k: 'no se encoger hombros shrug' }
    ]
  },
  {
    id: 'animals',
    label: 'Animales',
    icon: '🐾',
    items: [
      { e: '🐶', k: 'perro perrito mascota dog' },
      { e: '🐱', k: 'gato gatito michi cat' },
      { e: '🐻', k: 'oso osito bear' },
      { e: '🦊', k: 'zorro fox' },
      { e: '🦁', k: 'leon lion' },
      { e: '🐸', k: 'rana sapo frog' },
      { e: '🦋', k: 'mariposa butterfly' },
      { e: '🐝', k: 'abeja bee' },
      { e: '🌸', k: 'flor primavera cerezo flower' },
      { e: '🌿', k: 'planta hoja naturaleza leaf' },
      { e: '🌞', k: 'sol dia calor sun' },
      { e: '🌙', k: 'luna noche moon' },
      { e: '🌈', k: 'arcoiris colores rainbow' },
      { e: '🔥', k: 'fuego lit genial fire' },
      { e: '⚡', k: 'rayo energia rapido lightning' },
      { e: '🌊', k: 'ola mar agua wave' }
    ]
  },
  {
    id: 'food',
    label: 'Comida',
    icon: '🍕',
    items: [
      { e: '☕', k: 'cafe desayuno coffee' },
      { e: '🧉', k: 'mate argentina yerba' },
      { e: '🍕', k: 'pizza comida' },
      { e: '🍔', k: 'hamburguesa burger' },
      { e: '🌮', k: 'taco comida' },
      { e: '🍣', k: 'sushi comida' },
      { e: '🍰', k: 'torta pastel dulce cake' },
      { e: '🍦', k: 'helado postre ice cream' },
      { e: '🍫', k: 'chocolate dulce' },
      { e: '🍿', k: 'pochoclo cine popcorn' },
      { e: '🍺', k: 'cerveza birra beer' },
      { e: '🥂', k: 'brindis copas celebracion cheers' }
    ]
  },
  {
    id: 'activities',
    label: 'Actividades',
    icon: '⚽',
    items: [
      { e: '⚽', k: 'futbol pelota deporte soccer' },
      { e: '🏀', k: 'basquet deporte basketball' },
      { e: '🎮', k: 'juegos gaming consola videojuego' },
      { e: '🎵', k: 'musica nota cancion music' },
      { e: '🎧', k: 'auriculares musica escuchar' },
      { e: '🎬', k: 'cine pelicula video movie' },
      { e: '📸', k: 'camara foto fotografia' },
      { e: '💻', k: 'computadora codigo programar laptop' },
      { e: '🚀', k: 'cohete despegue lanzamiento rocket' },
      { e: '🎉', k: 'fiesta festejo confeti party' },
      { e: '🏆', k: 'trofeo premio ganador win' },
      { e: '💡', k: 'idea foco creatividad' }
    ]
  },
  {
    id: 'symbols',
    label: 'Simbolos',
    icon: '💜',
    items: [
      { e: '💜', k: 'corazon violeta morado loop amor heart' },
      { e: '❤️', k: 'corazon rojo amor love heart' },
      { e: '💙', k: 'corazon azul amor' },
      { e: '💚', k: 'corazon verde amor' },
      { e: '✨', k: 'brillos magia estrellas sparkles' },
      { e: '⭐', k: 'estrella favorito star' },
      { e: '💯', k: 'cien perfecto 100' },
      { e: '✅', k: 'check listo correcto ok' },
      { e: '❌', k: 'cruz error no cancel' },
      { e: '⚠️', k: 'alerta cuidado warning' },
      { e: '📌', k: 'pin fijar guardado' },
      { e: '💬', k: 'mensaje comentario chat' }
    ]
  }
]

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((cat) => cat.items)

function loadRecentEmojis() {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function saveRecentEmoji(emoji) {
  try {
    const current = loadRecentEmojis().filter((item) => item !== emoji)
    const next = [emoji, ...current].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
    return next
  } catch {
    return [emoji]
  }
}

const EmojiGrid = memo(function EmojiGrid({ emojis, categoryKey, onPick }) {
  if (emojis.length === 0) {
    return (
      <div className='emoji-picker__grid'>
        <p className='emoji-picker__empty'>Sin resultados</p>
      </div>
    )
  }

  return (
    <div className='emoji-picker__grid'>
      {emojis.map((item) => (
        <button
          key={`${categoryKey}-${item.e}`}
          type='button'
          className='emoji-picker__item'
          onClick={() => onPick(item.e)}
          aria-label={`Insertar ${item.e}`}
        >
          {item.e}
        </button>
      ))}
    </div>
  )
})

export default function EmojiPicker({
  onSelect,
  disabled = false,
  placement = 'top',
  align = 'left'
}) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('smileys')
  const [search, setSearch] = useState('')
  const [recent, setRecent] = useState(() => loadRecentEmojis())
  const containerRef = useRef(null)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const visibleEmojis = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query) {
      return ALL_EMOJIS.filter((item) => item.k.includes(query) || item.e.includes(query))
    }

    if (activeCategory === 'recent') {
      return recent.map((emoji) => ({ e: emoji, k: emoji }))
    }

    const found = EMOJI_CATEGORIES.find((cat) => cat.id === activeCategory)
    return found ? found.items : []
  }, [search, activeCategory, recent])

  const handleSelectEmoji = useCallback((emoji) => {
    if (onSelectRef.current) {
      onSelectRef.current(emoji)
    }
    setTimeout(() => {
      const nextRecent = saveRecentEmoji(emoji)
      setRecent((prev) => (prev[0] === nextRecent[0] && prev.length === nextRecent.length ? prev : nextRecent))
    }, 0)
  }, [])

  return (
    <div className='emoji-picker' ref={containerRef}>
      <button
        type='button'
        className={`emoji-picker__trigger${open ? ' emoji-picker__trigger--open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-label='Insertar emoji'
        aria-expanded={open}
        aria-haspopup='dialog'
        title='Insertar emoji'
      >
        <Smile size={16} strokeWidth={2} />
      </button>

      {open && (
        <div
          className={`emoji-picker__panel emoji-picker__panel--${placement} emoji-picker__panel--align-${align}`}
          role='dialog'
          aria-label='Selector de emojis'
        >
          <div className='emoji-picker__search-wrap'>
            <Search size={14} className='emoji-picker__search-icon' aria-hidden='true' />
            <input
              type='text'
              className='emoji-picker__search'
              placeholder='Buscar emoji...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label='Buscar emoji por palabra clave'
            />
          </div>

          {!search.trim() && (
            <div className='emoji-picker__tabs' role='tablist' aria-label='Categorias de emojis'>
              {recent.length > 0 && (
                <button
                  type='button'
                  role='tab'
                  aria-selected={activeCategory === 'recent'}
                  className={`emoji-picker__tab${activeCategory === 'recent' ? ' emoji-picker__tab--active' : ''}`}
                  onClick={() => setActiveCategory('recent')}
                  aria-label='Recientes'
                  title='Recientes'
                >
                  🕒
                </button>
              )}
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type='button'
                  role='tab'
                  aria-selected={activeCategory === cat.id}
                  className={`emoji-picker__tab${activeCategory === cat.id ? ' emoji-picker__tab--active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                  aria-label={cat.label}
                  title={cat.label}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          <EmojiGrid
            emojis={visibleEmojis}
            categoryKey={search.trim() ? 'search' : activeCategory}
            onPick={handleSelectEmoji}
          />
        </div>
      )}
    </div>
  )
}
