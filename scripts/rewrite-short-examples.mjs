#!/usr/bin/env node
/**
 * Stamp each card with a study theme and shorten its existing unique example
 * so it stays memorable (about 6–9 English words).
 */
import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { themeForCard } from '../src/data/themes.js'
import { vocabulary } from '../src/data/vocabulary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function wordTokens(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function wordCount(text) {
  return wordTokens(text).length
}

function lemmaOf(token) {
  return String(token || '')
    .toLowerCase()
    .replace(/[^a-z']/g, '')
}

function matchesWord(token, word) {
  const raw = String(token || '')
  const parts = raw.split(/[-/]/)
  if (parts.length > 1 && parts.some((part) => matchesWord(part, word))) return true
  const t = lemmaOf(raw)
  const w = String(word || '').toLowerCase()
  if (!t || !w) return false
  if (t === w) return true
  if (t === `${w}s` || t === `${w}es` || t === `${w}ed` || t === `${w}d` || t === `${w}ing`) return true
  if (w.endsWith('y') && t === `${w.slice(0, -1)}ies`) return true
  if (w.endsWith('e') && (t === `${w}d` || t === `${w.slice(0, -1)}ing`)) return true
  if (w.endsWith('e') && t === `${w.slice(0, -1)}ed`) return true
  if (w.length >= 4 && t.startsWith(w) && t.length - w.length <= 4) return true
  return false
}

function hasWord(text, word) {
  return wordTokens(text).some((token) => matchesWord(token, word))
}

function capitalize(text) {
  const s = String(text || '').trim()
  if (!s) return s
  return s.replace(/^[a-z]/, (ch) => ch.toUpperCase())
}

function tidyEnglish(text) {
  let s = String(text || '').replace(/\s+/g, ' ').trim()
  s = s.replace(/^(when|if|because|after|before|that|which|who|how|while|although)\s+/i, '')
  s = s.replace(/\b(they|we|i|you|she|he)\s+(can|will|could|would|may|must)\.?$/i, '')
  s = s.replace(/\s+(from|of|on|to|for|with|about|that|than|just|or|and|not|a|an|the|in|at|as)\.?$/i, '')
  s = s.replace(/\s+(from|of|on|to|for|with|about|that|than|just|or|and|not|a|an|the|in|at|as)\.?$/i, '')
  return s.trim()
}

function finishEn(text) {
  let s = capitalize(tidyEnglish(text).replace(/\s+/g, ' ').trim())
  s = s.replace(/^[,;:\s]+/, '').replace(/[,;:\s]+$/, '')
  if (!/[.?!]$/.test(s)) s += '.'
  if (/^(Could|Can|Does|Do|Is|Are|Was|Were|Have|Has|Would|Should|May|Will)\b/.test(s) && !/[?]$/.test(s)) {
    s = s.replace(/[.]$/, '?')
  }
  return s
}

function finishZh(text) {
  let s = String(text || '').replace(/\s+/g, '').trim()
  s = s.replace(/^[，,；;：:\s]+/, '').replace(/[，,；;：:\s]+$/, '')
  if (!/[。？！]$/.test(s)) s += '。'
  return s
}

function windowAroundWord(example, word, radiusLeft = 3, radiusRight = 4) {
  const tokens = wordTokens(example.replace(/[—–]/g, ' '))
  const idx = tokens.findIndex((t) => matchesWord(t, word))
  if (idx < 0) return null
  const start = Math.max(0, idx - radiusLeft)
  const end = Math.min(tokens.length, idx + radiusRight + 1)
  return finishEn(tokens.slice(start, end).join(' ').replace(/^[^A-Za-z]+/, ''))
}

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'to', 'of', 'in', 'on', 'at', 'for',
  'from', 'with', 'as', 'by', 'into', 'than', 'that', 'this', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
  'i', 'you', 'we', 'they', 'he', 'she', 'it', 'my', 'your', 'our', 'their',
])

function cleanToken(token) {
  return String(token || '').replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '')
}

function svoFromOriginal(example, word) {
  const tokens = wordTokens(String(example || '').replace(/[—–]/g, ' '))
  const idx = tokens.findIndex((t) => matchesWord(t, word))
  if (idx < 0) return null
  const left = []
  for (let i = idx - 1; i >= 0 && left.length < 3; i -= 1) {
    const raw = cleanToken(tokens[i])
    if (!raw) continue
    left.unshift(raw)
    if (STOP.has(raw.toLowerCase()) && left.length >= 2) break
  }
  const right = []
  for (let i = idx + 1; i < tokens.length && right.length < 4; i += 1) {
    const raw = cleanToken(tokens[i])
    if (!raw) break
    right.push(raw)
    if (right.length >= 2 && /^(and|but|so|because|when|if)$/i.test(raw)) break
  }
  const wordForm = cleanToken(tokens[idx]) || word
  const built = [...left, wordForm, ...right].join(' ')
  if (!hasWord(built, word)) return null
  const n = wordCount(built)
  if (n < 4 || n > 9) return null
  if (/^(when|if|because|after|before|that|which|who)\b/i.test(built)) return null
  return finishEn(built)
}

function shortenEnglish(example, word) {
  let s = String(example || '')
    .replace(/\s+/g, ' ')
    .replace(/^Now,\s*/i, '')
    .replace(/^I want you to notice how\s*/i, '')
    .replace(/^Please notice\s*/i, '')
    .replace(/^Please note\s*/i, '')
    .trim()

  if (wordCount(s) <= 9 && hasWord(s, word)) return finishEn(s)

  const svo = svoFromOriginal(s, word)
  if (svo) return svo

  const clauses = s
    .split(/\s*(?:,|;|:|—|–)\s*/)
    .map((part) => part.trim())
    .filter((part) => part && hasWord(part, word))
    .sort((a, b) => wordCount(a) - wordCount(b))

  for (const clause of clauses) {
    if (
      wordCount(clause) >= 5 &&
      wordCount(clause) <= 9 &&
      !/^(when|if|because|after|before|that|which)\b/i.test(clause)
    ) {
      return finishEn(clause)
    }
  }

  const win = windowAroundWord(s, word, 2, 4)
  if (win && hasWord(win, word) && wordCount(win) <= 9) return win
  return finishEn(s)
}

function shortenChinese(text) {
  let s = String(text || '').replace(/\s+/g, '').trim().replace(/[。？！]+$/g, '')
  s = s.replace(/[時後的]$/g, '')
  if ([...s].length <= 14) return finishZh(s)
  const parts = s.split(/[，,；;：:]/).map((p) => p.trim()).filter(Boolean)
  const first = (parts[0] || s).replace(/[。？！]+$/g, '').replace(/[時後的]$/g, '')
  if ([...first].length <= 16) return finishZh(first)
  return finishZh([...first].slice(0, 14).join(''))
}

const MANUAL = {
  although: ['Although the lecture ran long, we stayed.', '雖然講座變長，我們仍留下。'],
  while: ['Read while you wait here.', '等待時先讀。'],
  area: ['This urban area stays warmer.', '這個市區比較暖。'],
  assess: ['Scientists assess risk carefully.', '科學家仔細評估風險。'],
  finance: ['I might intern in finance.', '我可能去金融實習。'],
  consequent: ['Flooding was a consequent problem.', '淹水是隨之而來的問題。'],
  credit: ['Bring a credit card tonight.', '今晚帶信用卡。'],
  culture: ['Food is part of culture here.', '美食在這裡是文化的一部分。'],
  interact: ['Bees and flowers interact closely.', '蜜蜂與花密切互動。'],
  physical: ['Try short physical activity after lunch.', '午餐後做點身體活動。'],
  sex: ['Report each sex group separately.', '各性別組別分開報告。'],
  hence: ['The lab was closed, hence we waited.', '實驗室關了，所以我們等。'],
  impose: ['The new rule may impose a fine.', '新規定可能罰款。'],
  occupy: ['Students occupy the square until noon.', '學生占據廣場到中午。'],
  aware: ['I was not aware of the ban.', '我不知道有這項禁止。'],
  logic: ['This logic puzzle is easier on paper.', '這道邏輯題寫下來比較容易。'],
  motive: ['What was my motive for astronomy?', '我學天文的動機是什麼？'],
  nevertheless: ['The path was icy; nevertheless, go slow.', '路很滑；仍然要慢走。'],
  transform: ['Pressure can transform mud into stone.', '壓力能把泥變成石頭。'],
  adult: ['This film is for adult audiences.', '這部片給成人看。'],
  guarantee: ['This ticket cannot guarantee a seat.', '這張票不保證有位子。'],
  priority: ['Sleep is a higher priority tonight.', '今晚睡眠比較優先。'],
  publication: ['Was that her first publication?', '那是她第一篇出版嗎？'],
  sole: ['She was the sole volunteer.', '她是唯一的志工。'],
  automatically: ['Lights turn off automatically.', '燈會自動關掉。'],
  implicit: ['There was an implicit warning.', '那是隱含的警告。'],
  random: ['We were assigned to random groups.', '我們被分到隨機組。'],
  widespread: ['The app is in widespread use.', '這個應用用得很廣。'],
  erode: ['Rain and wind erode that cliff.', '風雨侵蝕那座崖。'],
  invoke: ['The mayor can invoke emergency powers.', '市長能啟動緊急權。'],
  nonetheless: ['The path was icy; nonetheless, we walked.', '路很滑；我們仍走完。'],
  instead: ['Write by hand instead of typing.', '用手寫，不要打字。'],
  enough: ['Two examples are not enough.', '兩個例子還不夠。'],
  textbook: ['Buy a used textbook after class.', '下課後買二手教科書。'],
  transportation: ['Is public transportation cheaper here?', '這裡的大眾運輸比較便宜嗎？'],
  exercise: ['Twenty minutes of exercise helps.', '運動二十分鐘有幫助。'],
  invention: ['That invention changed the lab.', '那項發明改變了實驗室。'],
  bone: ['He cracked a bone in the wrist.', '他手腕的骨頭裂了。'],
  cause: ['Ice was the cause of the crash.', '結冰是事故原因。'],
  precision: ['This scale offers more precision.', '這台秤更精準。'],
  exception: ['Seniors are an exception today.', '今天高年級是例外。'],
  benchmark: ['This test is the benchmark.', '這次測驗是基準。'],
  assume: ['Do not assume the lecture is recorded.', '別以為講座有錄音。'],
  factor: ['Cost is only one factor here.', '費用只是因素之一。'],
  identify: ['Rangers identify those birds quickly.', '巡守員很快辨認那些鳥。'],
  income: ['This job can raise household income.', '這份工作能提高家戶收入。'],
  legal: ['Copying the book is not legal.', '影印整本書不合法。'],
  major: ['Traffic is a major reason to leave.', '交通是搬走的主因。'],
  process: ['Name the process plants use.', '說出植物用的過程。'],
  aspect: ['Cost is one aspect of housing.', '成本是住房的一面。'],
  conclude: ['Can we conclude seedlings need darkness?', '能斷定幼苗需要黑暗嗎？'],
  element: ['Carbon is an element in all life.', '碳是所有生物都有的元素。'],
  normal: ['This heart rate is considered normal.', '這個心率算正常。'],
  deduce: ['Can we deduce that it rained?', '能推論下過雨嗎？'],
  locate: ['Locate the nearest emergency exit.', '找到最近的緊急出口。'],
  minor: ['Spelling is a minor issue now.', '拼寫現在只是小事。'],
  philosophy: ['Is philosophy of science required?', '科學哲學是必修嗎？'],
  attribute: ['Honesty is the attribute they mention.', '他們提到的特質是誠實。'],
  contrast: ['Contrast the two theories in one paragraph.', '在同一段對比兩種理論。'],
  dimension: ['Height is one dimension of the sculpture.', '高度是雕塑的一個面向。'],
  compound: ['Water is a compound of hydrogen.', '水是氫的化合物。'],
  equivalent: ['Is one kilometer equivalent to 0.62 miles?', '一公里等於 0.62 英里嗎？'],
  expose: ['Do not expose the undeveloped film.', '未顯影底片不要曝光。'],
  fundamental: ['Clean water is a fundamental need.', '乾淨的水是基本需求。'],
  medical: ['She is applying to medical school.', '她在申請醫學院。'],
  abstract: ['Keep the abstract idea in one line.', '抽象想法寫成一行。'],
  bond: ['Group work can strengthen the bond.', '小組能加強連結。'],
  capable: ['Is she capable of running the lab?', '她能主持實驗室嗎？'],
  discriminate: ['Listeners can discriminate those two vowels.', '聽者能分辨那兩個母音。'],
  presume: ['Do not presume the elevator works.', '別假定電梯能用。'],
  trace: ['Can we trace the fox by tracks?', '能靠足跡追蹤狐狸嗎？'],
  classic: ['That film is now a classic.', '那部片現在是經典。'],
  differentiate: ['Can you differentiate moths from butterflies?', '你分得出蛾和蝶嗎？'],
  foundation: ['Trust is the foundation of sharing data.', '信任是分享資料的基礎。'],
  insert: ['Insert a page break here.', '這裡插入分頁。'],
  ambiguous: ['The prompt is deliberately ambiguous.', '題幹故意含糊。'],
  contemporary: ['Is the contemporary wing open today?', '當代館今天有開嗎？'],
  manipulate: ['Ads manipulate what we notice first.', '廣告操縱我們先注意到什麼。'],
  offset: ['Tree planting can offset the carbon.', '種樹能抵銷碳排。'],
  theme: ['What is the theme of this unit?', '這一單元的主題是什麼？'],
  compatible: ['This app is not compatible.', '這個應用不相容。'],
  conceive: ['Could anyone conceive of paperless exams?', '有人想過無紙考試嗎？'],
  however: ['The method is slow; however, it works.', '方法慢；不過有效。'],
  moreover: ['The room is cold; moreover, the lamp died.', '房間冷；而且燈壞了。'],
  planet: ['Which planet does the club photograph?', '社團拍哪一顆行星？'],
  advantage: ['A front seat is an advantage.', '前排座位是優勢。'],
  example: ['The giraffe is an example of adaptation.', '長頸鹿是適應的例子。'],
  conclusion: ['Do not add a new claim in the conclusion.', '結論不要加新主張。'],
  conversation: ['This is a conversation between students.', '這是學生之間的對話。'],
  variable: ['Temperature is the variable we change.', '溫度是我們改變的變項。'],
  limitation: ['Time is a limitation of speaking.', '時間是口說的限制。'],
  strength: ['Clarity is a strength of her essay.', '清楚是她作文的優點。'],
  objectivity: ['Rubrics increase the objectivity of grades.', '評分表提高分數客觀性。'],
  tendency: ['There is a tendency to sit here.', '大家有坐這裡的傾向。'],
  quotation: ['Keep a quotation under one sentence.', '引文保持一句以內。'],
  synthesis: ['A synthesis shows how sources meet.', '綜合要寫出資料如何會合。'],
  seminar: ['Is Friday’s seminar required?', '星期五研討課必修嗎？'],
}

const next = vocabulary.map((card) => {
  const theme = themeForCard(card)
  const manual = MANUAL[card.word]
  return {
    ...card,
    example: manual ? manual[0] : shortenEnglish(card.example, card.word),
    exampleMeaning: manual ? manual[1] : shortenChinese(card.exampleMeaning),
    theme: theme.id,
    category: theme.label,
  }
})

const seen = new Map()
const problems = []
for (const card of next) {
  if (!hasWord(card.example, card.word)) problems.push(`missing ${card.word}: ${card.example}`)
  const n = wordCount(card.example)
  if (n > 11) problems.push(`long ${card.word} ${n}: ${card.example}`)
  if (n < 3) problems.push(`tiny ${card.word} ${n}: ${card.example}`)
  const key = card.example.toLowerCase()
  if (seen.has(key)) problems.push(`dup ${seen.get(key)} / ${card.word}: ${card.example}`)
  else seen.set(key, card.word)
}

function q(value) {
  return JSON.stringify(value)
}

const lines = [
  '/** @typedef {{ id: string, word: string, phonetic?: string, meaning: string, example: string, exampleMeaning: string, category: string, register?: string, theme?: string }} VocabCard */',
  '',
  '/** @type {VocabCard[]} */',
  'export const vocabulary = [',
]
for (const card of next) {
  lines.push('  {')
  lines.push(`    id: ${q(card.id)},`)
  lines.push(`    word: ${q(card.word)},`)
  if (card.phonetic) lines.push(`    phonetic: ${q(card.phonetic)},`)
  lines.push(`    meaning: ${q(card.meaning)},`)
  lines.push(`    example: ${q(card.example)},`)
  lines.push(`    exampleMeaning: ${q(card.exampleMeaning)},`)
  lines.push(`    register: ${q(card.register || 'lecture')},`)
  lines.push(`    category: ${q(card.category)},`)
  lines.push(`    theme: ${q(card.theme)},`)
  lines.push('  },')
}
lines.push(']')
lines.push('')
writeFileSync(join(__dirname, '../src/data/vocabulary.js'), lines.join('\n'))

const lens = next.map((c) => wordCount(c.example)).sort((a, b) => a - b)
const zh = next.map((c) => [...c.exampleMeaning].length).sort((a, b) => a - b)
const pct = (a, p) => a[Math.floor((a.length - 1) * p)]
const starts = {}
for (const card of next) {
  const open = wordTokens(card.example).slice(0, 2).join(' ')
  starts[open] = (starts[open] || 0) + 1
}
console.log('wrote', next.length)
console.log('en', { min: lens[0], med: pct(lens, 0.5), p75: pct(lens, 0.75), max: lens[lens.length - 1] })
console.log('zh', { min: zh[0], med: pct(zh, 0.5), p75: pct(zh, 0.75), max: zh[zh.length - 1] })
console.log('top openings', Object.entries(starts).sort((a, b) => b[1] - a[1]).slice(0, 8))
console.log('problems', problems.length)
if (problems.length) console.log(problems.slice(0, 30).join('\n'))
