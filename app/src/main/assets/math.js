(function(root) {
  'use strict';
  function normalizeInput(value) {
    // Keep thousands separators invalid; accept decimal symbols and digits from supported keyboards.
    return String(value).replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'')
      .replace(/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\u09e6-\u09ef\u0e50-\u0e59\uff10-\uff19]/g,char=>{
        const point=char.charCodeAt(0);
        const base=[0x660,0x6f0,0x966,0x9e6,0xe50,0xff10].find(start=>point>=start&&point<=start+9);
        return String(point-base);
      }).replace(/[\u066b\u060c,]/g,'.').replace(/\u2212/g,'-');
  }
  function gcd(a,b) { a=a<0n?-a:a;b=b<0n?-b:b;while(b){const t=b;b=a%b;a=t;}return a||1n; }
  function fraction(n,d=1n) { if(d===0n)throw Error('zeroDenominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g}; }
  function parse(value,places=6,max=999999999n) {
    const s=normalizeInput(value).trim();
    if(!new RegExp('^[+-]?\\d{1,12}(?:\\.\\d{1,'+places+'})?$').test(s))throw Error('numberError');
    const negative=s[0]==='-';const [a,b='']=s.replace(/^[+-]/,'').split('.');const scale=10n**BigInt(b.length);
    const n=(BigInt(a)*scale+BigInt(b||'0'))*(negative?-1n:1n);
    if(n>max*scale||n< -max*scale)throw Error('numberError');return fraction(n,scale);
  }
  const multiply=(a,b)=>fraction(a.n*b.n,a.d*b.d);
  const divide=(a,b)=>fraction(a.n*b.d,a.d*b.n);
  function solve(values,unknown) {
    if(!Number.isInteger(unknown)||unknown<0||unknown>3||values.length!==4)throw Error('numberError');
    const v=values.map((x,i)=>i===unknown?null:parse(x));
    if((unknown!==1&&v[1].n===0n)||(unknown!==3&&v[3].n===0n))throw Error('zeroDenominator');
    const rules=[[1,2,3],[0,3,2],[0,3,1],[1,2,0]];const [p,q,r]=rules[unknown];
    const numerator=multiply(v[p],v[q]);
    if(v[r].n===0n)throw Error(numerator.n===0n?'infinite':'noSolution');
    const result=divide(numerator,v[r]);
    if((unknown===1||unknown===3)&&result.n===0n)throw Error('noSolution');
    v[unknown]=result;return {result,values:v,rule:[p,q,r],unknown};
  }
  function discount(amount,percent) {
    let a,p;
    try{a=parse(amount,2,1000000000n);}catch(_){throw Error('amountError');}
    try{p=parse(percent,2,100n);}catch(_){throw Error('percentError');}
    const cents=a.n*100n/a.d;const rate=p.n*100n/p.d;
    if(cents<0n||cents>99999999999n)throw Error('amountError');
    if(rate<0n||rate>10000n)throw Error('percentError');
    const saving=(cents*rate+5000n)/10000n;
    return {cents,rate,saving,total:cents-saving};
  }
  function decimal(value,region,places=6) {
    const neg=value.n<0n;const n=neg?-value.n:value.n;const scale=10n**BigInt(places);
    let scaled=n*scale/value.d;const rem=n*scale%value.d;
    if(rem*2n>=value.d)scaled++;
    const whole=new Intl.NumberFormat(region,{useGrouping:true,maximumFractionDigits:0}).format(scaled/scale);
    const separator=new Intl.NumberFormat(region).formatToParts(1.1).find(p=>p.type==='decimal').value;
    const digitFormat=new Intl.NumberFormat(region,{useGrouping:false});
    const tail=String(scaled%scale).padStart(places,'0').replace(/0+$/,'').replace(/\d/g,digit=>digitFormat.format(Number(digit)));
    return {text:(neg&&scaled!==0n?'−':'')+whole+(tail?separator+tail:''),approximate:rem!==0n};
  }
  function evaluate(expression) {
    if(typeof expression!=='string'||expression.length>120)throw Error('expressionLimit');
    const source=normalizeInput(expression).replace(/×/g,'*').replace(/÷/g,'/');
    const tokens=[];let offset=0;
    while(offset<source.length){
      if(/\s/.test(source[offset])){offset++;continue;}
      const match=source.slice(offset).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if(match){
        const [whole,tail='']=match[0].split('.');
        if(whole.length>24||tail.length>12)throw Error('expressionLimit');
        tokens.push(fraction(BigInt((whole||'0')+tail),10n**BigInt(tail.length)));offset+=match[0].length;
      }else if('+-*/()'.includes(source[offset])){tokens.push(source[offset++]);}
      else throw Error('expressionError');
    }
    let position=0,depth=0;
    const add=(a,b)=>fraction(a.n*b.d+b.n*a.d,a.d*b.d);
    function primary(){
      const token=tokens[position++];
      if(token==='('){if(++depth>32)throw Error('expressionLimit');const value=sum();if(tokens[position++]!==')')throw Error('expressionError');depth--;return value;}
      if(!token||typeof token!=='object')throw Error('expressionError');return token;
    }
    function unary(){
      if(tokens[position]==='+'){position++;return unary();}
      if(tokens[position]==='-'){position++;const v=unary();return fraction(-v.n,v.d);}
      return primary();
    }
    function product(){
      let value=unary();
      while(tokens[position]==='*'||tokens[position]==='/'){
        const operator=tokens[position++],right=unary();
        if(operator==='/'&&right.n===0n)throw Error('calculatorZero');
        value=operator==='*'?multiply(value,right):divide(value,right);
      }
      return value;
    }
    function sum(){
      let value=product();
      while(tokens[position]==='+'||tokens[position]==='-'){
        const operator=tokens[position++],right=product();
        value=add(value,operator==='+'?right:fraction(-right.n,right.d));
      }
      return value;
    }
    const result=sum();if(position!==tokens.length)throw Error('expressionError');return result;
  }
  const api={fraction,parse,solve,discount,decimal,evaluate,normalizeInput};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Calc=api;
})(typeof window==='undefined'?globalThis:window);
