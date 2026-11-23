const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_DIMENSION = 512
const TARGET_BYTES = 150 * 1024
const MAX_FINAL_BYTES = 1024 * 1024 // 1 MB
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.5, 0.4]

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }
    img.src = objectUrl
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo procesar la imagen en el navegador.'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      quality
    )
  })
}

export async function prepareAvatarFile(file) {
  if (!file) {
    throw new Error('Selecciona una imagen valida.')
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WebP.')
  }

  // Si ya es <= 1 MB no es obligatorio recomprimir; si supera 1 MB optimizamos en canvas
  if (file.size <= MAX_FINAL_BYTES) {
    return file
  }

  const img = await loadImage(file)

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
  const targetWidth = Math.max(1, Math.round(img.width * scale))
  const targetHeight = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo procesar la imagen en este navegador.')
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  let bestBlob = null

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality)
    bestBlob = blob
    if (blob.size <= TARGET_BYTES) {
      break
    }
  }

  if (!bestBlob || bestBlob.size > MAX_FINAL_BYTES) {
    throw new Error('La imagen es demasiado grande incluso tras comprimirla (maximo 1 MB).')
  }

  return new File([bestBlob], 'avatar.webp', { type: 'image/webp' })
}

const POST_MAX_ORIGINAL_BYTES = 5 * 1024 * 1024 // 5 MB
const POST_MAX_DIMENSION = 1200
const POST_TARGET_BYTES = 300 * 1024
const POST_MAX_FINAL_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

export async function preparePostImageFile(file) {
  if (!file) {
    throw new Error('Selecciona una imagen valida.')
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WebP.')
  }

  if (file.size > POST_MAX_ORIGINAL_BYTES) {
    throw new Error('La imagen no puede superar los 5 MB.')
  }

  const img = await loadImage(file)
  const scale = Math.min(1, POST_MAX_DIMENSION / Math.max(img.width, img.height))
  const targetWidth = Math.max(1, Math.round(img.width * scale))
  const targetHeight = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo procesar la imagen en este navegador.')
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  let bestBlob = null
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality)
    bestBlob = blob
    if (blob.size <= POST_TARGET_BYTES) {
      break
    }
  }

  if (!bestBlob || bestBlob.size > POST_MAX_FINAL_BYTES) {
    throw new Error('La imagen es demasiado grande incluso tras comprimirla.')
  }

  return new File([bestBlob], 'post.webp', { type: 'image/webp' })
}
