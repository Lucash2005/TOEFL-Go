import { useLocalStorage } from './useLocalStorage'

const DEFAULT_SETTINGS = {
  showPhonetic: true,
  showExampleMeaning: true,
  ttsRate: 0.95,
  loopPlayWord: true,
  loopPlayExample: true,
  loopPlayMeaning: false,
  loopPlayExampleMeaning: false,
}

export function useSettings() {
  const [settings, setSettings] = useLocalStorage('ui-settings', DEFAULT_SETTINGS)

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, [key]: value }))
  }

  const merged = { ...DEFAULT_SETTINGS, ...settings }

  return {
    settings: merged,
    showPhonetic: merged.showPhonetic !== false,
    showExampleMeaning: merged.showExampleMeaning !== false,
    ttsRate: typeof merged.ttsRate === 'number' ? merged.ttsRate : 0.95,
    loopPlayWord: merged.loopPlayWord !== false,
    loopPlayExample: merged.loopPlayExample !== false,
    loopPlayMeaning: merged.loopPlayMeaning === true,
    loopPlayExampleMeaning: merged.loopPlayExampleMeaning === true,
    setShowPhonetic: (v) => updateSetting('showPhonetic', v),
    setShowExampleMeaning: (v) => updateSetting('showExampleMeaning', v),
    setTtsRate: (v) => updateSetting('ttsRate', v),
    setLoopPlayWord: (v) => updateSetting('loopPlayWord', v),
    setLoopPlayExample: (v) => updateSetting('loopPlayExample', v),
    setLoopPlayMeaning: (v) => updateSetting('loopPlayMeaning', v),
    setLoopPlayExampleMeaning: (v) => updateSetting('loopPlayExampleMeaning', v),
  }
}
