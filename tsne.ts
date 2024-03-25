import axios from "axios"
import TSNE from 'tsne-js';
import {any} from "zod"

const ctx :{
    data: any
    embeddings: any
} = {}

const url = "https://lionfish-app-a8os7.ondigitalocean.app/places?city=germany&vector=1"
const {data}= await axios.get(url, {
    headers: {
        "Accept-Encoding": ''

    }
})

ctx.data = data
ctx.embeddings =  data.map(e => e.vector.embedding)




let model = new TSNE({
    dim: 2,
    perplexity: 30.0,
    earlyExaggeration: 4.0,
    learningRate: 100.0,
    nIter: 1000,
    metric: 'euclidean'

});



model.init({

    data: ctx.embeddings,

    type: 'dense'

});

let [error, iter] = model.run();

// rerun without re-calculating pairwise distances, etc.

//let [error, iter] = model.rerun();

// `output` is unpacked ndarray (regular nested javascript array)

let output = model.getOutput();

// `outputScaled` is `output` scaled to a range of [-1, 1]

let outputScaled = model.getOutputScaled();


console.log('outputScaled', outputScaled, data.length)