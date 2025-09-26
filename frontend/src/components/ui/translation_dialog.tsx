import React from 'react'
import './translation_dialog.css'
import { useTranslation } from '../../contexts/TranslationContext'

interface TranslationDialogProps {
  isOpen: boolean
  onClose: () => void
}

const languages = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' }
]

const TranslationDialog: React.FC<TranslationDialogProps> = ({ isOpen, onClose }) => {
  const { 
    isTranslationActive, 
    targetLanguage, 
    setTranslationActive, 
    setTargetLanguage,
    restoreOriginal
  } = useTranslation()

  if (!isOpen) return null

  const handleLanguageSelect = (languageCode: string) => {
    setTargetLanguage(languageCode)
    setTranslationActive(true)
    onClose()
  }

  const handleBackToOriginal = () => {
    setTranslationActive(false)
    restoreOriginal()
    onClose()
  }

  return (
    <div className="translation-dialog-overlay" onClick={onClose}>
      <div className="translation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="translation-dialog__header">
          <h3>Select Translation Language</h3>
          <button 
            className="translation-dialog__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        
        <div className="translation-dialog__content">
          {isTranslationActive && (
            <div className="translation-dialog__current">
              <div className="translation-current-info">
                Currently translating to: <strong>{languages.find(lang => lang.code === targetLanguage)?.name}</strong>
              </div>
              <button 
                className="translation-back-button"
                onClick={handleBackToOriginal}
              >
                Back to Original (English)
              </button>
            </div>
          )}
          
          <div className="translation-dialog__languages">
            {languages.map((language) => (
              <button
                key={language.code}
                className={`translation-language-option ${targetLanguage === language.code ? 'active' : ''}`}
                onClick={() => handleLanguageSelect(language.code)}
              >
                <span className="translation-flag">{language.flag}</span>
                <span className="translation-name">{language.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TranslationDialog
