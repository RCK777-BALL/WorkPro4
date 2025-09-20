import React from 'react'

export const Root = ({ children }) => React.createElement('div', null, children)
export const Group = ({ children }) => React.createElement('div', null, children)
export const Value = ({ children }) => React.createElement('span', null, children)

export const Trigger = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('button', { type: 'button', ref, ...props }, children),
)

export const Icon = ({ asChild, children }) => (asChild ? children : React.createElement('span', null, children))
export const ScrollUpButton = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('button', { type: 'button', ref, ...props }, children),
)
export const ScrollDownButton = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('button', { type: 'button', ref, ...props }, children),
)

export const Portal = ({ children }) => React.createElement(React.Fragment, null, children)
export const Content = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('div', { ref, ...props }, children),
)
export const Viewport = ({ children, ...props }) => React.createElement('div', { ...props }, children)

export const Item = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('div', { role: 'option', ref, ...props }, children),
)
export const ItemIndicator = ({ children }) => React.createElement('span', null, children)
export const ItemText = ({ children }) => React.createElement('span', null, children)

export const Label = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('div', { ref, ...props }, children),
)
export const Separator = React.forwardRef((props, ref) => React.createElement('div', { ref, ...props }))

const SelectPrimitive = {
  Root,
  Group,
  Value,
  Trigger,
  Icon,
  ScrollUpButton,
  ScrollDownButton,
  Portal,
  Content,
  Viewport,
  Item,
  ItemIndicator,
  ItemText,
  Label,
  Separator,
}

export default SelectPrimitive
