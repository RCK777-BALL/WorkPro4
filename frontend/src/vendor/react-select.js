const React = require('react')

const Root = ({ children }) => React.createElement('div', null, children)
const Group = ({ children }) => React.createElement('div', null, children)
const Value = ({ children }) => React.createElement('span', null, children)

const Trigger = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('button', { type: 'button', ref, ...props }, children),
)

const Icon = ({ asChild, children }) => (asChild ? children : React.createElement('span', null, children))
const ScrollUpButton = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('button', { type: 'button', ref, ...props }, children),
)
const ScrollDownButton = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('button', { type: 'button', ref, ...props }, children),
)

const Portal = ({ children }) => React.createElement(React.Fragment, null, children)
const Content = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('div', { ref, ...props }, children),
)
const Viewport = ({ children, ...props }) => React.createElement('div', { ...props }, children)

const Item = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('div', { role: 'option', ref, ...props }, children),
)
const ItemIndicator = ({ children }) => React.createElement('span', null, children)
const ItemText = ({ children }) => React.createElement('span', null, children)

const Label = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('div', { ref, ...props }, children),
)
const Separator = React.forwardRef((props, ref) => React.createElement('div', { ref, ...props }))

module.exports = {
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
