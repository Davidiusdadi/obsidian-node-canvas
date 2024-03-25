https://crawlee.dev/

https://playwright.dev/


https://js.langchain.com/docs/integrations/document_transformers/html-to-text
https://js.langchain.com/docs/integrations/document_transformers/mozilla_readability


node <(node_modules/.bin/esbuild runner.ts --bundle --loader:.ts=ts --platform=node) --vault /home/david/prv/code/hdpattern/vault --canvas main/other/llm.canvas



node_modules/.bin/esbuild runner.ts --bundle --loader:.ts=ts --platform=node --outfile=build/out.js
node build/out.js --vault /home/david/prv/code/hdpattern/vault --canvas main/other/llm.canvas


node_modules/.bin/esbuild runner.ts --bundle --loader:.ts=ts --platform=node --outfile=build/out.js && node build/out.js --vault /home/david/prv/code/hdpattern/vault --canvas main/other/llm.canvas