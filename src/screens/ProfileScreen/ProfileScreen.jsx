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
  getMyProfile,
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

  // Estados de edicion de perfil propio
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)
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

    async function loadProfileData() {
      try {
        setLoading(true)
        setError(null)
        setFollowError(null)
        setActiveTab('posts')
        setIsEditing(false)
        setEditSuccess(null)

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

        const loadedProfile = profileRes.data?.user ?? null
        setProfile(loadedProfile)
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
    setEditError(null)
    setEditSuccess(null)
    setIsEditing(true)
  }

  function closeEditForm() {
    if (savingProfile || removingAvatar) return
    setIsEditing(false)
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
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
  }

  async function handleSaveProfile(event) {
    event.preventDefault()
    if (savingProfile || removingAvatar || !profile) return

    const trimmedName = editName.trim()
    const nameChanged = trimmedName !== (profile.nombre || '').trim()

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setEditError('El nombre debe tener entre 2 y 50 caracteres.')
      return
    }

    if (!nameChanged && !selectedFile) {
      setEditError('No realizaste ningun cambio para guardar.')
      return
    }

    try {
      setSavingProfile(true)
      setEditError(null)
      setEditSuccess(null)

      let latestUser = profile

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
      }

      syncUpdatedUser(latestUser)
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      setIsEditing(false)
      setEditSuccess('Perfil actualizado correctamente.')
    } catch (err) {
      setEditError(err.message || 'No se pudieron guardar los cambios.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleRemoveAvatar() {
    if (savingProfile || removingAvatar || !profile?.avatar_url) return

    try {
      setRemovingAvatar(true)
      setEditError(null)
      setEditSuccess(null)
      const res = await deleteMyAvatar()
      if (res.data?.user) {
        syncUpdatedUser(res.data.user)
      }
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      setEditSuccess('Foto de perfil eliminada.')
    } catch (err) {
      setEditError(err.message || 'No se pudo eliminar la foto de perfil.')
    } finally {
      setRemovingAvatar(false)
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
                    disabled={savingProfile || removingAvatar}
                    aria-label='Cerrar edicion'
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className='profile-edit-form__avatar-row'>
                  <Avatar
                    name={editName || profile.nombre}
                    avatarUrl={previewUrl || profile.avatar_url}
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
                        disabled={savingProfile || removingAvatar}
                        hidden
                      />
                    </label>

                    {profile.avatar_url && (
                      <button
                        type='button'
                        className='profile-edit-form__remove-btn'
                        onClick={handleRemoveAvatar}
                        disabled={savingProfile || removingAvatar}
                      >
                        <Trash2 size={14} />
                        <span>{removingAvatar ? 'Quitando...' : 'Quitar foto'}</span>
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
                    disabled={savingProfile || removingAvatar}
                    required
                  />
                </div>

                {editError && <Alert variant='error'>{editError}</Alert>}

                <div className='profile-edit-form__footer'>
                  <button
                    type='button'
                    className='profile-edit-form__btn profile-edit-form__btn--ghost'
                    onClick={closeEditForm}
                    disabled={savingProfile || removingAvatar}
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    className='profile-edit-form__btn profile-edit-form__btn--primary'
                    disabled={savingProfile || removingAvatar}
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
