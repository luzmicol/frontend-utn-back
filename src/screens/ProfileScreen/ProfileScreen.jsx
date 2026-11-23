import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Calendar, Camera, Pencil, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  deleteMyAvatar,
  followUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getUserById,
  unfollowUser,
  updateMyProfile,
  uploadMyAvatar
} from '../../services/userService'
import { getPosts } from '../../services/postService'
import { prepareAvatarFile } from '../../utils/imageOptimizer'
import Avatar from '../../Components/UI/Avatar'
import PostCard from '../../Components/Post/PostCard'
import Alert from '../../Components/Alert/Alert'
import './ProfileScreen.css'

function formatJoinDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric'
  })
}

export default function ProfileScreen() {
  const { user_id } = useParams()
  const { user: currentUser, setUser } = useAuth()

  const isOwnRoute = !user_id
  const targetUserId = isOwnRoute ? currentUser?._id : user_id

  const [profile, setProfile] = useState(() => (isOwnRoute ? currentUser : null))
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)

  const [activeTab, setActiveTab] = useState('posts')
  const [loadingProfile, setLoadingProfile] = useState(!isOwnRoute)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [error, setError] = useState(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState(null)

  // Estados de edicion de perfil propio (ningun cambio impacta en backend hasta "Guardar")
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [removeAvatarPending, setRemoveAvatarPending] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [editError, setEditError] = useState(null)
  const [editSuccess, setEditSuccess] = useState(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    if (!targetUserId) return

    let isMounted = true

    async function loadProfile() {
      setError(null)
      setFollowError(null)
      setActiveTab('posts')
      setIsEditing(false)
      setEditSuccess(null)
      setLoadingPosts(true)

      if (isOwnRoute) {
        setProfile(currentUser)
        setLoadingProfile(false)
      } else {
        setProfile(null)
        setLoadingProfile(true)
        getUserById(targetUserId)
          .then((res) => {
            if (isMounted) {
              setProfile(res.data?.user ?? null)
            }
          })
          .catch((err) => {
            if (isMounted) {
              setError(err.message || 'No se pudo cargar el perfil.')
            }
          })
          .finally(() => {
            if (isMounted) {
              setLoadingProfile(false)
            }
          })
      }

      getPosts()
        .then((postsRes) => {
          if (isMounted) {
            const allPosts = postsRes.data?.posts ?? []
            setPosts(allPosts.filter((p) => p.fk_id_usuario?._id === targetUserId))
          }
        })
        .catch(() => {
          if (isMounted) setPosts([])
        })
        .finally(() => {
          if (isMounted) setLoadingPosts(false)
        })

      const followRequests = [
        getFollowers(targetUserId),
        getFollowing(targetUserId)
      ]
      if (!isOwnRoute) {
        followRequests.push(getFollowStatus(targetUserId))
      }

      Promise.all(followRequests)
        .then(([followersRes, followingRes, statusRes]) => {
          if (!isMounted) return
          setFollowers(followersRes.data?.followers ?? [])
          setFollowing(followingRes.data?.following ?? [])
          if (!isOwnRoute && statusRes) {
            setIsFollowing(Boolean(statusRes.data?.is_following))
          } else {
            setIsFollowing(false)
          }
        })
        .catch(() => {
          if (!isMounted) return
          setFollowers([])
          setFollowing([])
        })
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [targetUserId, isOwnRoute, currentUser])

  if (user_id && currentUser?._id && user_id === currentUser._id) {
    return <Navigate to='/profile' replace />
  }

  function syncUpdatedUser(updatedUser) {
    setProfile(updatedUser)
    setUser(updatedUser)
    setPosts((prev) =>
      prev.map((post) =>
        post.fk_id_usuario?._id === updatedUser._id
          ? {
              ...post,
              fk_id_usuario: {
                ...post.fk_id_usuario,
                nombre: updatedUser.nombre,
                avatar_url: updatedUser.avatar_url || ''
              }
            }
          : post
      )
    )
  }

  function openEditForm() {
    if (!profile) return
    setEditName(profile.nombre || '')
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setRemoveAvatarPending(false)
    setEditError(null)
    setEditSuccess(null)
    setIsEditing(true)
  }

  function closeEditForm() {
    if (savingProfile) return
    setIsEditing(false)
    setEditName(profile?.nombre || '')
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setRemoveAvatarPending(false)
    setEditError(null)
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    setEditError(null)

    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setEditError('Formato no permitido. Selecciona una imagen JPG, PNG o WebP.')
      event.target.value = ''
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setRemoveAvatarPending(false)
  }

  function handleMarkRemoveAvatar() {
    if (savingProfile) return
    setEditError(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl('')
    setRemoveAvatarPending(true)
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    if (savingProfile || !profile) return

    const trimmedName = editName.trim()
    const nameChanged = trimmedName !== (profile.nombre || '').trim()
    const shouldDeleteAvatar = removeAvatarPending && Boolean(profile.avatar_url)

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setEditError('El nombre debe tener entre 2 y 50 caracteres.')
      return
    }

    if (!nameChanged && !selectedFile && !shouldDeleteAvatar) {
      setEditError('No realizaste ningun cambio para guardar.')
      return
    }

    let latestUser = profile

    try {
      setSavingProfile(true)
      setEditError(null)
      setEditSuccess(null)

      if (nameChanged) {
        const nameRes = await updateMyProfile({ nombre: trimmedName })
        if (nameRes.data?.user) {
          latestUser = nameRes.data.user
        }
      }

      if (selectedFile) {
        const optimizedFile = await prepareAvatarFile(selectedFile)
        const avatarRes = await uploadMyAvatar(optimizedFile)
        if (avatarRes.data?.user) {
          latestUser = avatarRes.data.user
        }
      } else if (shouldDeleteAvatar) {
        const deleteRes = await deleteMyAvatar()
        if (deleteRes.data?.user) {
          latestUser = deleteRes.data.user
        }
      }

      syncUpdatedUser(latestUser)
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      setRemoveAvatarPending(false)
      setIsEditing(false)
      setEditSuccess('Perfil actualizado correctamente.')
    } catch (err) {
      if (latestUser !== profile) {
        syncUpdatedUser(latestUser)
      }
      setEditError(err.message || 'No se pudieron guardar los cambios.')
    } finally {
      setSavingProfile(false)
    }
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
            return [
              {
                _id: currentUser._id,
                nombre: currentUser.nombre,
                avatar_url: currentUser.avatar_url || ''
              },
              ...prev
            ]
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

  const editPreviewUrl = removeAvatarPending
    ? ''
    : previewUrl || profile?.avatar_url || ''
  const canShowRemoveBtn = Boolean(previewUrl || (profile?.avatar_url && !removeAvatarPending))

  return (
    <section className='loop-page'>
      {loadingProfile && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando perfil...</p>
        </div>
      )}

      {!loadingProfile && error && <Alert variant='error'>{error}</Alert>}

      {!loadingProfile && !error && profile && (
        <>
          <header className='profile-hero'>
            <div className='profile-hero__top'>
              <div className='profile-hero__identity'>
                <Avatar
                  name={profile.nombre}
                  avatarUrl={profile.avatar_url}
                  size='lg'
                />
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

              {isOwnRoute ? (
                !isEditing && (
                  <button
                    type='button'
                    className='profile-edit-btn'
                    onClick={openEditForm}
                  >
                    <Pencil size={15} />
                    <span>Editar perfil</span>
                  </button>
                )
              ) : (
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

            {editSuccess && !isEditing && <Alert variant='success'>{editSuccess}</Alert>}
            {followError && <Alert variant='error'>{followError}</Alert>}

            {isOwnRoute && isEditing && (
              <form className='profile-edit-form' onSubmit={handleSaveProfile}>
                <div className='profile-edit-form__header'>
                  <h2 className='profile-edit-form__title'>Editar perfil</h2>
                  <button
                    type='button'
                    className='profile-edit-form__close'
                    onClick={closeEditForm}
                    disabled={savingProfile}
                    aria-label='Cerrar edicion'
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className='profile-edit-form__avatar-row'>
                  <Avatar
                    name={editName || profile.nombre}
                    avatarUrl={editPreviewUrl}
                    size='lg'
                  />

                  <div className='profile-edit-form__avatar-actions'>
                    <label className='profile-edit-form__file-btn'>
                      <Camera size={15} />
                      <span>{selectedFile ? 'Cambiar foto' : 'Seleccionar foto'}</span>
                      <input
                        type='file'
                        accept='image/jpeg,image/png,image/webp'
                        onChange={handleFileChange}
                        disabled={savingProfile}
                        hidden
                      />
                    </label>

                    {canShowRemoveBtn && (
                      <button
                        type='button'
                        className='profile-edit-form__remove-btn'
                        onClick={handleMarkRemoveAvatar}
                        disabled={savingProfile}
                      >
                        <Trash2 size={14} />
                        <span>Quitar foto</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className='profile-edit-form__field'>
                  <label className='profile-edit-form__label' htmlFor='edit-profile-name'>
                    Nombre
                  </label>
                  <input
                    id='edit-profile-name'
                    type='text'
                    className='profile-edit-form__input'
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value)
                      if (editError) setEditError(null)
                    }}
                    minLength={2}
                    maxLength={50}
                    disabled={savingProfile}
                    required
                  />
                </div>

                {editError && <Alert variant='error'>{editError}</Alert>}

                <div className='profile-edit-form__footer'>
                  <button
                    type='button'
                    className='profile-edit-form__btn profile-edit-form__btn--ghost'
                    onClick={closeEditForm}
                    disabled={savingProfile}
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    className='profile-edit-form__btn profile-edit-form__btn--primary'
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )}

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
            loadingPosts ? (
              <div className='loop-empty'>
                <p className='loop-empty__text'>Cargando publicaciones...</p>
              </div>
            ) : posts.length === 0 ? (
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
                      <Avatar name={person.nombre} avatarUrl={person.avatar_url} size='sm' />
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
                      <Avatar name={person.nombre} avatarUrl={person.avatar_url} size='sm' />
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
