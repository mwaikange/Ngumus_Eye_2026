// Simple geohash encoding utility
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

export function encodeGeohash(latitude: number, longitude: number, precision = 7): string {
  let idx = 0
  let bit = 0
  let evenBit = true
  let geohash = ""

  let latMin = -90,
    latMax = 90
  let lonMin = -180,
    lonMax = 180

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2
      if (longitude > lonMid) {
        idx = (idx << 1) + 1
        lonMin = lonMid
      } else {
        idx = idx << 1
        lonMax = lonMid
      }
    } else {
      const latMid = (latMin + latMax) / 2
      if (latitude > latMid) {
        idx = (idx << 1) + 1
        latMin = latMid
      } else {
        idx = idx << 1
        latMax = latMid
      }
    }
    evenBit = !evenBit

    if (++bit === 5) {
      geohash += BASE32[idx]
      bit = 0
      idx = 0
    }
  }

  return geohash
}

export function getGeohashPrefix(geohash: string, length = 6): string {
  return geohash.substring(0, length)
}
