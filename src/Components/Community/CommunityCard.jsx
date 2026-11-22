import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, LogOut, UserPlus, Users } from 'lucide-react'
import { joinCommunity, leaveCommunity } from '../../services/communityService'
import Alert from '../Alert/Alert'
import './CommunityCard.css'

export default function CommunityCard({
  community,
  membershipRole,
  showLeave = false,
  onJoined,
  onLeft
}) {
  const isMember = Boolean(membershipRole)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleJoin() {
    try {
      setBusy(true)
      setError(null)
      await joinCommunity(community._id)
      if (onJoined) {
        onJoined(community)
      }
    } catch (err) {
      setError(err.message || 'No se pudo completar la union a la comunidad.')
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    try {
      setBusy(true)
      setError(null)
      await leaveCommunity(community._id)
      if (onLeft) {
        onLeft(community._id)
      }
    } catch (err) {
      setError(err.message || 'No se pudo abandonar la comunidad.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className='community-card'>
      <div className='community-card__top'>
        <Link to={`/communities/${community._id}`} className='community-card__info community-card__link'>
          <div className='community-card__title-row'>
            <span className='community-card__icon' aria-hidden='true'>
              <Users size={16} />
            </span>
            <h3 className='community-card__name'>{community.nombre}</h3>
          </div>

          {community.fk_id_creador?.nombre && (
            <span className='community-card__creator'>
              Creada por {community.fk_id_creador.nombre}
            </span>
          )}
        </Link>

        <div className='community-card__actions'>
          {isMember ? (
            <>
              <span className='community-card__badge'>
                <Check size={14} />
                <span>{membershipRole === 'owner' ? 'Miembro · Owner' : 'Miembro'}</span>
              </span>
              {showLeave && (
                <button
                  type='button'
                  className='community-card__btn community-card__btn--danger'
                  onClick={handleLeave}
                  disabled={busy}
                >
                  <LogOut size={14} />
                  <span>{busy ? 'Saliendo...' : 'Abandonar'}</span>
                </button>
              )}
            </>
          ) : (
            <button
              type='button'
              className='community-card__btn community-card__btn--primary'
              onClick={handleJoin}
              disabled={busy}
            >
              <UserPlus size={14} />
              <span>{busy ? 'Uniendo...' : 'Unirme'}</span>
            </button>
          )}
        </div>
      </div>

      {community.descripcion && (
        <p className='community-card__description'>{community.descripcion}</p>
      )}

      {error && <Alert variant='error'>{error}</Alert>}
    </article>
  )
}
