# obsidian-node-canvas

Use obsidian canvases for coding and automation:

Example 1:

![](./examples/tutorial/read-eval-loop/sly-llm-agent-screenshot.png)

Example 2:

![](./examples/tutorial/tutorial.png)


> To be sure to only see what was created **during the hackaton** see [branch: during-hackathon](https://github.com/Davidiusdadi/obsidian-node-canvas/tree/during-hackathon). Right now  [master](https://github.com/Davidiusdadi/obsidian-node-canvas/tree/master)-branch and [during-hackathon](https://github.com/Davidiusdadi/obsidian-node-canvas/tree/during-hackathon)-branch should be almost identical.

**Obsidian-Node-Canvas** is a `javascript`-based workflow/scripting engine build on top of [obsidian](https://obsidian.md/)  (the popular and powerful journaling, knowledge bases, and project management tool ) - and specifically https://obsidian.md/canvas.

Using Obsidian-Node-Canvas requires at least basic understanding of `javascript` programming. 

You could use it to automate things in your obsidian-vault - but the main obsidian connection is that obsidian acts as a frontend - what you build is up to you. 

**Obsidian-Node-Canvas** makes it possible to:

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

**Obsidian-Node-Canvas** has been _**conceived**_ 💥 and _**prototyped**_ 🚀 during the **[Code 2 Community - The Y Berlin x ICP](https://lu.ma/zwblit5f) hackathon**.

This project has been submitted [here](https://dacade.org/communities/icp/challenges/b35bd8af-51d3-437a-af13-4e649529c7e5/submissions/5605d208-bb84-4551-9697-e89f75901ce0).


## Engine Features / Mechanics

tutorials are planned - for now look at the canvases in the [examples folder](./examples).

Here a rough overview:

### general behaviour 

- only one node is active at a time
- the first code block of each node will be executed
- execution starts at a node with just the content: 'start'
- there are nodes that do not use code-blocks but special syntax (see below)
- only directed arrows matter as of now
- currently all invocations are stored until the canvas complete
  - aka. circular constructs will leak memory 
    - this will be fixed when aggregations get an update
- these are the special variables
  - `input` - can be anything
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
- magic first word node:
  - `decide` prompts gpt-3 (will be reworked soon)
- _identity_ - anything that cant be parsed yet is not specifically wrong (e.g. bad js syntax) will be treated as and identity function `(input) => input`
  - an empty node will also be and identity node


### flow control

- Every node will have `input` and `state` variables defined.
- By default, the `return` value of a previous node will be forwarded as `input` to the next one.
- `state` will always be passed along from node to node - on each handover **being cloned** shallowly. 

> What happens though when a node has more that 1 arrow pointing to it?

In that case each arrow is treated as a separate invocation. 
E.g. with 2 incoming arrows each might be invoked as the code will be executed twice in a row.

This is unless you use **advanced flow control**:

#### aggregation

The most powerful is the function `aggregate`.
When used it will make the node go into a collection mode which means that it 
- waits until everything before it has finished
- and when the last activity before it finishes it will return all collected inputs.
  - either as array: `aggregate().list()`
  - or merged together:  `aggregate().merge()`

for examples see: `zip-and-aggregate.canvas`

- more precise "aggregation"-sections are planned
- Bug: Currently, if you really try you should be able to produce a deadlock if there are 2 aggregates waiting for wach other.

#### zipping

With `zipOnInput` or `zipOnState` will be used to "join" together specific `input`s or `state`s.

```ts
const list = zipOnInput('name').list()
```

If the above node would have more than 2 or 3 in-arrows it would only grab those with identical `input.name` values. Imagine each arrow having a buffer of invocations which still want to be consumed. Whenever a new invocation is coming it will be checked if a new zip-input is ready where all arrows `input.name`s are identical. As soon as a zip-input is ready it will be consumed as `.list()` or `.merge()`.

Analogous there is also `const list = zipOnState('name').list()` and `const list = zipOnState('name').merge()`.

##### zip merge example 1:

![img.png](examples/feature-tour/2-flow-control/images/example-zip-simple-success.png)

##### zip merge example 2:

![img_1.png](examples/feature-tour/2-flow-control/images/example-zip-partial-success.png)

## Canvas Dev Server

The **Canvas Dev Server** is a browser-based viewer for `.canvas` files in your vault.

### Start the viewer

```bash
cd packages/canvas-dev-server
VAULT_PATH=/your/obsidian/vault yarn dev
```

Then open http://localhost:5173/. The **Files** tab lists every `.canvas` file found in the vault. Click any file to render its node graph — no engine required.

### Engine debug mode

For live execution inspection, run the canvas engine with `--server`:

```bash
yarn dev --vault examples --canvas feature-tour/1-arrow-propagation/propagation.canvas --server
```

The dev server connects automatically via WebSocket. When connected:
- `🔌` appears next to the canvas the engine is currently running
- `▶` appears next to the canvas you have open in the viewer (when it differs from the engine canvas)
- **Play** and **Step** buttons appear for stepping through execution frame by frame

---

## how to run

> Warning: install run at your own risk. Do not execute `.canvas` that you do not understand.

### Initial Setup

1. **Clone this repo**
2. **Install Node.js** - Recent version required (tested with v20.10.0, works with v22+)
3. **Install dependencies** via [yarn](https://yarnpkg.com/):

```bash
yarn install
```

> **Note:** You may see a build warning about the `canvas` package (missing `pangocairo` system dependencies). This is harmless and won't affect basic functionality.

4. **(Optional)** Create a `.env` file for LLM features:
   - Only needed if you want to use LLM/GPT nodes
   - Add: `OPENAI_API_KEY=<YOURKEYHERE>`
   - Not required for basic canvas execution

### Running Examples

All examples should be run from the repository root:

#### Core Features (No API Key Required) ✅

```bash
# Basic arrow propagation and data flow
yarn dev --vault examples --canvas feature-tour/1-arrow-propagation/propagation.canvas

# Flow control: aggregation
yarn dev --vault examples --canvas feature-tour/2-flow-control/aggregate.canvas

# Flow control: zip and aggregate
yarn dev --vault examples --canvas feature-tour/2-flow-control/zip-and-aggregate.canvas

# Canvas composition and signals
yarn dev --vault examples --canvas feature-tour/3-canvas-signals/caller.canvas

# Canvas overload patterns
yarn dev --vault examples --canvas feature-tour/4-canvas-overload/caller.canvas
```

#### Advanced Examples (Require OpenAI API Key) 🔑

```bash
# LLM-powered tutorial
yarn dev --vault examples --canvas feature-tour/tutorial.canvas

# Shell automation with LLM
yarn dev --vault examples --canvas feature-tour/shell/bash.canvas
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
