


type Shape   = number[]
type Strides = number[]
type Data    = number[]
type Tensor  = [ Shape, Strides, Data ]

const shapeReducer = (acc : number, d : number) => acc * d;

const shapeDistance = (shape : Shape, index : number) : number => {
    return shape.slice(0, index).reduce(shapeReducer, 1);
}

const calculateStrides = (shape : Shape, length : number) : number[] => {
    let strides : number[] = shape.map((dim, i) => {
        return shapeDistance(shape, i) * dim
    });
    return strides;
}

function makeTensor (shape : Shape, initial : number) : Tensor {
    if (shape.length == 1)
        return [ shape, [ shape[0] ], Array(shape[0]).fill(initial) ];

    let size    = shape.reduce(shapeReducer, 1);
    let strides = calculateStrides(shape, size);
    return [
        shape,
        strides,
        Array(size).fill(initial)
    ];
}


function drawTensor (tensor : Tensor, dimension : number = 1) : void {
    let shape   = tensor[0];
    let strides = tensor[1];
    let data    = tensor[2];
    let stride  = strides.at(strides.length - dimension);
    let to_draw = strides.toReversed().slice(0, dimension - 1);

    let out = []

    for (let i = 0; i < data.length; i += stride ) {
        out.push([
            ...to_draw.map((step) => {
                if (i == 0)                      return '╭─';
                if ((i + stride) >= data.length) return '╰─';
                return (i % step) == 0
                    ? '╭─'
                    : ((i + stride) % step) ? '│ ' : '╰─'
            }),
            `[${data.slice(i, i + stride).join(' ')}]`,
        ].join(''))
    }

    console.log(out.join('\n'));
}

let t = makeTensor([ 2, 2, 2, 2, 2, 2 ], 0);

console.log(t);
let dim = 1;
while (dim < 7) {
    console.log(`${dim}D`);
    drawTensor(t, dim++);
}
