class LRUCache {
  constructor(maxSize = 50, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.ttlMs = ttlMs
    this.cache = new Map()
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return null
    }
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  has(key) {
    return this.get(key) !== null
  }

  delete(key) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }

  entries() {
    const result = []
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp <= this.ttlMs) {
        result.push({ key, value: entry.value, age: now - entry.timestamp })
      }
    }
    return result
  }
}

class CacheManager {
  constructor() {
    this.searchResultCache = new LRUCache(50, 5 * 60 * 1000)
    this.docMetaCache = new LRUCache(100, 10 * 60 * 1000)
    this.keywordDictCache = null
    this.stateVersion = this._loadVersion()
  }

  _loadVersion() {
    const v = localStorage.getItem('rskq_state_version')
    return v ? parseInt(v) : 0
  }

  incrementStateVersion() {
    this.stateVersion++
    localStorage.setItem('rskq_state_version', String(this.stateVersion))
    this.searchResultCache.clear()
    return this.stateVersion
  }

  getStateVersion() {
    return this.stateVersion
  }

  _makeSearchKey(keyword, lngMin, latMin, lngMax, latMax) {
    return `${keyword}|${lngMin.toFixed(6)},${latMin.toFixed(6)},${lngMax.toFixed(6)},${latMax.toFixed(6)}`
  }

  getSearchResult(keyword, lngMin, latMin, lngMax, latMax) {
    return this.searchResultCache.get(this._makeSearchKey(keyword, lngMin, latMin, lngMax, latMax))
  }

  setSearchResult(keyword, lngMin, latMin, lngMax, latMax, result) {
    this.searchResultCache.set(this._makeSearchKey(keyword, lngMin, latMin, lngMax, latMax), result)
  }

  getDocMetaList() {
    return this.docMetaCache.get('__doc_meta_list__')
  }

  setDocMetaList(list) {
    this.docMetaCache.set('__doc_meta_list__', list)
  }

  invalidateDocMeta() {
    this.docMetaCache.delete('__doc_meta_list__')
  }

  getKeywordDict() {
    if (this.keywordDictCache) return this.keywordDictCache
    const raw = localStorage.getItem('rskq_keyword_dict')
    if (raw) {
      try {
        this.keywordDictCache = JSON.parse(raw)
      } catch {
        this.keywordDictCache = {}
      }
    } else {
      this.keywordDictCache = {}
    }
    return this.keywordDictCache
  }

  addKeywordsToDict(keywords, source = 'upload') {
    const dict = this.getKeywordDict()
    for (const kw of keywords) {
      const lower = kw.toLowerCase().trim()
      if (!lower) continue
      if (!dict[lower]) {
        dict[lower] = { count: 0, sources: [], lastUsed: 0 }
      }
      dict[lower].count++
      dict[lower].lastUsed = Date.now()
      if (!dict[lower].sources.includes(source)) {
        dict[lower].sources.push(source)
      }
    }
    localStorage.setItem('rskq_keyword_dict', JSON.stringify(dict))
    this.keywordDictCache = dict
  }

  recordSearchKeyword(keyword) {
    const dict = this.getKeywordDict()
    const lower = keyword.toLowerCase().trim()
    if (!lower) return
    if (!dict[lower]) {
      dict[lower] = { count: 0, sources: [], lastUsed: 0 }
    }
    dict[lower].count++
    dict[lower].lastUsed = Date.now()
    if (!dict[lower].sources.includes('search')) {
      dict[lower].sources.push('search')
    }
    localStorage.setItem('rskq_keyword_dict', JSON.stringify(dict))
    this.keywordDictCache = dict
    this._pushSearchHistory(lower)
  }

  _pushSearchHistory(keyword) {
    let history = []
    const raw = localStorage.getItem('rskq_search_history')
    if (raw) {
      try { history = JSON.parse(raw) } catch { history = [] }
    }
    history = history.filter(k => k !== keyword)
    history.unshift(keyword)
    if (history.length > 20) history = history.slice(0, 20)
    localStorage.setItem('rskq_search_history', JSON.stringify(history))
  }

  getSearchHistory() {
    const raw = localStorage.getItem('rskq_search_history')
    if (raw) {
      try { return JSON.parse(raw) } catch { return [] }
    }
    return []
  }

  clearSearchHistory() {
    localStorage.removeItem('rskq_search_history')
  }

  saveDocCoord(fileId, lng, lat) {
    let coords = {}
    const raw = localStorage.getItem('rskq_doc_coords')
    if (raw) {
      try { coords = JSON.parse(raw) } catch { coords = {} }
    }
    coords[fileId] = { lng, lat, timestamp: Date.now() }
    localStorage.setItem('rskq_doc_coords', JSON.stringify(coords))
  }

  getDocCoord(fileId) {
    const raw = localStorage.getItem('rskq_doc_coords')
    if (raw) {
      try {
        const coords = JSON.parse(raw)
        return coords[fileId] || null
      } catch { return null }
    }
    return null
  }

  getAllDocCoords() {
    const raw = localStorage.getItem('rskq_doc_coords')
    if (raw) {
      try { return JSON.parse(raw) } catch { return {} }
    }
    return {}
  }

  removeDocCoord(fileId) {
    const raw = localStorage.getItem('rskq_doc_coords')
    if (raw) {
      try {
        const coords = JSON.parse(raw)
        delete coords[fileId]
        localStorage.setItem('rskq_doc_coords', JSON.stringify(coords))
      } catch { /* pass */ }
    }
  }

  clearAll() {
    this.searchResultCache.clear()
    this.docMetaCache.clear()
    this.keywordDictCache = null
    localStorage.removeItem('rskq_keyword_dict')
    localStorage.removeItem('rskq_search_history')
    localStorage.removeItem('rskq_doc_coords')
  }

  getStats() {
    const dict = this.getKeywordDict()
    return {
      searchCacheSize: this.searchResultCache.size(),
      docMetaCacheSize: this.docMetaCache.size(),
      keywordDictSize: Object.keys(dict).length,
      searchHistorySize: this.getSearchHistory().length,
      stateVersion: this.stateVersion
    }
  }
}

const cacheManager = new CacheManager()

export { cacheManager, LRUCache, CacheManager }
