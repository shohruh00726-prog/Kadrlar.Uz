export function activeMemberCount(members: { status: string }[]) {
  return members.filter((m) => m.status === "active").length;
}

export function teamIsListable(isPublic: boolean, members: { status: string }[]) {
  return isPublic && activeMemberCount(members) >= 2;
}
