/**
 * SampleBrowser — modal for browsing, searching, previewing, and inserting samples.
 *
 * Opens as a centered overlay. Left column: category list. Right column: sample list
 * filtered by selected category and search query. Each sample has preview (play) and
 * insert (paste into editor) buttons.
 */

import { getCategories, getSamplesByCategory, searchSamples, type SampleInfo } from '../engine/SampleCatalog'

export interface SampleBrowserCallbacks {
  onPreviewSample: (name: string) => void
  onInsertText: (text: string) => void
}

export class SampleBrowser {
  private overlay: HTMLElement | null = null
  private callbacks: SampleBrowserCallbacks
  private selectedCategory = ''
  private searchQuery = ''
  private categoryListEl: HTMLElement | null = null
  private sampleListEl: HTMLElement | null = null
  private escHandler: ((e: KeyboardEvent) => void) | null = null

  constructor(callbacks: SampleBrowserCallbacks) {
    this.callbacks = callbacks
  }

  open(): void {
    if (this.overlay) return
    this.selectedCategory = ''
    this.searchQuery = ''

    // Overlay backdrop
    this.overlay = document.createElement('div')
    this.overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Fira Code', 'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace;
    `
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close()
    })

    // Modal container
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: #1c2128;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      width: 640px;
      max-width: 90vw;
      height: 480px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 48px rgba(0,0,0,0.5);
      overflow: hidden;
    `
    this.overlay.appendChild(modal)

    // Header row: title + search + close
    const header = document.createElement('div')
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.8rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0;
    `

    const title = document.createElement('span')
    title.textContent = 'Samples'
    title.style.cssText = `
      font-size: 0.8rem;
      font-weight: 700;
      color: #c9d1d9;
      white-space: nowrap;
    `
    header.appendChild(title)

    // Search input
    const searchInput = document.createElement('input')
    searchInput.type = 'text'
    searchInput.placeholder = 'Search samples...'
    searchInput.style.cssText = `
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      padding: 0.3rem 0.5rem;
      color: #c9d1d9;
      font-family: inherit;
      font-size: 0.7rem;
      outline: none;
      margin-left: 0.5rem;
    `
    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim()
      this.renderSamples()
    })
    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = '#E8527C'
    })
    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = 'rgba(255,255,255,0.1)'
    })
    header.appendChild(searchInput)

    // Close button
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '\u2715'
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #8b949e;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      transition: background 0.1s, color 0.1s;
      line-height: 1;
    `
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.08)'
      closeBtn.style.color = '#c9d1d9'
    })
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'none'
      closeBtn.style.color = '#8b949e'
    })
    closeBtn.addEventListener('click', () => this.close())
    header.appendChild(closeBtn)
    modal.appendChild(header)

    // Body: categories (left) + samples (right)
    const body = document.createElement('div')
    body.style.cssText = `
      flex: 1;
      display: flex;
      min-height: 0;
      overflow: hidden;
    `
    modal.appendChild(body)

    // Category list
    this.categoryListEl = document.createElement('div')
    this.categoryListEl.style.cssText = `
      width: 140px;
      min-width: 120px;
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      padding: 0.3rem 0;
      flex-shrink: 0;
    `
    body.appendChild(this.categoryListEl)

    // Sample list
    this.sampleListEl = document.createElement('div')
    this.sampleListEl.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 0.3rem 0;
    `
    body.appendChild(this.sampleListEl)

    this.renderCategories()
    this.renderSamples()

    document.body.appendChild(this.overlay)

    // Focus search
    searchInput.focus()

    // Escape to close
    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        this.close()
      }
    }
    document.addEventListener('keydown', this.escHandler, true)
  }

  close(): void {
    if (this.escHandler) {
      document.removeEventListener('keydown', this.escHandler, true)
      this.escHandler = null
    }
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
    this.categoryListEl = null
    this.sampleListEl = null
  }

  get isOpen(): boolean {
    return this.overlay !== null
  }

  private renderCategories(): void {
    const el = this.categoryListEl
    if (!el) return
    el.innerHTML = ''

    // "All" option
    const allItem = this.createCategoryItem('All', '')
    el.appendChild(allItem)

    for (const cat of getCategories()) {
      const count = getSamplesByCategory(cat).length
      el.appendChild(this.createCategoryItem(`${cat} (${count})`, cat))
    }
  }

  private createCategoryItem(label: string, category: string): HTMLElement {
    const item = document.createElement('div')
    const isActive = this.selectedCategory === category
    item.style.cssText = `
      padding: 0.25rem 0.6rem;
      font-size: 0.65rem;
      color: ${isActive ? '#c9d1d9' : '#8b949e'};
      background: ${isActive ? 'rgba(232,82,124,0.12)' : 'transparent'};
      border-left: 2px solid ${isActive ? '#E8527C' : 'transparent'};
      cursor: pointer;
      transition: background 0.1s, color 0.1s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `
    item.textContent = label
    item.addEventListener('mouseenter', () => {
      if (this.selectedCategory !== category) {
        item.style.background = 'rgba(255,255,255,0.04)'
        item.style.color = '#c9d1d9'
      }
    })
    item.addEventListener('mouseleave', () => {
      if (this.selectedCategory !== category) {
        item.style.background = 'transparent'
        item.style.color = '#8b949e'
      }
    })
    item.addEventListener('click', () => {
      this.selectedCategory = category
      this.renderCategories()
      this.renderSamples()
    })
    return item
  }

  private renderSamples(): void {
    const el = this.sampleListEl
    if (!el) return
    el.innerHTML = ''

    let samples: SampleInfo[]
    if (this.searchQuery) {
      samples = searchSamples(this.searchQuery)
      if (this.selectedCategory) {
        samples = samples.filter(s => s.category === this.selectedCategory)
      }
    } else if (this.selectedCategory) {
      samples = getSamplesByCategory(this.selectedCategory)
    } else {
      // Show all, grouped by category
      samples = []
      for (const cat of getCategories()) {
        samples.push(...getSamplesByCategory(cat))
      }
    }

    if (samples.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'No samples found'
      empty.style.cssText = `
        padding: 1.5rem;
        text-align: center;
        color: #484f58;
        font-size: 0.7rem;
      `
      el.appendChild(empty)
      return
    }

    for (const sample of samples) {
      el.appendChild(this.createSampleRow(sample))
    }
  }

  private createSampleRow(sample: SampleInfo): HTMLElement {
    const row = document.createElement('div')
    row.style.cssText = `
      display: flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      gap: 0.4rem;
      transition: background 0.1s;
    `
    row.addEventListener('mouseenter', () => {
      row.style.background = 'rgba(255,255,255,0.04)'
    })
    row.addEventListener('mouseleave', () => {
      row.style.background = 'transparent'
    })

    // Preview button
    const previewBtn = document.createElement('button')
    previewBtn.textContent = '\u25B6'
    previewBtn.title = 'Preview sample'
    previewBtn.style.cssText = `
      background: none;
      border: 1px solid rgba(255,255,255,0.1);
      color: #8b949e;
      border-radius: 3px;
      width: 22px; height: 22px;
      font-size: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    `
    previewBtn.addEventListener('mouseenter', () => {
      previewBtn.style.borderColor = '#E8527C'
      previewBtn.style.color = '#E8527C'
    })
    previewBtn.addEventListener('mouseleave', () => {
      previewBtn.style.borderColor = 'rgba(255,255,255,0.1)'
      previewBtn.style.color = '#8b949e'
    })
    previewBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.callbacks.onPreviewSample(sample.name)
    })
    row.appendChild(previewBtn)

    // Sample name
    const name = document.createElement('span')
    name.textContent = `:${sample.name}`
    name.style.cssText = `
      flex: 1;
      font-size: 0.7rem;
      color: #c9d1d9;
      font-family: inherit;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `
    row.appendChild(name)

    // Category badge (when showing all)
    if (!this.selectedCategory) {
      const badge = document.createElement('span')
      badge.textContent = sample.category
      badge.style.cssText = `
        font-size: 0.55rem;
        color: #484f58;
        white-space: nowrap;
        flex-shrink: 0;
      `
      row.appendChild(badge)
    }

    // Insert button
    const insertBtn = document.createElement('button')
    insertBtn.textContent = 'Insert'
    insertBtn.title = 'Insert at cursor'
    insertBtn.style.cssText = `
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #8b949e;
      border-radius: 3px;
      padding: 0.15rem 0.4rem;
      font-family: inherit;
      font-size: 0.55rem;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    `
    insertBtn.addEventListener('mouseenter', () => {
      insertBtn.style.borderColor = '#5EBDAB'
      insertBtn.style.color = '#5EBDAB'
    })
    insertBtn.addEventListener('mouseleave', () => {
      insertBtn.style.borderColor = 'rgba(255,255,255,0.1)'
      insertBtn.style.color = '#8b949e'
    })
    insertBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.callbacks.onInsertText(`sample :${sample.name}`)
    })
    row.appendChild(insertBtn)

    return row
  }

  dispose(): void {
    this.close()
  }
}
