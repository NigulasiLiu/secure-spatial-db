const HILBERT_ORDER = 12
const GRID_SIZE = 1 << HILBERT_ORDER

export function getGridSize() {
  return GRID_SIZE
}

export function getOrder() {
  return HILBERT_ORDER
}

export function xyToHilbert(x, y, order = HILBERT_ORDER) {
  let d = 0
  let rx, ry
  let s = 1 << (order - 1)
  while (s > 0) {
    rx = (x & s) > 0 ? 1 : 0
    ry = (y & s) > 0 ? 1 : 0
    d += s * s * ((3 * rx) ^ ry)
    if (ry === 0) {
      if (rx === 1) {
        x = (1 << order) - 1 - x
        y = (1 << order) - 1 - y
      }
      const tmp = x
      x = y
      y = tmp
    }
    s = s >> 1
  }
  return d
}

export function hilbertToXY(d, order = HILBERT_ORDER) {
  let x = 0, y = 0
  let rx, ry
  let s = 1
  while (s < (1 << order)) {
    rx = 1 & (d >> 1)
    ry = 1 & (d ^ rx)
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x
        y = s - 1 - y
      }
      const tmp = x
      x = y
      y = tmp
    }
    x += s * rx
    y += s * ry
    d = d >> 2
    s = s << 1
  }
  return { x, y }
}

export function geoToGrid(lng, lat, order = HILBERT_ORDER) {
  const gridSize = 1 << order
  const gx = Math.floor((lng + 180) / 360 * gridSize)
  const gy = Math.floor((lat + 90) / 180 * gridSize)
  return {
    gx: Math.max(0, Math.min(gridSize - 1, gx)),
    gy: Math.max(0, Math.min(gridSize - 1, gy))
  }
}

export function gridToGeo(gx, gy, order = HILBERT_ORDER) {
  const gridSize = 1 << order
  const lng = (gx / gridSize) * 360 - 180
  const lat = (gy / gridSize) * 180 - 90
  return { lng, lat }
}

export function geoToHilbert(lng, lat) {
  const { gx, gy } = geoToGrid(lng, lat)
  return xyToHilbert(gx, gy)
}

export function preCode(hilbertIndex, order = HILBERT_ORDER) {
  const prefixes = []
  const bitLen = order * 2
  for (let i = 1; i <= bitLen; i++) {
    const prefix = hilbertIndex >> (bitLen - i)
    prefixes.push({ prefix, length: i })
  }
  return prefixes
}

export function binaryPrefixCover(hiStart, hiEnd, order = HILBERT_ORDER) {
  const result = []
  const bitLen = order * 2
  _bpcRecursive(hiStart, hiEnd, 0, 0, bitLen, result)
  return result
}

function _bpcRecursive(start, end, prefix, depth, maxDepth, result) {
  if (depth === maxDepth) {
    result.push({ prefix, length: depth })
    return
  }
  const half = 1 << (maxDepth - depth - 1)
  const lowerStart = start - prefix * (1 << (maxDepth - depth))
  const lowerEnd = end - prefix * (1 << (maxDepth - depth))

  if (lowerStart === 0 && lowerEnd === (1 << (maxDepth - depth)) - 1) {
    result.push({ prefix, length: depth })
    return
  }

  const leftStart = lowerStart < half ? lowerStart : -1
  const leftEnd = lowerEnd < half ? lowerEnd : half - 1
  if (leftStart >= 0) {
    _bpcRecursive(start, Math.min(end, (prefix * 2 + 0) * half + half - 1), prefix * 2, depth + 1, maxDepth, result)
  }

  const rightStart = lowerStart >= half ? lowerStart - half : 0
  const rightEnd = lowerEnd >= half ? lowerEnd - half : -1
  if (rightEnd >= 0) {
    _bpcRecursive(Math.max(start, (prefix * 2 + 1) * half), end, prefix * 2 + 1, depth + 1, maxDepth, result)
  }
}

export function spatialRangeToPrefixes(lngMin, latMin, lngMax, latMax) {
  const { gx: gxMin, gy: gyMin } = geoToGrid(lngMin, latMin)
  const { gx: gxMax, gy: gyMax } = geoToGrid(lngMax, latMax)

  // 1. Enumerate all grid cells in the rectangle and compute Hilbert indices
  const allHilberts = []
  for (let gx = gxMin; gx <= gxMax; gx++) {
    for (let gy = gyMin; gy <= gyMax; gy++) {
      allHilberts.push(xyToHilbert(gx, gy))
    }
  }

  // 2. Sort and merge into continuous intervals
  allHilberts.sort((a, b) => a - b)
  const ranges = []
  let start = allHilberts[0]
  let end = start
  for (let i = 1; i < allHilberts.length; i++) {
    if (allHilberts[i] === end + 1) {
      end = allHilberts[i]
    } else {
      ranges.push([start, end])
      start = end = allHilberts[i]
    }
  }
  ranges.push([start, end])

  // 3. Apply BPC to each interval
  const allPrefixes = []
  for (const [rStart, rEnd] of ranges) {
    allPrefixes.push(...binaryPrefixCover(rStart, rEnd))
  }
  return allPrefixes
}

export function prefixToString(prefix, length) {
  let bits = ''
  for (let i = length - 1; i >= 0; i--) {
    bits += ((prefix >> i) & 1).toString()
  }
  return bits
}
