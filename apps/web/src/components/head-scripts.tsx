'use client'

import { useEffect, useRef } from 'react'
import { API_BASE_URL } from '@/lib/api'

type SeoSettings = {
  pixelCode: string
  googleAdsCode: string
  headScripts: string
}

/**
 * Parses an HTML string containing script tags and injects them into <head>.
 * Using innerHTML won't execute <script> tags, so we need to create
 * real script elements and append them to the document.
 */
function injectScripts(html: string, container: HTMLElement) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Inject non-script elements (e.g. noscript, meta, link)
  const nonScriptNodes = doc.head.querySelectorAll(':not(script)')
  nonScriptNodes.forEach((node) => {
    container.appendChild(document.importNode(node, true))
  })
  const bodyNonScriptNodes = doc.body.querySelectorAll(':not(script)')
  bodyNonScriptNodes.forEach((node) => {
    container.appendChild(document.importNode(node, true))
  })

  // Inject script elements — must be created fresh to execute
  const scripts = doc.querySelectorAll('script')
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script')
    // Copy all attributes (src, async, id, data-*, etc.)
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value)
    })
    // Copy inline script content
    if (oldScript.textContent) {
      newScript.textContent = oldScript.textContent
    }
    container.appendChild(newScript)
  })
}

export function HeadScripts() {
  const injectedRef = useRef(false)

  useEffect(() => {
    if (injectedRef.current) return
    injectedRef.current = true

    fetch(`${API_BASE_URL}/api/v1/platform/seo`)
      .then((res) => res.json())
      .then((json) => {
        const data = json.data as SeoSettings | undefined
        if (!data) return

        const marker = document.createElement('div')
        marker.setAttribute('data-head-scripts', 'true')
        marker.style.display = 'none'

        // Remove previously injected scripts (on hot reload / re-mount)
        const existing = document.head.querySelector('[data-head-scripts]')
        if (existing) existing.remove()

        const fragment = document.createDocumentFragment()
        const wrapper = document.createElement('div')
        wrapper.setAttribute('data-head-scripts', 'true')

        if (data.googleAdsCode) {
          injectScripts(data.googleAdsCode, document.head)
        }
        if (data.pixelCode) {
          injectScripts(data.pixelCode, document.head)
        }
        if (data.headScripts) {
          injectScripts(data.headScripts, document.head)
        }
      })
      .catch(() => {
        // Silently fail — tracking scripts should not break the app
      })
  }, [])

  return null
}
