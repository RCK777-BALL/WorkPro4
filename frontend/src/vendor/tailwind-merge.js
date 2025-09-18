function twMerge(...classLists) {
  return classLists.filter(Boolean).join(' ')
}

module.exports = {
  twMerge,
  default: twMerge,
}
