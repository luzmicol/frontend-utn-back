import { createContext, useCallback, useContext, useState } from 'react'
import { useLocation } from 'react-router-dom'

const PostViewerContext = createContext(null)

export function PostViewerProvider({ children }) {
  const location = useLocation()
  const currentRoute = `${location.pathname}${location.search}`
  const [viewerState, setViewerState] = useState(null)

  const openPostViewer = useCallback(
    ({ post, posts = null, index = 0, onPostUpdated = null, onPostDeleted = null } = {}) => {
      if (!post) return
      setViewerState({
        post,
        posts: Array.isArray(posts) ? posts : null,
        index: typeof index === 'number' ? index : 0,
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

  // Si el usuario navega a otra ruta (ej. perfil o comunidad), el visor se cierra automaticamente
  const activeViewerState =
    viewerState && viewerState.openedRoute === currentRoute ? viewerState : null

  return (
    <PostViewerContext.Provider
      value={{
        viewerState: activeViewerState,
        isOpen: Boolean(activeViewerState?.post),
        openPostViewer,
        closePostViewer
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
