<template>
  <template v-if="slides.length">
    <Screen v-if="screening" />
    <Editor v-else-if="_isPC" />
    <Mobile v-else />
  </template>
  <FullscreenSpin tip="Loading presentation..." v-else loading :mask="false" />
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@/configs/storage'
import { deleteDiscardedDB } from '@/utils/database'
import { isPC } from '@/utils/common'
import api from '@/services'
import useImport from '@/hooks/useImport'
import useExport from '@/hooks/useExport'

import Editor from './views/Editor/index.vue'
import Screen from './views/Screen/index.vue'
import Mobile from './views/Mobile/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'

const _isPC = isPC()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const snapshotStore = useSnapshotStore()
const { databaseId } = storeToRefs(mainStore)
const { slides } = storeToRefs(slidesStore)
const { screening } = storeToRefs(useScreenStore())

const { importPPTXFile } = useImport()
const { exportPPTXToBase64 } = useExport()

// When embedded in an iframe, don't block navigation with beforeunload
const isEmbedded = window.self !== window.top
if (import.meta.env.MODE !== 'development' && !isEmbedded) {
  window.onbeforeunload = () => false
}

/**
 * Import a .pptx file from an ArrayBuffer using the same pipeline as the UI import.
 */
const importFromArrayBuffer = (arrayBuffer: ArrayBuffer) => {
  const blob = new Blob([arrayBuffer])
  const file = new File([blob], 'import.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
  importPPTXFile([file], { cover: true })
}

/**
 * postMessage bridge for iframe communication.
 * Supports: import-pptx, export-pptx, get-slides
 */
window.addEventListener('message', async (event: MessageEvent) => {
  // TODO: Add origin checking for production use
  // if (event.origin !== 'https://your-app.com') return

  const { data } = event
  if (!data || typeof data !== 'object' || !data.type) return

  try {
    if (data.type === 'import-pptx' && data.base64) {
      const binaryString = atob(data.base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      importFromArrayBuffer(bytes.buffer)

      // Wait briefly for the import to process, then notify parent
      setTimeout(() => {
        window.parent.postMessage({ type: 'import-complete', success: true }, '*')
      }, 500)
    }
    else if (data.type === 'export-pptx') {
      const base64 = await exportPPTXToBase64(slides.value, false, false)
      window.parent.postMessage({ type: 'export-result', base64 }, '*')
    }
    else if (data.type === 'get-slides') {
      const slidesData = JSON.parse(JSON.stringify(slides.value))
      window.parent.postMessage({ type: 'slides-data', data: slidesData }, '*')
    }
  }
  catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    window.parent.postMessage({
      type: data.type === 'export-pptx' ? 'export-result' : 'import-complete',
      success: false,
      error: errorMessage,
    }, '*')
  }
})

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const fileUrl = urlParams.get('file')
  const waitForBase64 = urlParams.get('base64')

  let loadedFromUrl = false

  // Try to load from ?file= URL parameter
  if (fileUrl) {
    console.log('[PPTist] Loading file from URL:', fileUrl)
    try {
      // Try fetch with CORS first
      const response = await fetch(fileUrl, {
        mode: 'cors',
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      console.log('[PPTist] Fetched file, size:', arrayBuffer.byteLength)
      
      if (arrayBuffer.byteLength > 0) {
        importFromArrayBuffer(arrayBuffer)
        loadedFromUrl = true
        
        // Notify parent of successful load
        if (isEmbedded) {
          window.parent.postMessage({ type: 'file-loaded', success: true, url: fileUrl }, '*')
        }
      }
    }
    catch (err) {
      console.error('[PPTist] Failed to fetch file from URL:', err)
      
      // Notify parent of failure
      if (isEmbedded) {
        window.parent.postMessage({ 
          type: 'file-loaded', 
          success: false, 
          url: fileUrl,
          error: err instanceof Error ? err.message : 'Unknown error'
        }, '*')
      }
    }
  }

  // Load defaults only if:
  // 1. No URL was provided or URL fetch failed
  // 2. Not waiting for base64 postMessage
  if (!loadedFromUrl && !waitForBase64) {
    console.log('[PPTist] Loading default slides')
    const defaultSlides = await api.getMockData('slides')
    slidesStore.setSlides(defaultSlides)
  }

  await deleteDiscardedDB()
  snapshotStore.initSnapshotDatabase()

  // Notify parent that PPTist is ready for postMessage communication
  if (isEmbedded) {
    window.parent.postMessage({ type: 'pptist-ready' }, '*')
  }
})

// Store database ID in localStorage on unload for cleanup
window.addEventListener('beforeunload', () => {
  const discardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
  const discardedDBList: string[] = discardedDB ? JSON.parse(discardedDB) : []

  discardedDBList.push(databaseId.value)

  const newDiscardedDB = JSON.stringify(discardedDBList)
  localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, newDiscardedDB)
})
</script>

<style lang="scss">
#app {
  height: 100%;
}
</style>