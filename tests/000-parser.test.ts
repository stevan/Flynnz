
import { Bytecode } from '../src/machines/Strand/Bytecode'

const IS_NUMBER   = /^-?[0-9][0-9_]*(\.[0-9]+)?$/;

enum TokenType {
    IDENT  = 'IDENT',
    OPEN   = 'OPEN',
    CLOSE  = 'CLOSE',
    NUMBER = 'NUMBER',
    WORD   = 'WORD',
}

type Token = {
    type   : TokenType,
    source : string,
}

type ASTOp =
    | [ number, string, string ]
    | [ number, string, string, number ]

type AST = {
    name : string,
    body : ASTOp[]
}

function tokenizer (source : string) : Token[] {
    return source.split(/\s+/).filter(x => x).map((src) => {
        switch (true) {
        case src.indexOf(':') == 0: return { type : TokenType.IDENT,  source : src } as Token
        case src == '[':            return { type : TokenType.OPEN,   source : src } as Token
        case src == ']':            return { type : TokenType.CLOSE,  source : src } as Token
        case IS_NUMBER.test(src):   return { type : TokenType.NUMBER, source : src } as Token
        default:                    return { type : TokenType.WORD,   source : src } as Token
        }
    })
}

function parser (tokens : Token[]) : AST {
    let body  : ASTOp[]  = [];
    let jumps : number[] = [];

    let name = tokens.shift();
    if (name == undefined || name.type != TokenType.IDENT) throw new Error('Expected IDENT');

    if (tokens[0] == undefined || tokens[0].type != TokenType.OPEN) throw new Error('Expected [ after IDENT');
    tokens.shift();

    if (tokens.at(-1)?.type != TokenType.CLOSE) throw new Error('Expected ] as last token');
    tokens.pop();

    while (tokens.length > 0) {
        let token = tokens.shift();

        if (token == undefined) throw new Error('Expected token!')

        switch (token.type) {
        case TokenType.OPEN:
            jumps.push(body.length);
            break;
        case TokenType.WORD:
            switch (token.source) {
            case 'PUSH':
                let num = tokens.shift();
                if (num == undefined || num.type != TokenType.NUMBER) throw new Error('Expected NUMBER after PUSH');
                body.push([ body.length, 'SCAN', token.source, Number.parseInt(num.source) ] as ASTOp);
                break;
            case 'GET':
            case 'PUT':
                body.push([ body.length, 'COMM', token.source ] as ASTOp);
                break;
            default:
                body.push([ body.length, 'SCAN', token.source ] as ASTOp);
            }
            break;
        case TokenType.CLOSE:
            let goto = jumps.pop();
            if (goto == undefined) throw new Error('Expected JUMP address')

            if (tokens.length < 2) throw new Error('Expected JUMP and JUMP op, not enough tokens left');

            let jump   = tokens.shift();
            let jumpOp = tokens.shift();

            if (jump   == undefined || jump.type   != TokenType.WORD && jump.source != 'JUMP') throw new Error('Expected a JUMP after ]');
            if (jumpOp == undefined || jumpOp.type != TokenType.WORD) throw new Error('Expected a WORD after JUMP');

            body.push([
                body.length,
                jump.source,
                jumpOp.source,
                goto
            ] as ASTOp)

            break;
        default:
            throw new Error(`Did not recognize TokenType`);
        }
    }

    if (name == undefined) throw new Error('You must specify a name!');

    return {
        name : name.source.slice(1),
        body : body
    } as AST
}

function assembler (ast : AST) : Bytecode {
    return new Bytecode();
}




// let program = new Bytecode(
//     [ COMM,  GET,  ___,  1, true  ],
//     [ COMM,  PUT,  ___,  1, false ],
//     [ SCAN,  DUP,  ___,  1, false ],
//     [ SCAN,  PUSH,   1,  1, false ],
//     [ SCAN,  SUB,  ___,  1, true  ],
//     [ COMM,  PUT,  ___,  1, false ],
//     [ SCAN,  DUP,  ___,  1, false ],
//     [ SCAN,  PUSH,   1,  1, false ],
//     [ SCAN,  EQ,   ___,  1, false ],
//     [ JUMP,  EQZ,  ___, -6, false ],
//     [ HALT,  ___,  ___,  0, false ],
//  );

let code = `
:countdown [
    GET
    PUT
    [
        DUP
        PUSH 1
        SUB
        PUT
        DUP
        PUSH 1
        EQ
    ] JUMP EQZ
]
`;

let tokens = tokenizer(code);
console.log(tokens);

let ast = parser(tokens);
console.log(ast);
