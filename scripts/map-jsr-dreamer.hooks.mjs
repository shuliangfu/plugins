/** Node resolver: jsr:/npm: specifiers -> installed npm package names. */
export function mapSpecifier(specifier) {
  const jsr = /^jsr:(?:@([^/]+)\/)?([^@/]+)(?:@[^/]+)?(\/.*)?$/.exec(specifier);
  if (jsr) {
    const pkg = jsr[1] ? `@jsr/${jsr[1]}__${jsr[2]}` : `@jsr/${jsr[2]}`;
    return `${pkg}${jsr[3] ?? ""}`;
  }
  const npm = /^npm:((?:@[^/]+\/)?[^@/]+)(?:@[^/]+)?(\/.*)?$/.exec(specifier);
  if (npm) return `${npm[1]}${npm[2] ?? ""}`;
  return null;
}

export function rewriteSource(code) {
  code = code.replace(
    /(@jsxImportSource(?:Types)?)\s+jsr:@dreamer\/view(?:@[^ \*]+)?/g,
    "$1 @dreamer/view",
  );
  return code
    .replace(
      /jsr:(?:@([^/"']+)\/)?([^@"'/]+)(?:@[^/"']+)?/g,
      (_, scope, name) => (scope ? `@jsr/${scope}__${name}` : `@jsr/${name}`),
    )
    .replace(
      /npm:((?:@[^/"']+\/)?[^@"'/]+)(?:@[^/"']+)?/g,
      "$1",
    );
}

export function resolve(specifier, context, nextResolve) {
  const mapped = mapSpecifier(specifier);
  if (mapped) specifier = mapped;
  return nextResolve(specifier, context);
}
