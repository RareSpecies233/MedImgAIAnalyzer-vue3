const sharedImageCache = new Map<string, string>()

export async function fetchCachedImage(url: string) {
  const cached = sharedImageCache.get(url)
  if (cached) return cached
  const res = await fetch(url)
  if (!res.ok) throw new Error('无法获取图片资源')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  sharedImageCache.set(url, objectUrl)
  return objectUrl
}

export function clearSharedImageCache() {
  for (const url of sharedImageCache.values()) {
    URL.revokeObjectURL(url)
  }
  sharedImageCache.clear()
}
