import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface TranslationContextType {
  isTranslationActive: boolean
  targetLanguage: string
  originalLanguage: string
  currentLanguageCode: string
  setTranslationActive: (active: boolean) => void
  setTargetLanguage: (language: string) => void
  translateText: (text: string) => Promise<string>
  restoreOriginal: () => void
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

export const useTranslation = () => {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}

interface TranslationProviderProps {
  children: ReactNode
}

// Language code to display code mapping
const languageDisplayCodes: Record<string, string> = {
  'en': 'EN',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
  'it': 'IT',
  'pt': 'PT',
  'ru': 'RU',
  'ja': 'JP',
  'ko': 'KR',
  'zh': 'CN',
  'ar': 'AR',
  'hi': 'HI',
  'nl': 'NL',
  'sv': 'SE',
  'pl': 'PL'
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [isTranslationActive, setIsTranslationActive] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('es') // Default to Spanish
  const [originalLanguage] = useState('en')
  const [originalTexts] = useState<Map<string, string>>(new Map())

  // Get current language code for display
  const currentLanguageCode = isTranslationActive 
    ? (languageDisplayCodes[targetLanguage] || targetLanguage.toUpperCase())
    : (languageDisplayCodes[originalLanguage] || 'EN')

  const setTranslationActive = (active: boolean) => {
    setIsTranslationActive(active)
    if (!active) {
      // Restore original texts when deactivating
      restoreOriginal()
    }
  }

  const translateText = async (text: string): Promise<string> => {
    if (!isTranslationActive || !text.trim()) {
      return text
    }

    // Store original text
    originalTexts.set(text, text)

    try {
      // Try multiple translation services for better reliability
      const translations = await Promise.allSettled([
        // MyMemory API (free)
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${originalLanguage}|${targetLanguage}`)
          .then(response => response.json())
          .then(data => {
            if (data.responseStatus === 200 && data.responseData) {
              return data.responseData.translatedText
            }
            throw new Error('MyMemory API failed')
          }),
        
        // Fallback: LibreTranslate (if available)
        fetch('https://libretranslate.de/translate', {
          method: 'POST',
          body: JSON.stringify({
            q: text,
            source: originalLanguage,
            target: targetLanguage,
            format: 'text'
          }),
          headers: { 'Content-Type': 'application/json' }
        })
          .then(response => response.json())
          .then(data => {
            if (data.translatedText) {
              return data.translatedText
            }
            throw new Error('LibreTranslate API failed')
          })
      ])

      // Use the first successful translation
      for (const result of translations) {
        if (result.status === 'fulfilled') {
          return result.value
        }
      }
      
      // If all services fail, return original text
      console.warn('All translation services failed for text:', text)
      return text
    } catch (error) {
      console.error('Translation error:', error)
      return text
    }
  }

  const restoreOriginal = () => {
    // This would restore original texts in the UI
    // Implementation depends on how texts are stored and displayed
    originalTexts.clear()
  }

  const contextValue: TranslationContextType = {
    isTranslationActive,
    targetLanguage,
    originalLanguage,
    currentLanguageCode,
    setTranslationActive,
    setTargetLanguage,
    translateText,
    restoreOriginal
  }

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  )
}
