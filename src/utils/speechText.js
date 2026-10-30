/** Spoken/shown Chinese should not include register tags like 講座／校園／閱讀. */
const REGISTER_PREFIX = /^(講座|校園|閱讀|聽力講座|校園對話|閱讀篇章|聽力)[：:]\s*/

export function stripSpokenRegister(text) {
  return String(text || '').replace(REGISTER_PREFIX, '').trim()
}
