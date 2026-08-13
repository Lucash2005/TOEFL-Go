import { useEffect, useState } from 'react'
import { loadJSON, saveJSON, TOEFL_PREFIX } from '../utils/storage'

export function useLocalStorage(key, initialValue, prefix = TOEFL_PREFIX) {
  const [value, setValue] = useState(() => loadJSON(key, initialValue, prefix))

  useEffect(() => {
    saveJSON(key, value, prefix)
  }, [key, value, prefix])

  return [value, setValue]
}
