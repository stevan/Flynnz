

const leftAlignNumber  = (n : number, w : number, c : string = ' ') => n.toString().padEnd(w, c);
const rightAlignNumber = (n : number, w : number, c : string = ' ') => n.toString().padStart(w, c);
