import React, { useEffect, useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'

interface TranslatableTextProps {
  children: string
  className?: string
  tag?: React.ElementType
}

export const TranslatableText: React.FC<TranslatableTextProps> = ({ 
  children, 
  className, 
  tag: Tag = 'span' 
}) => {
  const { isTranslationActive, translateText, targetLanguage } = useTranslation()
  const [translatedText, setTranslatedText] = useState(children)
  const [isTranslating, setIsTranslating] = useState(false)

  useEffect(() => {
    const handleTranslation = async () => {
      if (isTranslationActive && children && children.trim()) {
        setIsTranslating(true)
        try {
          const translated = await translateText(children)
          setTranslatedText(translated)
        } catch (error) {
          console.error('Translation failed:', error)
          setTranslatedText(children) // Fallback to original
        } finally {
          setIsTranslating(false)
        }
      } else {
        setTranslatedText(children) // Show original text
      }
    }

    handleTranslation()
  }, [isTranslationActive, children, translateText, targetLanguage])

  return (
    <Tag className={className}>
      {isTranslating ? children : translatedText}
    </Tag>
  )
}

export default TranslatableText
