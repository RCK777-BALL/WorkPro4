const React = require('react')

const Slot = React.forwardRef(({ children, ...props }, ref) => {
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, ref })
  }
  return React.createElement('span', { ...props, ref }, children)
})

Slot.displayName = 'Slot'

module.exports = {
  Slot,
  default: Slot,
}
