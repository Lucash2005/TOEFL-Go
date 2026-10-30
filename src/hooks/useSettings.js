import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

/** Bump when loop defaults change so existing devices pick up the new mix once. */
const LOOP_AUDIO_VERSION = 2

const DEFAULT_SETTINGS = {
  showPhonetic: true,
  showExampleMeaning: true,
  ttsRate: 0.95,
  loopPlayWord: true,
  loopPlayExample: true,
  loopPlayMeaning: true,
  loopPlayExampleMeaning: true,
  loopAudioVersion: LOOP_AUDIO_VERSION,
}

function migrateSettings(raw) {
  const prev = raw && typeof raw === 'object' ? raw : {}
  const version = Number(prev.loopAudioVersion) || 0
  const next = { ...DEFAULT_SETTINGS, ...prev, loopAudioVersion: LOOP_AUDIO_VERSION }
  if (version < LOOP_AUDIO_VERSION) {
    next.loopPlayMeaning = true
    next.loopPlayExampleMeaning = true
  }
  return next
}

export function useSettings() {
  const [settings, setSettings] = useLocalStorage('ui-settings', DEFAULT_SETTINGS)

  useEffect(() => {
    if ((Number(settings?.loopAudioVersion) || 0) >= LOOP_AUDIO_VERSION) return
    setSettings(migrateSettings(settings))
  }, [settings, setSettings])

  const migrated = migrateSettings(settings)

  function updateSetting(key, value) {
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      ...migrateSettings(prev),
      [key]: value,
      loopAudioVersion: LOOP_AUDIO_VERSION,
    }))
  }

  return {
    settings: migrated,
    showPhonetic: migrated.showPhonetic !== false,
    showExampleMeaning: migrated.showExampleMeaning !== false,
    ttsRate: typeof migrated.ttsRate === 'number' ? migrated.ttsRate : 0.95,
    loopPlayWord: migrated.loopPlayWord !== false,
    loopPlayExample: migrated.loopPlayExample !== false,
    loopPlayMeaning: migrated.loopPlayMeaning !== false,
    loopPlayExampleMeaning: migrated.loopPlayExampleMeaning !== false,
    setShowPhonetic: (v) => updateSetting('showPhonetic', v),
    setShowExampleMeaning: (v) => updateSetting('showExampleMeaning', v),
    setTtsRate: (v) => updateSetting('ttsRate', v),
    setLoopPlayWord: (v) => updateSetting('loopPlayWord', v),
    setLoopPlayExample: (v) => updateSetting('loopPlayExample', v),
    setLoopPlayMeaning: (v) => updateSetting('loopPlayMeaning', v),
    setLoopPlayExampleMeaning: (v) => updateSetting('loopPlayExampleMeaning', v),
  }
}
