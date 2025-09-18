const React = require('react')

const TabsContext = React.createContext(null)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) {
    throw new Error('Tabs components must be used within <Tabs.Root>')
  }
  return ctx
}

function TabsRoot({ defaultValue, value, onValueChange, children }) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState(defaultValue)

  const activeValue = isControlled ? value : internalValue

  const contextValue = React.useMemo(() => ({
    value: activeValue,
    setValue: (next) => {
      if (!isControlled) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
  }), [activeValue, isControlled, onValueChange])

  return React.createElement(TabsContext.Provider, { value: contextValue }, children)
}

const TabsList = React.forwardRef(({ children, ...props }, ref) =>
  React.createElement('div', { role: 'tablist', ref, ...props }, children),
)

const TabsTrigger = React.forwardRef(({ value, children, onClick, ...props }, ref) => {
  const { value: activeValue, setValue } = useTabsContext()
  const isActive = activeValue === value

  return React.createElement(
    'button',
    {
      type: 'button',
      role: 'tab',
      'aria-selected': isActive,
      'data-state': isActive ? 'active' : 'inactive',
      ref,
      onClick: (event) => {
        setValue(value)
        onClick?.(event)
      },
      ...props,
    },
    children,
  )
})

const TabsContent = React.forwardRef(({ value, children, ...props }, ref) => {
  const { value: activeValue } = useTabsContext()
  if (activeValue !== value) {
    return null
  }
  return React.createElement('div', { role: 'tabpanel', ref, ...props }, children)
})

module.exports = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
}
