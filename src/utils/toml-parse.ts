import * as toml from 'toml';

/*

$ npm install toml

...will consume kinda 130kb in your app build

but it's cool to have toml parser inside our js vm!

*/

export function tomlParse<T>(c: unknown): T {
  return fixNullProtoRecursively(toml.parse(c + ''));
}

export function fixNullProtoRecursively<T>(a: T): T {
  if (a === undefined || a === null) return a;
  if (Object.getPrototypeOf(a) === null && typeof a === 'object') Object.setPrototypeOf(a, Object.prototype);
  for (const value of Object.values(a)) if (typeof value === 'object') fixNullProtoRecursively(value);
  return a;
}
