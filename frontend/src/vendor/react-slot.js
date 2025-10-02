import React from 'react'

const Slot = createSlot('Slot')
const Slottable = createSlottable('Slottable')

function createSlot(ownerName) {
  const SlotClone = createSlotClone(ownerName)

  const SlotComponent = React.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props
    const childrenArray = React.Children.toArray(children)
    const slottable = childrenArray.find(isSlottable)

    if (slottable) {
      const newElement = slottable.props.children
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (React.Children.count(newElement) > 1) return React.Children.only(null)
          return React.isValidElement(newElement) ? newElement.props.children : null
        }
        return child
      })

      return React.createElement(
        SlotClone,
        { ...slotProps, ref: forwardedRef },
        React.isValidElement(newElement)
          ? React.cloneElement(newElement, undefined, newChildren)
          : null
      )
    }

    return React.createElement(SlotClone, { ...slotProps, ref: forwardedRef }, children)
  })

  SlotComponent.displayName = `${ownerName}.Slot`
  return SlotComponent
}

function createSlotClone(ownerName) {
  const SlotClone = React.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props

    if (React.isValidElement(children)) {
      const childrenRef = getElementRef(children)
      const propsToPass = mergeProps(slotProps, children.props)

      if (children.type !== React.Fragment) {
        propsToPass.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef
      }

      return React.cloneElement(children, propsToPass)
    }

    return React.Children.count(children) > 1 ? React.Children.only(null) : null
  })

  SlotClone.displayName = `${ownerName}.SlotClone`
  return SlotClone
}

const SLOTTABLE_IDENTIFIER = Symbol('radix.slottable')

function createSlottable(ownerName) {
  const SlottableComponent = ({ children }) =>
    React.createElement(React.Fragment, null, children)

  SlottableComponent.displayName = `${ownerName}.Slottable`
  SlottableComponent.__radixId = SLOTTABLE_IDENTIFIER
  return SlottableComponent
}

function isSlottable(child) {
  return (
    React.isValidElement(child) &&
    typeof child.type === 'function' &&
    '__radixId' in child.type &&
    child.type.__radixId === SLOTTABLE_IDENTIFIER
  )
}

function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps }

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName]
    const childPropValue = childProps[propName]
    const isHandler = /^on[A-Z]/.test(propName)

    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          childPropValue(...args)
          slotPropValue(...args)
        }
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue
      }
    } else if (propName === 'style') {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue }
    } else if (propName === 'className') {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(' ')
    }
  }

  return { ...slotProps, ...overrideProps }
}

function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, 'ref')?.get
  let mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning

  if (mayWarn) {
    return element.ref
  }

  getter = Object.getOwnPropertyDescriptor(element, 'ref')?.get
  mayWarn = getter && 'isReactWarning' in getter && getter.isReactWarning

  if (mayWarn) {
    return element.props.ref
  }

  return element.props.ref || element.ref
}

function composeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref != null) {
        ref.current = node
      }
    })
  }
}

export { Slot as Root, Slot, Slottable, createSlot, createSlottable }

export default Slot
