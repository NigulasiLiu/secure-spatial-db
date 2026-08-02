const STOP_WORDS_CN = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没', '看', '好', '自己', '这', '那', '它', '他', '她', '们', '把', '被', '让', '给', '从', '向',
  '为', '以', '及', '或', '但', '而', '与', '则', '若', '如', '因', '所', '其', '此', '些', '什么', '怎么', '哪里',
  '可以', '可能', '应该', '需要', '必须', '已经', '正在', '将要', '关于', '对于', '根据', '按照', '通过', '使用',
  '进行', '得到', '发生', '存在', '包括', '包含', '属于', '具有', '没有', '不是', '不会', '不能', '不要', '不用',
  '这个', '那个', '这些', '那些', '这里', '那里', '哪个', '哪些', '哪里', '怎样', '如何', '为何', '何地', '何时'
])

const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was',
  'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'not', 'no', 'yes', 'if', 'then', 'else',
  'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'about', 'into', 'over', 'under', 'after', 'before',
  'between', 'during', 'through', 'while', 'because', 'since', 'until', 'though', 'although', 'unless', 'than', 'so'
])

const ENTITY_PATTERNS = [
  /[\u4e00-\u9fa5]{2,}(市|省|区|县|镇|村|路|街|号|大厦|广场|中心|公园|大学|学院|医院|银行|机场|车站)/g,
  /[A-Z][a-z]+(?:[A-Z][a-z]+)+/g,
  /\b\d{4,}\b/g,
  /[\u4e00-\u9fa5]{2,4}(公司|集团|科技|技术|有限|股份)/g,
  /[A-Z]{2,}/g
]

const HOT_KEYWORDS = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆',
  '中关村', '朝阳区', '海淀区', '浦东', '南山', '坐标', '定位', '搜索', '检索', '加密'
]

function isStopWord(word) {
  const lower = word.toLowerCase()
  return STOP_WORDS_CN.has(word) || STOP_WORDS_EN.has(lower)
}

function tokenize(text) {
  const tokens = []
  const cnChunks = text.match(/[\u4e00-\u9fa5]+/g) || []
  for (const chunk of cnChunks) {
    for (let len = 2; len <= 4; len++) {
      for (let i = 0; i <= chunk.length - len; i++) {
        tokens.push(chunk.substring(i, i + len))
      }
    }
  }
  const enWords = text.match(/[a-zA-Z]{2,}/g) || []
  for (const w of enWords) {
    tokens.push(w)
  }
  return tokens
}

function computeTF(tokens) {
  const tf = new Map()
  const total = tokens.length || 1
  for (const token of tokens) {
    if (isStopWord(token)) continue
    tf.set(token, (tf.get(token) || 0) + 1)
  }
  for (const [key, val] of tf) {
    tf.set(key, val / total)
  }
  return tf
}

function computeTFIDF(tf, docCount = 10) {
  const tfidf = new Map()
  for (const [word, freq] of tf) {
    const df = Math.max(1, Math.ceil(freq * docCount))
    const idf = Math.log(docCount / df) + 1
    tfidf.set(word, freq * idf)
  }
  return tfidf
}

function extractEntities(text) {
  const entities = new Set()
  for (const pattern of ENTITY_PATTERNS) {
    const matches = text.match(pattern) || []
    for (const m of matches) {
      if (!isStopWord(m)) entities.add(m)
    }
  }
  return entities
}

function extractKeywordsFromText(text, maxCount = 15) {
  if (!text || text.trim().length === 0) return { highFreq: [], important: [], entities: [], hot: [] }

  const tokens = tokenize(text)
  if (tokens.length === 0) return { highFreq: [], important: [], entities: [], hot: [] }

  const tf = computeTF(tokens)
  const tfidf = computeTFIDF(tf, Math.max(10, tokens.length))

  const sortedByTF = [...tf.entries()].sort((a, b) => b[1] - a[1])
  const highFreq = sortedByTF.slice(0, maxCount).map(([word, freq]) => ({ word, score: freq }))

  const sortedByTFIDF = [...tfidf.entries()].sort((a, b) => b[1] - a[1])
  const important = sortedByTFIDF.slice(0, maxCount).map(([word, score]) => ({ word, score }))

  const entitySet = extractEntities(text)
  const entities = [...entitySet].slice(0, maxCount).map(word => ({ word, score: 1.0 }))

  const textLower = text.toLowerCase()
  const hot = HOT_KEYWORDS.filter(kw => textLower.includes(kw.toLowerCase())).map(word => ({ word, score: 1.0 }))

  const highFreqWords = new Set(highFreq.map(h => h.word))
  const importantWords = new Set(important.map(i => i.word))
  const entityWords = new Set(entities.map(e => e.word))
  const hotWords = new Set(hot.map(h => h.word))

  const filteredImportant = important.filter(i => !highFreqWords.has(i.word))
  const filteredEntities = entities.filter(e => !highFreqWords.has(e.word) && !importantWords.has(e.word))
  const filteredHot = hot.filter(h => !highFreqWords.has(h.word) && !importantWords.has(h.word) && !entityWords.has(h.word))

  return {
    highFreq,
    important: filteredImportant,
    entities: filteredEntities,
    hot: filteredHot
  }
}

async function readFileContent(file) {
  const name = file.name || ''
  const ext = name.split('.').pop().toLowerCase()

  if (['txt', 'csv', 'json', 'md', 'log', 'xml', 'html', 'js', 'java', 'py', 'sql'].includes(ext)) {
    try {
      const text = await file.text()
      return text
    } catch {
      return name
    }
  }

  if (ext === 'docx' || ext === 'doc' || ext === 'pdf' || ext === 'xlsx' || ext === 'xls' || ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'zip' || ext === 'rar') {
    return name.replace(/\.[^.]+$/, '') + ' ' + ext
  }

  try {
    const text = await file.text()
    if (text && text.length > 0) return text
  } catch {
    // pass
  }
  return name
}

async function extractKeywords(file, maxCount = 15) {
  const text = await readFileContent(file)
  const result = extractKeywordsFromText(text, maxCount)
  const allWords = [
    ...result.highFreq.map(h => h.word),
    ...result.important.map(i => i.word),
    ...result.entities.map(e => e.word),
    ...result.hot.map(h => h.word)
  ]
  return { ...result, allWords, fileName: file.name }
}

function getKeywordColor(type) {
  const colors = {
    highFreq: '#FF6A00',
    important: '#1677FF',
    entity: '#00C7C7',
    hot: '#FFCB00'
  }
  return colors[type] || '#8C8C8C'
}

function getKeywordTypeName(type) {
  const names = {
    highFreq: '高频词',
    important: '重要词',
    entity: '实体词',
    hot: '推荐词'
  }
  return names[type] || '其他'
}

export {
  extractKeywords,
  extractKeywordsFromText,
  readFileContent,
  getKeywordColor,
  getKeywordTypeName,
  isStopWord,
  tokenize,
  STOP_WORDS_CN,
  STOP_WORDS_EN,
  HOT_KEYWORDS
}
