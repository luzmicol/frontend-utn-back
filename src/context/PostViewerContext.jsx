import { createContext, useCallback, useContext, useState } from 'react'
import { useLocation } from 'react-router-dom'

const PostViewerContext = createContext(null)

export function PostViewerProvider({ children }) {
  const location = useLocation()
  const currentRoute = `${location.pathname}${location.search}`
  const [viewerState, setViewerState] = useState(null)

  const openPostViewer = useCallback(
    ({ post, posts = null, index = null, onPostUpdated = null, onPostDeleted = null } = {}) => {
      if (!post) return
      const validList = Array.isArray(posts) && posts.length > 0 ? posts : null
      let resolvedIndex = 0
      if (validList) {
        if (typeof index === 'number' && index >= 0 && index < validList.length) {
          resolvedIndex = index
        } else {
          const found = validList.findIndex((item) => String(item._id) === String(post._id))
          resolvedIndex = found >= 0 ? found : 0
        }
      }
      setViewerState({
        post: validList ? validList[resolvedIndex] : post,
        posts: validList,
        index: resolvedIndex,
        onPostUpdated,
        onPostDeleted,
        openedRoute: currentRoute
      })
    },
    [currentRoute]
  )

  const closePostViewer = useCallback(() => {
    setViewerState(null)
  }, [])

  const goPrev = useCallback(() => {
    setViewerState((prev) => {
      if (!prev?.posts || prev.index <= 0) return prev
      const nextIndex = prev.index - 1
      return {
        ...prev,
        index: nextIndex,
        post: prev.posts[nextIndex]
      }
    })
  }, [])

  const goNext = useCallback(() => {
    setViewerState((prev) => {
      if (!prev?.posts || prev.index >= prev.posts.length - 1) return prev
      const nextIndex = prev.index + 1
      return {
        ...prev,
        index: nextIndex,
        post: prev.posts[nextIndex]
      }
    })
  }, [])

  const removePostFromViewer = useCallback((deletedPostId) => {
    setViewerState((prev) => {
      if (!prev) return null
      if (!prev.posts) {
        return String(prev.post?._id) === String(deletedPostId) ? null : prev
      }
      const nextPosts = prev.posts.filter((item) => String(item._id) !== String(deletedPostId))
      if (nextPosts.length === 0) return null
      const nextIndex = Math.min(prev.index, nextPosts.length - 1)
      return {
        ...prev,
        posts: nextPosts,
        index: nextIndex,
        post: nextPosts[nextIndex]
      }
    })
  }, [])

  const updateViewerPost = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return
    setViewerState((prev) => {
      if (!prev?.post) return prev
      const updatedPost = { ...prev.post, ...patch }
      const nextPosts = prev.posts
        ? prev.posts.map((item) =>
            String(item._id) === String(updatedPost._id) ? updatedPost : item
          )
        : null
      if (prev.onPostUpdated) {
        prev.onPostUpdated(updatedPost)
      }
      return {
        ...prev,
        post: updatedPost,
        posts: nextPosts
      }
    })
  }, [])

  // Si el usuario navega a otra ruta (ej. perfil o comunidad), el visor se cierra automaticamente
  const activeViewerState =
    viewerState && viewerState.openedRoute === currentRoute ? viewerState : null

  const hasList = Boolean(activeViewerState?.posts && activeViewerState.posts.length > 1)
  const hasPrev = Boolean(hasList && activeViewerState.index > 0)
  const hasNext = Boolean(
    hasList && activeViewerState.index < activeViewerState.posts.length - 1
  )

  return (
    <PostViewerContext.Provider
      value={{
        viewerState: activeViewerState,
        isOpen: Boolean(activeViewerState?.post),
        hasList,
        hasPrev,
        hasNext,
        currentIndex: activeViewerState?.index ?? 0,
        totalCount: activeViewerState?.posts?.length ?? (activeViewerState?.post ? 1 : 0),
        openPostViewer,
        closePostViewer,
        goPrev,
        goNext,
        removePostFromViewer,
        updateViewerPost
      }}
    >
      {children}
    </PostViewerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePostViewer() {
  return useContext(PostViewerContext)
}
