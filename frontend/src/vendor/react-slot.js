import React from 'react'

export const Slot = React.forwardRef(({ children, ...props }, ref) => {
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { ...props, ref })
  }
  return React.createElement('span', { ...props, ref }, children)
})

Slot.displayName = 'Slot'

export default Slot
