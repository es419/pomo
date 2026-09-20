const EXCLUDED_INPUT_TYPES = new Set([
  'checkbox','radio','range','color','date','time','datetime-local','month','week',
  'file','button','submit','reset','hidden'
])

function isTextEditor(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLTextAreaElement) return true
  if (!(el instanceof HTMLInputElement)) return false
  return !EXCLUDED_INPUT_TYPES.has((el.type || 'text').toLowerCase())
}

export function installFloatingKeyboardEditor() {
  const vv = window.visualViewport
  const isMobile = window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 820
  if (!vv || !isMobile) return () => {}

  let baselineHeight = Math.max(vv.height, window.innerHeight)
  let active: {
    field: HTMLInputElement | HTMLTextAreaElement
    placeholder: HTMLElement
    style: string
    className: string
    rect: DOMRect
    hosts: HTMLElement[]
  } | null = null
  let settleTimer = 0

  const keyboardIsOpen = () => baselineHeight - vv.height > 110

  const restore = () => {
    if (!active) return
    const { field, placeholder, style, className, hosts } = active
    field.className = className
    if (style) field.setAttribute('style', style)
    else field.removeAttribute('style')
    placeholder.remove()
    hosts.forEach(host => host.classList.remove('keyboard-float-host'))
    active = null
    document.documentElement.classList.remove('keyboard-editor-active')
  }

  const positionField = (preFocus = false) => {
    if (!active) return
    const { field, rect } = active
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

  const floatField = (field: HTMLInputElement | HTMLTextAreaElement, preFocus = false) => {
    if (active?.field !== field) restore()

    if (!active) {
      const rect = field.getBoundingClientRect()
      const cs = getComputedStyle(field)
      const placeholder = document.createElement('span')
      placeholder.className = 'keyboard-field-placeholder'
      placeholder.style.display = cs.display === 'inline' ? 'inline-block' : cs.display
      placeholder.style.width = `${rect.width}px`
      placeholder.style.height = `${rect.height}px`
      placeholder.style.margin = cs.margin
      placeholder.style.flex = cs.flex
      placeholder.style.alignSelf = cs.alignSelf
      field.parentNode?.insertBefore(placeholder, field)

      const hosts: HTMLElement[] = []
      let parent = field.parentElement
      while (parent && parent !== document.body && parent !== document.documentElement) {
        const pcs = getComputedStyle(parent)
        const backdrop = pcs.getPropertyValue('backdrop-filter') || pcs.getPropertyValue('-webkit-backdrop-filter')
        if (pcs.transform !== 'none' || pcs.filter !== 'none' || (backdrop && backdrop !== 'none')) {
          parent.classList.add('keyboard-float-host')
          hosts.push(parent)
        }
        parent = parent.parentElement
      }

      active = {
        field,
        placeholder,
        style: field.getAttribute('style') || '',
        className: field.className,
        rect,
        hosts
      }
      document.documentElement.classList.add('keyboard-editor-active')
      field.classList.add('keyboard-floating-field')
    }

    positionField(preFocus)
  }

  const settle = () => {
    window.clearTimeout(settleTimer)
    settleTimer = window.setTimeout(() => {
      if (keyboardIsOpen() && isTextEditor(document.activeElement)) {
        floatField(document.activeElement)
      } else if (!keyboardIsOpen() && document.activeElement !== active?.field) {
        restore()
      }
    }, 30)
  }

  const onPointerDown = (event: PointerEvent) => {
    const field = event.target
    if (!isTextEditor(field) || field.disabled || field.readOnly) return
    if (document.activeElement === field) return

    event.preventDefault()
    floatField(field, true)

    try {
      field.focus({ preventScroll: true })
    } catch {
      field.focus()
    }

    try {
      const end = field.value.length
      field.setSelectionRange?.(end, end)
    } catch {}
  }

  const onFocusIn = (event: FocusEvent) => {
    if (!isTextEditor(event.target)) return
    if (active?.field !== event.target) floatField(event.target, true)
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
    if (!keyboardIsOpen() && !isTextEditor(document.activeElement)) {
      baselineHeight = Math.max(baselineHeight, vv.height)
    }
    settle()
  }

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea').forEach(el => {
    if (isTextEditor(el) && !el.hasAttribute('enterkeyhint')) el.setAttribute('enterkeyhint', 'done')
  })

  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  document.addEventListener('keydown', onKeyDown)
  vv.addEventListener('resize', onViewportChange)
  vv.addEventListener('scroll', onViewportChange)

  return () => {
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
