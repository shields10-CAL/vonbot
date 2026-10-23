/** Shared instruction descriptions for editor autocomplete, block toolbox and reference. */
export type InstructionGuide = { op:string; category:string; label:string; description:string; long:string; operand:boolean; defaultArg:string; classic:boolean };
export const INSTRUCTIONS:InstructionGuide[]=[
{op:'INP',category:'Input / Output',label:'read input',description:'Read user input into the accumulator',long:'Pause for the next user-supplied number (0–9999), then load it into the accumulator.',operand:false,defaultArg:'',classic:true},
{op:'OUT',category:'Input / Output',label:'print number',description:'Print the accumulator as a decimal number',long:'Append the current accumulator value as a decimal number followed by a newline.',operand:false,defaultArg:'',classic:true},
{op:'OUTC',category:'Input / Output',label:'print character',description:'Print the accumulator as one ASCII character',long:'Interpret the accumulator as an ASCII code and append its character to the output.',operand:false,defaultArg:'',classic:false},
{op:'LDA',category:'Memory',label:'load from',description:'Copy RAM[address] into the accumulator',long:'Load the four-digit value stored in the specified memory address into the accumulator.',operand:true,defaultArg:'0',classic:true},
{op:'STA',category:'Memory',label:'store at',description:'Copy the accumulator into RAM[address]',long:'Store the accumulator value into the specified memory address without changing the accumulator.',operand:true,defaultArg:'0',classic:true},
{op:'LDI',category:'Memory',label:'load constant',description:'Put literal 0–99 into the accumulator',long:'Load an immediate numerical constant between 0 and 99 into the accumulator.',operand:true,defaultArg:'1',classic:false},
{op:'ADD',category:'Math',label:'add from',description:'Add RAM[address] to the accumulator',long:'Add the contents of a memory address to the accumulator (wrap around at 10000).',operand:true,defaultArg:'0',classic:true},
{op:'SUB',category:'Math',label:'subtract from',description:'Subtract RAM[address] from the accumulator',long:'Subtract the contents of a memory address from the accumulator; set the borrow flag for negative results.',operand:true,defaultArg:'0',classic:true},
{op:'BRA',category:'Logic / Loops',label:'jump to',description:'Jump unconditionally to address',long:'Set the program counter to a specific memory address, without checking a condition.',operand:true,defaultArg:'0',classic:true},
{op:'BRZ',category:'Logic / Loops',label:'if zero jump to',description:'Jump when the accumulator is zero',long:'Branch to the specified memory address only if the accumulator currently equals zero.',operand:true,defaultArg:'0',classic:true},
{op:'BRP',category:'Logic / Loops',label:'if positive jump to',description:'Jump when the borrow flag is clear',long:'Branch if the most recent result was not negative, according to the simulator borrow flag.',operand:true,defaultArg:'0',classic:true},
{op:'RND',category:'Random',label:'random 0–99',description:'Generate pseudorandom 0–99 into the accumulator',long:'Generate a pseudorandom number 0–99. Each new run uses a time-based seed unless a manual seed is selected in Settings.',operand:false,defaultArg:'',classic:false},
{op:'HLT',category:'Basic',label:'stop program',description:'Halt program execution',long:'Stop the CPU. A subsequent Run starts over from the beginning.',operand:false,defaultArg:'',classic:true},
{op:'DAT',category:'Data',label:'data value',description:'Reserve a memory address with data',long:'Store an initial numerical value in RAM rather than an executable instruction.',operand:true,defaultArg:'0',classic:true},
{op:'.ORG',category:'Data',label:'start at',description:'Place subsequent code at address',long:'Assembler directive that moves the address counter forward to a specific memory address.',operand:true,defaultArg:'90',classic:true},
];
export const CATEGORIES=[
 {name:'Basic',color:'#637d9a'},
 {name:'Input / Output',color:'#ad3995'},
 {name:'Math',color:'#316cc3'},
 {name:'Memory',color:'#8050c7'},
 {name:'Logic / Loops',color:'#169361'},
 {name:'Data',color:'#b87525'},
 {name:'Random',color:'#b14e37'},
] as const;
export const instruction = (op:string) => INSTRUCTIONS.find(item=>item.op===op.toUpperCase());
