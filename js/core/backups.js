// Backups retain the original top-level account map and metadata fields.
export function validateBackup(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Backup must be an account map");
  }
  for (const account of Object.values(value)) {
    if (!account || typeof account !== "object" || Array.isArray(account)) {
      throw new Error("Each account must be an object");
    }
    if (
      account.__missing__ !== undefined &&
      (!Array.isArray(account.__missing__) ||
        account.__missing__.some((name) => typeof name !== "string"))
    ) {
      throw new Error("Missing agents must be a list of names");
    }
    if (
      account.__server__ !== undefined &&
      !["ry", "dyy"].includes(account.__server__)
    ) {
      throw new Error("Unknown server");
    }
  }
  return value;
}

export function mergeBackups(existing, incoming, mode = "merge") {
  const result = structuredClone(existing);
  for (const [key, account] of Object.entries(incoming)) {
    if (mode === "overwrite" || !Object.hasOwn(result, key)) {
      result[key] = structuredClone(account);
      continue;
    }
    const previous = result[key];
    for (const [field, value] of Object.entries(account)) {
      if (field === "__missing__") {
        previous.__missing__ = [
          ...new Set([...(previous.__missing__ || []), ...value]),
        ];
      } else if (field === "__server__") {
        previous.__server__ ||= value;
      } else {
        previous[field] = !!(previous[field] || value);
      }
    }
  }
  return result;
}
