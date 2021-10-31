export interface Fetch {
  url: string;
  method?: string;
  body?: string;
  headers?: { [name: string]: string };
}

// TODO: add support for timeout
export const fetchy = async (cnf: Fetch): Promise<Response> => await fetch(cnf.url, cnf);

export function parseFetchStr(f: string): Fetch {
  if (f.startsWith('{')) return JSON.parse(f);
  const s = f.split(':');
  const [method, timeout, headersStr, ...urlAndBody] = s;
  const [url, body] = urlAndBody.join(':').split(':::');
  return {
    url,
    method,
    headers: Object.fromEntries(headersStr.split(',').map((x) => x.split('='))),
    body,
    timeout: +timeout || undefined,
  } as Fetch;
}
