# ✨ justeval: Cloudflare Workers javascript evaluator

Execute custom JS code taken from incoming HTTP request on Cloudflare workers infrastructure.

## Motivation

Sometimes you just need to dynamically eval some script without all the mess related to compiling/deploying your code.  
Developers usually use `eval` command in Javascript, but it is [not supported](https://developers.cloudflare.com/workers/runtime-apis/web-standards#javascript-standards) in Cloudflare Workers environment for security reasons.  
Use cases: dynamic config generation, programming school tests, minor data customizations, some devops hacking, lightweight "lambdas"... feel free to suggest in PR why YOU are missing `eval` on Cloudflare :)

## Returning `eval` back to Cloudflare

Building custom eval means interpreting JS code inside own custom VM (written in [any supported language](https://developers.cloudflare.com/workers/platform/languages)).
Challenge: Cloudflare Workers system has limitation of 1MB code per Worker and VM code should be put there along with any other code important for particular project/case.
Simpler language may be used as scripting language, but JS is preferred because it's one of most popular languages.

So I'm thrilled to confirm that my research + [ES2015 compiler](https://github.com/bublejs/buble) + [JS interpreter](https://github.com/NeilFraser/JS-Interpreter) + some adjustments are able to achieve our goal and evaluate custom JS quite well 🎉 🎉 🎉

## Is it safe?

Author of JS-Interpreter is [telling](https://neil.fraser.name/software/JS-Interpreter/docs.html) us:

> A common use-case of the JS-Interpreter is to sandbox potentially hostile code. The interpreter is secure by default: it does not use blacklists to prevent dangerous actions, instead it creates its own virtual machine with no external APIs except as provided by the developer.

There are still edge-cases like infinite loops handling ... TBD.

## Technical details

[JS interpreter](https://github.com/NeilFraser/JS-Interpreter) project supports old ES5 and so we need ES6+ compiler (like Babel but 1MB final Worker code size friendly) to be able to use `let`, lambdas and other coolness of modern JS.

Few methods were added as "plugins" into interpreter to ensure more complete ES6+ support.
These include `fetchSync` method to perform fetch-like HTTP requests inside the custom code.

`tomlParse` and `json5Parse` were added to the JS VM API to showcase adding functionality which is not that easy to put inside the VM.

60 seconds TTL for KV storage is used to not re-evaluate scripts with unchanged incoming data.

JS-Interpreter is 200x slower comparing to native JS code according to author site

> The interpreter is not particularly efficient. It currently runs about 200 times slower than native JavaScript

Buble and JS-Interpreter were put as compiled JS inside the source tree to decrease final code bundle size.

## Deploying and testing

Create KV store by running `wrangler kv:namespace create KV`, then put the ID inside wrangler.toml and run `wrangler deploy`.
Put you domain name inside `test.sh` and then just `bash test.sh` to send custom request to your Worker and get some result.

## Request

```
method: POST
url: https://<your worker domain>/fn

headers:
- 'Content-Type: application/json; charset=utf-8'

body:
{
    "code": "((incoming, api) => { ... })",
    "data": {
        "key": "somevalue",
        "key2": [1,2,3]
    }
}
```

See `test.sh` for the demo

## Development

Nothing special for this project, don't forget to `npm install` everything.

## TODOs

- stack traces (confirmed: possible to implement)
- additional security checks
- flexible memoization
- use `buble` from npm and not struggle from significant worker.js bundle size increase.
- use `js-interpreter` from npm
- more complete ES6 support
- execution limits and permissions system to control the script depending on level of trust

## License

MIT
