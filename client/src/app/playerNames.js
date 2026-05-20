export function getDisplayName(entity) {
  return entity?.username ?? entity?.name ?? ''
}

export function getRouteName(entity) {
  return entity?.username ?? entity?.name ?? ''
}
