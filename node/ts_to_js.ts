import typescript from 'typescript';
//import * as babel from '@babel/core';
// Example TypeScript code
const tsCode = `import { something } from 'some-module';`;

function transformStaticImportsToDynamic(code: string) {
    const importRegex = /import\s+(.*?)\s+from\s+['"](.+?)['"]/g;
    return code.replace(importRegex, (match, imports, source) => {
        // Assuming 'default' import for simplicity; adjust based on your needs
        let unpack = ''
        if(imports.match(/\{.*\}/) === null) {
            unpack = `${imports} = ${imports}.default || ${imports};`
        }
        return `let ${imports} = await import('${source}'); ${unpack};`;
    });
}



export async function ts_to_js(ts_code: string) {
    const js = transformStaticImportsToDynamic(ts_code)
    const jsCode = typescript.transpile(tsCode, {
        module: typescript.ModuleKind.ESNext // Keep ES module syntax for Babel to process
    });

    //console.log('js_code:', js)
    return transformStaticImportsToDynamic(ts_code)
    // const result = await babel.transformAsync(jsCode, {
    //     plugins: ['@babel/plugin-syntax-dynamic-import'],
    //     // Add any additional Babel configurations here
    // });

    // if(!result || !result.code) {
    //     throw new Error(`Babel transformation failed for: ${ts_code}`);
    // }

    return ts_code
}






// Example usage
