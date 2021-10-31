/*
  This is a kingdom of ANY and dirty code.
  Will be fixed one day.
*/

import { makeInterpreter } from './utils/interpreter/interpreter-js';
import { Fetch, fetchy } from './utils/fetch-utils';
import { tomlParse } from './utils/toml-parse';
import { parse } from 'json5';

export function startEval(
  code: string,
  functionWrappedParams: string | undefined,
  incomingData: unknown,
  fetches: { [s: string]: Fetch }
) {
  const runAgain: { runAgain: any } = { runAgain: 'should-not-crash' };
  if (functionWrappedParams === undefined)
    code = `
function x9w4r8udd3() {
${code}
;}
var res = x9w4r8udd3();
res === undefined ? null : res`;
  else
    code = `
var x9w4r8udd3 = ${code} 
;
var res = x9w4r8udd3(${functionWrappedParams});
res === undefined ? null : res`;

  console.log('code=' + code);

  const int = makeInterpreter(code, (interpreter: any, globalObject: any) => {
    const api = interpreter.nativeToPseudo({});
    interpreter.setProperty(globalObject, 'api', api);
    interpreter.setProperty(globalObject, 'incoming', interpreter.nativeToPseudo(incomingData));

    const catching = (name: string, lam: () => unknown) => {
      try {
        console.log('called: ' + name);
        return lam();
      } catch (e) {
        console.log('name: ' + e + ' / ' + (e as Error).message);
        return 'ERROR';
      }
    };
    interpreter.setProperty(
      api,
      'fetchSync',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interpreter.createAsyncFunction((fetchId: string, objs: any, callback: (d: string) => void) => {
        (async () => {
          try {
            const fetched = await fetchy(fetches[fetchId]);
            const text = await fetched.text();

            callback(
              interpreter.nativeToPseudo({
                ok: fetched.status >= 200 && fetched.status < 300,
                body: text,
                status: fetched.status,
                headers: Object.fromEntries([...fetched.headers.entries()]),
              })
            );
            runAgain.runAgain();
          } catch (e) {
            console.log('' + e + ' / ' + (e as Error).message);

            callback(interpreter.nativeToPseudo({ body: 'error: ' + (e as Error).message, status: 0, headers: {} }));
            runAgain.runAgain();
          }
        })();
      }, false)
    );
    interpreter.setProperty(
      api,
      'pause',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interpreter.createAsyncFunction((fetchId: string, objs: any, callback: (d: string) => void) => {
        int.value = 'PAUSED';
        // obj = interpreter.pseudoToNative(obj);
        // objs = objs.map((x) => interpreter.pseudoToNative(x));
        // return interpreter.nativeToPseudo(Object.assign(obj, ...objs));
      }, false)
    );
    interpreter.setProperty(
      api,
      'tomlParse',
      interpreter.createNativeFunction((toml: string) => {
        return catching('tomlParse', () => interpreter.nativeToPseudo(tomlParse(toml)));
      }, false)
    );
    interpreter.setProperty(
      api,
      'json5Parse',
      interpreter.createNativeFunction((toml: string) => {
        return catching('json5Parse', () => interpreter.nativeToPseudo(parse(toml)));
      }, false)
    );
    interpreter.setProperty(
      api,
      'test',
      interpreter.createNativeFunction((data: any) => {
        return catching('test', () => {
          const obj = interpreter.pseudoToNative(data);
          return interpreter.nativeToPseudo({ res: '' + (obj.a + obj.b) });
        });
      }, false)
    );
    interpreter.setProperty(
      interpreter.OBJECT,
      'assign',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      interpreter.createNativeFunction((obj: any, ...objs: any[]) => {
        return catching('assign', () => {
          obj = interpreter.pseudoToNative(obj);
          objs = objs.map((x) => interpreter.pseudoToNative(x));
          return interpreter.nativeToPseudo(Object.assign(obj, ...objs));
        });
      }, false)
    );
    interpreter.setProperty(
      interpreter.OBJECT,
      'fromEntries',
      interpreter.createNativeFunction((obj: any) => {
        return catching('fromEntries', () => {
          obj = interpreter.pseudoToNative(obj);
          return interpreter.nativeToPseudo(Object.fromEntries(obj));
        });
      })
    );

    const functions: string[] = ['startsWith', 'split', 'repeat', 'endsWith'];
    for (let i = 0; i < functions.length; i++) {
      interpreter.setNativeFunctionPrototype(
        interpreter.STRING,
        functions[i],
        function (this: string, ...params: any[]) {
          const res = (String.prototype[functions[i] as any] as any as (...a: any[]) => any).apply(
            this as any,
            params.map((x) => interpreter.pseudoToNative(x))
          );
          if (typeof res === 'string' || typeof res === 'number') return res;
          return interpreter.nativeToPseudo(res);
        }
      );
    }
    interpreter.setProperty(
      interpreter.OBJECT,
      'entriesCopy',
      interpreter.createNativeFunction((obj: any) => {
        return catching('entriesCopy', () => {
          obj = interpreter.pseudoToNative(obj);
          return interpreter.nativeToPseudo(Object.entries(obj));
        });
      })
    );
    interpreter.setProperty(
      interpreter.OBJECT,
      'valuesCopy',
      interpreter.createNativeFunction((obj: any) => {
        return catching('valuesCopy', () => {
          obj = interpreter.pseudoToNative(obj);
          return interpreter.nativeToPseudo(Object.values(obj));
        });
      })
    );
  }) as any;
  int.REGEXP_MODE = 1; // unsafe but fast
  int._code = code;
  return { int, runAgain };
}

function run(p: { int: any; runAgain: { runAgain: any } }, callback: (res: any) => void): void {
  p.runAgain.runAgain = () => {
    run(p, callback);
  };

  const int = p.int;
  int.stacky = int.stacky || [];
  while (!int.paused_ && int.step()) {
    const node = int.stateStack[int.stateStack.length - 1].node;
    int.stacky.push({ start: node.start, line: findLine(int._code, node.start), type: node.type });
  }

  if (p.int.value !== undefined) return callback(p.int.pseudoToNative(p.int.value));
  // some async stuff should be started
}

export function runAsync(p: { int: any; runAgain: { runAgain: any } }): Promise<any> {
  return new Promise((resolve) => {
    run(p, resolve);
  });
}

function findLine(str: string, idx: number) {
  const first = str.substring(0, idx);
  const last = str.substring(idx);

  const firstNewLine = first.lastIndexOf('\n');

  let secondNewLine = last.indexOf('\n');

  if (secondNewLine == -1) {
    secondNewLine = last.length;
  }

  return str.substring(firstNewLine + 1, idx + secondNewLine);
}
