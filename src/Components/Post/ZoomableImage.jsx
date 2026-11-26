import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageOff, Minus, Plus, RotateCcw } from 'lucide-react'

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.2
const STEP_SCALE = 0.6

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

function getTouchDistance(t1, t2) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
}

function getTouchMidpoint(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  }
}

export default function ZoomableImage({ src, alt = 'Imagen de la publicación' }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(MIN_SCALE)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isInteracting, setIsInteracting] = useState(false)
  const [failed, setFailed] = useState(false)

  const scaleRef = useRef(MIN_SCALE)
  const offsetRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const pinchRef = useRef(null)
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 })

  const updateTransform = useCallback((nextScale, nextOffset) => {
    scaleRef.current = nextScale
    offsetRef.current = nextOffset
    setScale(nextScale)
    setOffset(nextOffset)
  }, [])

  const clampOffset = useCallback((x, y, targetScale) => {
    if (targetScale <= MIN_SCALE || !containerRef.current) {
      return { x: 0, y: 0 }
    }
    const rect = containerRef.current.getBoundingClientRect()
    const maxX = ((targetScale - 1) * rect.width) / 2
    const maxY = ((targetScale - 1) * rect.height) / 2
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY)
    }
  }, [])

  const zoomToPoint = useCallback(
    (targetScale, clientX, clientY) => {
      const clampedScale = clamp(targetScale, MIN_SCALE, MAX_SCALE)
      if (clampedScale <= MIN_SCALE || !containerRef.current) {
        updateTransform(MIN_SCALE, { x: 0, y: 0 })
        return
      }
      const rect = containerRef.current.getBoundingClientRect()
      const relX = clientX - (rect.left + rect.width / 2)
      const relY = clientY - (rect.top + rect.height / 2)
      const ratio = clampedScale / scaleRef.current
      const rawX = offsetRef.current.x * ratio + relX * (1 - ratio)
      const rawY = offsetRef.current.y * ratio + relY * (1 - ratio)
      updateTransform(clampedScale, clampOffset(rawX, rawY, clampedScale))
    },
    [clampOffset, updateTransform]
  )

  const resetZoom = useCallback(() => {
    setIsInteracting(false)
    updateTransform(MIN_SCALE, { x: 0, y: 0 })
  }, [updateTransform])

  const handleZoomIn = useCallback(() => {
    setIsInteracting(false)
    const next = clamp(Number((scaleRef.current + STEP_SCALE).toFixed(2)), MIN_SCALE, MAX_SCALE)
    const clamped = clampOffset(offsetRef.current.x, offsetRef.current.y, next)
    updateTransform(next, clamped)
  }, [clampOffset, updateTransform])

  const handleZoomOut = useCallback(() => {
    setIsInteracting(false)
    const next = clamp(Number((scaleRef.current - STEP_SCALE).toFixed(2)), MIN_SCALE, MAX_SCALE)
    const clamped = clampOffset(offsetRef.current.x, offsetRef.current.y, next)
    updateTransform(next, clamped)
  }, [clampOffset, updateTransform])

  // Reajusta limites si cambia la orientacion o el tamaño de pantalla
  useEffect(() => {
    function handleResize() {
      if (scaleRef.current > MIN_SCALE) {
        const clamped = clampOffset(offsetRef.current.x, offsetRef.current.y, scaleRef.current)
        updateTransform(scaleRef.current, clamped)
      }
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [clampOffset, updateTransform])

  // Arrastre con mouse cuando scale > 1
  function handleMouseDown(event) {
    if (event.button !== 0 || scaleRef.current <= MIN_SCALE) return
    event.preventDefault()
    setIsInteracting(true)
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offsetRef.current.x,
      originY: offsetRef.current.y
    }

    function handleMouseMove(moveEvent) {
      if (!dragRef.current) return
      const dx = moveEvent.clientX - dragRef.current.startX
      const dy = moveEvent.clientY - dragRef.current.startY
      const clamped = clampOffset(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy,
        scaleRef.current
      )
      updateTransform(scaleRef.current, clamped)
    }

    function handleMouseUp() {
      dragRef.current = null
      setIsInteracting(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleDoubleClick(event) {
    setIsInteracting(false)
    if (scaleRef.current > MIN_SCALE) {
      resetZoom()
    } else {
      zoomToPoint(DOUBLE_TAP_SCALE, event.clientX, event.clientY)
    }
  }

  // Gestos tactiles: pellizco (2 dedos), arrastre (1 dedo si scale > 1) y doble toque
  function handleTouchStart(event) {
    if (event.touches.length === 2) {
      dragRef.current = null
      setIsInteracting(true)
      const [t1, t2] = event.touches
      pinchRef.current = {
        startDist: getTouchDistance(t1, t2),
        startScale: scaleRef.current,
        startOffset: { ...offsetRef.current },
        mid: getTouchMidpoint(t1, t2)
      }
      return
    }

    if (event.touches.length === 1 && scaleRef.current > MIN_SCALE) {
      setIsInteracting(true)
      const t = event.touches[0]
      dragRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        originX: offsetRef.current.x,
        originY: offsetRef.current.y
      }
    }
  }

  function handleTouchMove(event) {
    if (event.touches.length === 2 && pinchRef.current) {
      const [t1, t2] = event.touches
      const dist = getTouchDistance(t1, t2)
      const mid = getTouchMidpoint(t1, t2)
      const ratio = dist / Math.max(pinchRef.current.startDist, 1)
      const nextScale = clamp(pinchRef.current.startScale * ratio, MIN_SCALE, MAX_SCALE)

      if (nextScale <= MIN_SCALE || !containerRef.current) {
        updateTransform(MIN_SCALE, { x: 0, y: 0 })
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      const relX = mid.x - (rect.left + rect.width / 2)
      const relY = mid.y - (rect.top + rect.height / 2)
      const scaleChange = nextScale / pinchRef.current.startScale
      const rawX = pinchRef.current.startOffset.x * scaleChange + relX * (1 - scaleChange)
      const rawY = pinchRef.current.startOffset.y * scaleChange + relY * (1 - scaleChange)
      updateTransform(nextScale, clampOffset(rawX, rawY, nextScale))
      return
    }

    if (event.touches.length === 1 && dragRef.current && scaleRef.current > MIN_SCALE) {
      const t = event.touches[0]
      const dx = t.clientX - dragRef.current.startX
      const dy = t.clientY - dragRef.current.startY
      const clamped = clampOffset(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy,
        scaleRef.current
      )
      updateTransform(scaleRef.current, clamped)
    }
  }

  function handleTouchEnd(event) {
    if (pinchRef.current && event.touches.length < 2) {
      pinchRef.current = null
      setIsInteracting(false)
      return
    }

    if (dragRef.current && event.touches.length === 0) {
      const moved =
        event.changedTouches.length === 1 &&
        Math.hypot(
          event.changedTouches[0].clientX - dragRef.current.startX,
          event.changedTouches[0].clientY - dragRef.current.startY
        ) > 10
      dragRef.current = null
      setIsInteracting(false)
      if (moved) return
    }

    // Doble toque (1 dedo)
    if (event.touches.length === 0 && event.changedTouches.length === 1) {
      const t = event.changedTouches[0]
      const now = Date.now()
      const prev = lastTapRef.current
      if (
        now - prev.time < 300 &&
        Math.hypot(t.clientX - prev.x, t.clientY - prev.y) < 28
      ) {
        lastTapRef.current = { time: 0, x: 0, y: 0 }
        setIsInteracting(false)
        if (scaleRef.current > MIN_SCALE) {
          resetZoom()
        } else {
          zoomToPoint(DOUBLE_TAP_SCALE, t.clientX, t.clientY)
        }
      } else {
        lastTapRef.current = { time: now, x: t.clientX, y: t.clientY }
      }
    }
  }

  if (failed) {
    return (
      <div className='post-viewer__media-error'>
        <ImageOff size={24} />
        <span>No se pudo cargar la imagen</span>
      </div>
    )
  }

  const isZoomed = scale > MIN_SCALE

  return (
    <div
      ref={containerRef}
      className={`zoomable-stage${isZoomed ? ' zoomable-stage--zoomed' : ''}${isInteracting ? ' zoomable-stage--dragging' : ''}`}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        className='post-viewer__img zoomable-stage__img'
        draggable={false}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`
        }}
        onError={() => setFailed(true)}
      />

      <div
        className='zoomable-controls'
        role='group'
        aria-label='Controles de zoom'
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type='button'
          className='zoomable-controls__btn'
          onClick={handleZoomOut}
          disabled={scale <= MIN_SCALE}
          aria-label='Alejar imagen'
          title='Alejar'
        >
          <Minus size={15} />
        </button>

        <button
          type='button'
          className='zoomable-controls__btn'
          onClick={handleZoomIn}
          disabled={scale >= MAX_SCALE}
          aria-label='Acercar imagen'
          title='Acercar'
        >
          <Plus size={15} />
        </button>

        {isZoomed && (
          <button
            type='button'
            className='zoomable-controls__btn'
            onClick={resetZoom}
            aria-label='Restablecer zoom'
            title='Restablecer zoom'
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
