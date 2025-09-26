import { useEffect, useCallback } from 'react'
import { useTranslation } from '../contexts/TranslationContext'

// Hook to automatically translate page content
export const usePageTranslation = () => {
  const { isTranslationActive, translateText, targetLanguage } = useTranslation()

  const restoreOriginalContent = useCallback(() => {
    // Find all elements with original text stored
    const elementsWithOriginalText = document.querySelectorAll('[data-original-text]')
    
    elementsWithOriginalText.forEach(element => {
      const originalText = element.getAttribute('data-original-text')
      if (originalText) {
        element.textContent = originalText
        element.removeAttribute('data-original-text')
      }
    })
  }, [])

  const translatePageContent = useCallback(async () => {
    // Get all text nodes that should be translated
    const textSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'span:not(.no-translate)', 'div:not(.no-translate)', 
      'li', 'td', 'th', 'button:not(.docs-translate-button):not(.docs-lightbulb-button):not(.docs-ai-chat-button)', 
      'a:not(.no-translate)', 'label'
    ]

    const elements = document.querySelectorAll(textSelectors.join(', '))
    
    // Process elements in batches to avoid overwhelming the translation service
    const batchSize = 10
    const elementArray = Array.from(elements)
    
    for (let i = 0; i < elementArray.length; i += batchSize) {
      const batch = elementArray.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (element) => {
        // Skip elements that contain other elements (to avoid duplicating translations)
        if (element.children.length > 0) return
        
        // Skip elements that are likely to contain code or technical content
        if (element.closest('pre, code, .highlight, .code-block, .docs-translate-button-container, .docs-lightbulb-button-container, .docs-ai-chat-button-container')) return
        
        // Skip elements with specific classes that shouldn't be translated
        if (element.classList.contains('no-translate') || 
            element.closest('.no-translate, .docs-translate-button, .docs-lightbulb-button, .docs-ai-chat-button')) return

        const originalText = element.textContent?.trim()
        if (!originalText || originalText.length < 2) return // Skip very short text

        // Skip technical terms, URLs, and code-like content
        if (/^[A-Z_]+$/.test(originalText) || // ALL_CAPS constants
            /^https?:\/\//.test(originalText) || // URLs
            /^[a-zA-Z0-9_\-.]+\.[a-zA-Z]{2,}$/.test(originalText) || // Domain names
            /^\d+(\.\d+)*$/.test(originalText) || // Version numbers
            originalText.includes('()') || // Function calls
            originalText.startsWith('.') || originalText.startsWith('#')) return

        // Store original text as a data attribute
        if (!element.hasAttribute('data-original-text')) {
          element.setAttribute('data-original-text', originalText)
        }

        try {
          const translatedText = await translateText(originalText)
          if (translatedText && translatedText !== originalText && translatedText.trim()) {
            element.textContent = translatedText
          }
        } catch (error) {
          console.error('Failed to translate text:', originalText, error)
        }
      }))

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < elementArray.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }, [translateText])

  useEffect(() => {
    if (!isTranslationActive) {
      // Restore original content when translation is disabled
      restoreOriginalContent()
      return
    }

    // Translate all text content on the page
    translatePageContent()
  }, [isTranslationActive, targetLanguage, translatePageContent, restoreOriginalContent])
}

export default usePageTranslation
