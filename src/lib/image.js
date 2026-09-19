// A phone photo of a packet is 4-8 MB. In a shop, on patchy mobile data, that is
// the difference between an answer and a spinner. Downscale before it leaves.

const MAX_EDGE = 1600
const QUALITY = 0.85

export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file was not an image.'))
    img.src = dataUrl
  })
}

/**
 * Returns { dataUrl, base64, mimeType } — small enough to send, big enough that
 * 6pt ingredient print survives.
 */
export async function prepareImage(file) {
  const original = await readFile(file)
  const img = await loadImage(original)

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  if (scale === 1 && file.size < 1_500_000) {
    return {
      dataUrl: original,
      base64: original.split(',')[1],
      mimeType: file.type || 'image/jpeg',
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
  return { dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' }
}
