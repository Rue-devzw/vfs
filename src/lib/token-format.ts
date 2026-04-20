export function formatTokenGroups(rawToken: string) {
  return rawToken
    .split("\n")
    .map((line) => {
      const compact = line.replace(/\D/g, "");
      if (compact.length < 4) {
        return line.trim();
      }

      return compact.match(/.{1,4}/g)?.join(" ") ?? line.trim();
    })
    .filter(Boolean)
    .join("\n");
}
