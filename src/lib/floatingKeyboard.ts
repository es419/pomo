const EXCLUDED_INPUT_TYPES = new Set([
  'checkbox','radio','range','color','date','time','datetime-local','month','week',
  'file','button','submit','reset','hidden'
])

function isTextEditor(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLElement)) return false
  if (!el.closest('.shell')) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (!(el instanceof HTMLInputElement)) return false
  return !EXCLUDED_INPUT_TYPES.has((el.type || 'text').toLowerCase())
}

function nearestScrollContainer(field: HTMLElement): HTMLElement | null {
  let parent = field.parentElement
  while (parent && parent !== document.body) {
    const cs = getComputedStyle(parent)
    const overflowY = cs.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) return parent
    parent = parent.parentElement
  }
  return null
}

export function installFloatingKeyboardEditor() {
  const vv = window.visualViewport
  const isMobile = window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 820
  if (!vv || !isMobile) return () => {}

  let baselineHeight = Math.max(vv.height, window.innerHeight)
  let settleTimer = 0
  let active: {
    field: HTMLInputElement | HTMLTextAreaElement
    placeholder: HTMLElement
    style: string
    rect: DOMRect
    host: HTMLElement | null
    scroller: HTMLElement | null
    scrollTop: number
  } | null = null

  const keyboardIsOpen = () => baselineHeight - vv.height > 110

  const restore = () => {
    if (!active) return
    const { field, placeholder, style, host } = active
    field.removeAttribute('data-keyboard-floating')
    if (style) field.setAttribute('style', style)
    else field.removeAttribute('style')
    placeholder.remove()
    host?.classList.remove('keyboard-editor-open')
    active = null
  }

  const snapshot = (field: HTMLInputElement | HTMLTextAreaElement) => {
    const rect = field.getBoundingClientRect()
    const scroller = nearestScrollContainer(field)
    const host = field.closest<HTMLElement>('.card')
    const cs = getComputedStyle(field)
    const placeholder = document.createElement('span')
    placeholder.className = 'keyboard-field-placeholder'
    placeholder.style.display = cs.display === 'inline' ? 'inline-block' : cs.display
    placeholder.style.width = `${rect.width}px`
    placeholder.style.height = `${rect.height}px`
    placeholder.style.marginTop = cs.marginTop
    placeholder.style.marginRight = cs.marginRight
    placeholder.style.marginBottom = cs.marginBottom
    placeholder.style.marginLeft = cs.marginLeft
    placeholder.style.flex = cs.flex
    placeholder.style.alignSelf = cs.alignSelf
    field.parentNode?.insertBefore(placeholder, field)

    active = {
      field,
      placeholder,
      style: field.getAttribute('style') || '',
      rect,
      host,
      scroller,
      scrollTop: scroller?.scrollTop || 0
    }
    host?.classList.add('keyboard-editor-open')
    field.setAttribute('data-keyboard-floating', 'true')
  }

  const position = (preFocus = false) => {
    if (!active) return
    const { field, rect, scroller, scrollTop } = active
    if (scroller) scroller.scrollTop = scrollTop

    const width = Math.min(rect.width || window.innerWidth - 28, window.innerWidth - 28)
    const left = Math.max(14, Math.min(rect.left, window.innerWidth - width - 14))
    const height = Math.max(44, rect.height)
    const keyboardTop = vv.offsetTop + vv.height
    const safePreFocusTop = Math.max(
      vv.offsetTop + 72,
      Math.min(vv.offsetTop + vv.height * 0.46, keyboardTop - height - 18)
    )
    const top = preFocus || !keyboardIsOpen()
      ? safePreFocusTop
      : Math.max(vv.offsetTop + 12, keyboardTop - height - 12)

    const set = (name: string, value: string) => field.style.setProperty(name, value, 'important')
    set('position', 'fixed')
    set('left', `${Math.round(left)}px`)
    set('right', 'auto')
    set('top', `${Math.round(top)}px`)
    set('bottom', 'auto')
    set('width', `${Math.round(width)}px`)
    set('height', `${Math.round(height)}px`)
    set('margin', '0')
    set('transform', 'none')
    set('z-index', '10050')
  }

  const float = (field: HTMLInputElement | HTMLTextAreaElement, preFocus = false) => {
    if (active?.field !== field) restore()
    if (!active) snapshot(field)
    position(preFocus)
  }

  const settle = () => {
    window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => {
      const field = document.activeElement
      if (keyboardIsOpen() && isTextEditor(field)) float(field)
      else if (!keyboardIsOpen() && !isTextEditor(field)) restore()
    }, 30)
  }

  const activate = (field: HTMLInputElement | HTMLTextAreaElement, event: Event) => {
    if (field.disabled || field.readOnly || document.activeElement === field) return
    event.preventDefault()
    float(field, true)
    try { field.focus({ preventScroll: true }) }
    catch { field.focus() }
    try {
      const end = field.value.length
      field.setSelectionRange?.(end, end)
    } catch {}
  }

  // iOS reliably suppresses its synthetic follow-up click when touchstart itself
  // is cancelled. That prevents the quick tap from immediately blurring the
  // field after we move it. Pointerdown is kept only as a non-touch fallback.
  const onTouchStart = (event: TouchEvent) => {
    const field = event.target
    if (isTextEditor(field)) activate(field, event)
  }
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    const field = event.target
    if (isTextEditor(field)) activate(field, event)
  }

  const onFocusIn = (event: FocusEvent) => {
    if (!isTextEditor(event.target)) return
    if (active?.field !== event.target) float(event.target, true)
    settle()
  }

  const onFocusOut = (event: FocusEvent) => {
    if (!isTextEditor(event.target)) return
    window.setTimeout(() => {
      if (!isTextEditor(document.activeElement)) restore()
    }, 0)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' || (event.key === 'Enter' && isTextEditor(event.target))) {
      event.preventDefault()
      ;(event.target as HTMLElement).blur()
    }
  }

  const onViewportChange = () => {
    if (!keyboardIsOpen() && document.activeElement === document.body) {
      baselineHeight = Math.max(baselineHeight, vv.height)
    }
    settle()
  }

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea').forEach(el => {
    if (isTextEditor(el) && !el.hasAttribute('enterkeyhint')) el.setAttribute('enterkeyhint', 'done')
  })

  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: false })
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  document.addEventListener('keydown', onKeyDown)
  vv.addEventListener('resize', onViewportChange)
  vv.addEventListener('scroll', onViewportChange)

  return () => {
    document.removeEventListener('touchstart', onTouchStart, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    document.removeEventListener('keydown', onKeyDown)
    vv.removeEventListener('resize', onViewportChange)
    vv.removeEventListener('scroll', onViewportChange)
    window.clearTimeout(settleTimer)
    restore()
  }
}
