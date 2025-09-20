export function twMerge(...classLists) {
  return classLists.filter(Boolean).join(' ')
}

export default twMerge
