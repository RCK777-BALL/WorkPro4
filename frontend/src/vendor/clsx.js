function toClass(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.map(toClass).filter(Boolean).join(' ')
  }
  if (typeof value === 'object') {
    return Object.keys(value)
      .filter((key) => value[key])
      .join(' ')
  }
  return ''
}

function clsx(...inputs) {
  return inputs.map(toClass).filter(Boolean).join(' ')
}

module.exports = {
  clsx,
  default: clsx,
}
