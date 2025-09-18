function resolveVariant(options, key, value) {
  const variants = options.variants || {}
  const defaults = options.defaultVariants || {}
  const variantMap = variants[key]
  if (!variantMap) return ''
  const resolved = value !== undefined ? value : defaults[key]
  if (!resolved) return ''
  return variantMap[resolved] || ''
}

function cva(base, options = {}) {
  return function variantFn(props = {}) {
    const classNames = [base]
    const keys = Object.keys(options.variants || {})
    for (const key of keys) {
      classNames.push(resolveVariant(options, key, props[key]))
    }
    if (props.className) {
      classNames.push(props.className)
    }
    return classNames.filter(Boolean).join(' ')
  }
}

module.exports = {
  cva,
  default: cva,
}
