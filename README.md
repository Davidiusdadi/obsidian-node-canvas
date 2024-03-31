# obsidian-node-canvas

This is what this is about:

![](./examples/tutorial/tutorial.png)


> To be sure to only see what was created **during the hackaton** see [branch: during-hackathon](https://github.com/Davidiusdadi/obsidian-node-canvas/tree/during-hackathon). Right now  [master](https://github.com/Davidiusdadi/obsidian-node-canvas/tree/master)-branch and [during-hackathon](https://github.com/Davidiusdadi/obsidian-node-canvas/tree/during-hackathon)-branch should be almost identical.

**Obsidan-Node-Canvas** is a `javascript`-based workflow/scripting engine build on top of [obsidian](https://obsidian.md/)  (the popular and powerful journaling, knowledge bases, and project management tool ) - and specifically https://obsidian.md/canvas.

Using Obsidan-Node-Canvas requires at least basic understanding `javascript`-programming. 

You could use it to automate things in your obsidian-vault - but the main obsidian connection is that obsidian acts as a frontend - what you build is up to you. 

**Obsidan-Node-Canvas** makes it possible to:

- ✅ visually _compose_ "function"-blocks (nodes on a canvas) and **execute** them
- intuitively combine:
  - ✅ the powers of LLMs (integration)
  - ✅ the powers of browser automation (e.g. [Puppeteer](https://pptr.dev/))
  - ✅ the powers of REST-APIs and the [npm-ecosystem](https://docs.npmjs.com/about-npm)
- utilize custom state-propagation ➡️, flow-splitting, flow-merging 🔀 and aggregation to express you use-cases visually (see features / examples)
- 🔨 integrate and automate within you obsidian vault
- 🔨 visually _**compose**_ reusable snippets and canvases
- [ ] many more things are planned (see [section: plans](#plans))


| Stage     | Emoji |
|-----------|-------|
| Planned   | ☐     |
| Prototyped| 🔨    |
| Done      | ✅    |


## Conception

**Obsidan-Node-Canvas** has been _**conceived**_ 💥 and _**prototyped**_ 🚀 during the **[Code 2 Community - The Y Berlin x ICP](https://lu.ma/zwblit5f) hackathon**.

This project has been submitted [here](https://dacade.org/communities/icp/challenges/b35bd8af-51d3-437a-af13-4e649529c7e5/submissions/5605d208-bb84-4551-9697-e89f75901ce0).


## Engine Features / Mechanics

tutorials are planned - for now look at the canvases in the [examples folder](./examples).

Here a rough overview:

### general behaviour 

- only one node is active at a time
- the first code block of each node will be executed
- execution starts at a with just the content: 'start'
- there are nodes that do not use code-blocks but special syntax (see below)
- only directed arrows matter as of now
- currently all invocations are stored until the canvas complete
  - aka. circular constructs will leak memory 
    - this will be fixed when aggregations get an update
- these are the special variables
  - `input` - can be anyting
  - `state` - can be anything - is cloned whenever it passed through an arrow
  - `this` - is persistant during a node's invocations
    - holds special `join` object used for flow control (see below)
  - `ctx` 
    - allows you to create global state
    - holds special variables / function:
      - `emit(label, value)` function - to pass `state` and `input`-value to a node behind and edge with a given label
        - emits are scheduled aka put on the backlog from which the next invocation is pulled by the engine  
  - you can normally 
    - use nodejs globals - e.g. console.log
    - you can import modules via `import` 
- flow handling
  - splitting flow is done by extruding multiple outgoing arrows 
  - for more see further below

### node types

- start - marks the start
- code `js`
- code `ts`
  - transpiled to js
- code `yaml`
  - "write file" (specific format required)
    - supports nunjucks templating
  - "prompt gpt" (specific format required)
    - supports nunjucks templating
- magic fist word node:
  - `decide` promptes gpt-3 (will be reworked soon)
- _identity_ - anything that cant be parsed yet is not specifically wrong (e.g. bad js syntax) will be treated as and identity function `(input) => input`
  - an empty node will also be and identity node
### flow control

**inner** is inner join on by a specific variable name:
```ts
const list = this.join.inner.input('name').list()
const merged = this.join.inner.input('name').merge()
```

**aggregate** will wait for all ancestors to have completed before returning
```ts

const list = this.join.aggregate.list()
const merged = this.join.aggregate.merge()
```
- currently if you really try you should be able to produce a deadlock...
  - only if there are 2 aggregates waiting for wach other

More precise flow control is planned.


## how to run

> Warning: install run at your own risk. Do not execute `.canvas` that you do not understand.

- clone this repo
- be sure you have a recent `node` version installed. I used v20.10.0
- install via [yarn](https://yarnpkg.com/) 

- create a `.env` file
  - containing `OPENAI_API_KEY=<YOURKEYHERE>`
  - this is needed as the tutorial.canvas uses LLM-nodes

- then:
```bash
# from the checkout root call:

yarn install # install dependencies
yarn dev --vault examples --canvas tutorial/tutorial.canvas
```

Off you go with your own canvas 🕊️

Wanna collaborate / contribute / follow the development then join the [telegram](https://t.me/+ALF9UwRxAwIzZDli)

### compatibility

Depending on you specific package dependencies you can also run https://bun.sh/ but that would bring some compatibility issues with specific  e.g. `jsdom` which you then would not be able to use in canvases. 

OS support:
- I tested only on Ubuntu 20
- Mac should work as well
- windows might work - in case of trouble use WSL
    

## plans

features and improvements in no particular order:

- slightly rework special scope variables (aka stabelize api)
  - `ctx`, `state`, `this`
- documentation
    - make a youtube tutorial
- node mechanics
  - allow writing directly to file via `|` and `>` edge-labls
  - allows `md`-files _referencing_ for **resuable nodes** 
  - allow _referencing_ entire `.canvas` files 
  - add custom join / aggregation nodes
  - allow aggregation in presence of circular flow constellation 
    - via aggregation-start node...
  - detect not supported configurations
    - like aggregation-nodes combined with circular nodes dependencies
- add new **special purpose nodes**
  - **LLM** nodes
    - LLM-Tool use node
    - LLM conversational steps
    - allow multi agent interaction
    - **providers**
      - **local** ollama
      - mistral 
      - openai
      - dall-E
  - special web-crawl nodes (via puppeteer)
    - extract selector
    - load page node
    - page interaction node
    - firefox reading view node
  - obsidian specific nodes
    - allow to use dataview / dataviewjs blocks as input
    - allow intuitive updating of markdown
- web technology
  - add http endpoint node
  - support jsx / tsx code blocks
  - allow web-based **visual** introspection `--debug-server`
    - allow node by node stepping
    - allow to inspect internal node state
- publish 
  - as obsidian plugin
  - via npm so that `npx` works
  - allow a library build-target so that a `.chart` can consumed .e.g. as esmodule
- code loading
  - evaluate option to dynamically load via `--unpkg` from https://www.unpkg.com 
  - evaluate [deno](https://deno.com/)
  - document [bun](bun.sh) usage
