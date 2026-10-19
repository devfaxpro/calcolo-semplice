const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../app/src/main/assets/math.js');
const eq=(v,n,d=1n)=>assert.deepEqual(v,C.fraction(n,d));
test('guided recipe 2 : 150 = 6 : x',()=>eq(C.solve(['2','150','6','x'],3).result,450n));
test('all four positions of the unknown',()=>{
  const terms=['2','3','4','6'];
  for(let i=0;i<4;i++){const input=terms.slice();input[i]='x';eq(C.solve(input,i).result,BigInt(terms[i]));}
});
test('commas, signed numbers, rational and rounded results',()=>{
  eq(C.solve(['0,5','1.5','2','x'],3).result,6n);
  eq(C.solve(['-2','3','4','x'],3).result,-6n);
  eq(C.solve(['3','1','1','x'],3).result,1n,3n);
  assert.deepEqual(C.decimal(C.fraction(1n,3n),'it-IT'),{text:'0,333333',approximate:true});
  assert.deepEqual(C.decimal(C.fraction(1n,8n),'it-IT'),{text:'0,125',approximate:false});
});
test('valid zeros and singular proportions',()=>{
  eq(C.solve(['x','2','0','3'],0).result,0n);
  eq(C.solve(['0','2','x','3'],2).result,0n);
  assert.throws(()=>C.solve(['2','0','4','x'],3),/zeroDenominator/);
  assert.throws(()=>C.solve(['x','2','4','0'],0),/zeroDenominator/);
  assert.throws(()=>C.solve(['0','2','0','x'],3),/infinite/);
  assert.throws(()=>C.solve(['0','x','0','2'],1),/infinite/);
  assert.throws(()=>C.solve(['0','2','1','x'],3),/noSolution/);
  assert.throws(()=>C.solve(['0','x','1','2'],1),/noSolution/);
  assert.throws(()=>C.solve(['2','3','0','x'],3),/noSolution/);
});
test('generated solutions satisfy exact cross multiplication',()=>{
  for(let a=-8;a<=8;a++)for(let b=1;b<=5;b++)for(let c=1;c<=3;c++)for(let u=0;u<4;u++){
    const vals=[String(a),String(b),String(c),'7'];vals[u]='x';
    try{const v=C.solve(vals,u).values;const left=C.fraction(v[0].n*v[3].n,v[0].d*v[3].d),right=C.fraction(v[1].n*v[2].n,v[1].d*v[2].d);assert.deepEqual(left,right);}
    catch(e){assert.match(e.message,/noSolution|infinite/);}
  }
});
test('malformed and excessive inputs are rejected',()=>{
  for(const s of ['','Infinity','NaN','1e3','12abc','1,000,000','1.1234567','1000000000'])assert.throws(()=>C.parse(s),/numberError/);
  assert.throws(()=>C.solve(['1','2','3','x'],4),/numberError/);
});
test('discount cents, boundaries and half-cent rounding',()=>{
  for(const [a,p,s,t] of [['100','20',2000n,8000n],['19,99','15',300n,1699n],['0.05','10',1n,4n],['123.45','0',0n,12345n],['123.45','100',12345n,0n],['0','20',0n,0n]]){
    const r=C.discount(a,p);assert.equal(r.saving,s);assert.equal(r.total,t);assert.equal(r.total+r.saving,r.cents);
  }
  assert.throws(()=>C.discount('12','101'),/percentError/);
  assert.throws(()=>C.discount('-1','20'),/amountError/);
  assert.throws(()=>C.discount('12.123','20'),/amountError/);
});
test('all forty languages provide every UI string and a valid locale',()=>{
  global.window={};require('../app/src/main/assets/strings.js');require('../app/src/main/assets/extra-strings.js');
  assert.equal(Object.keys(window.I18N).length,40);
  assert.equal(window.LANGUAGES.length,40);
  assert.deepEqual(Object.keys(window.I18N).sort(),window.LANGUAGES.map(l=>l.code).sort());
  for(const dict of Object.values(window.I18N)){assert.deepEqual(Object.keys(dict),Object.keys(window.I18N.it));for(const value of Object.values(dict))assert.ok(typeof value==='string'&&value.length>0);}
  const fs=require('node:fs'),path=require('node:path');
  const html=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/index.html'),'utf8');
  const required=Array.from(html.matchAll(/data-(?:t|label)="([^"]+)"/g),m=>m[1]);
  for(const dict of Object.values(window.I18N)){
    for(const key of required)assert.ok(dict[key],key);
    assert.equal(Intl.NumberFormat.supportedLocalesOf(dict.region).length,1,dict.region);
  }
  const options=Array.from(html.match(/<select id="language"[^>]*>(.*?)<\/select>/s)[1].matchAll(/value="([^"]+)">([^<]+)<\/option>/g),m=>({code:m[1],name:m[2]}));
  assert.deepEqual(options,window.LANGUAGES.map(({code,name})=>({code,name})));
  const collator=new Intl.Collator('it',{sensitivity:'base'});
  for(let i=1;i<options.length;i++)assert.ok(collator.compare(options[i-1].name,options[i].name)<0);
  assert.deepEqual(window.LANGUAGES.filter(l=>l.dir==='rtl').map(l=>l.code).sort(),['ar','fa','he','ur']);
});

test('localized decimal symbols and digits round-trip in all 40 locales',()=>{
  for(const dict of Object.values(window.I18N)){
    const formatter=new Intl.NumberFormat(dict.region,{useGrouping:false,maximumFractionDigits:6});
    const input=formatter.format(12.5);
    eq(C.parse(input),25n,2n);
    eq(C.evaluate(input+'+'+formatter.format(0.5)),13n);
    assert.equal(C.discount(formatter.format(100),formatter.format(25)).total,7500n);
    assert.equal(C.decimal(C.fraction(25n,2n),dict.region).text,input);
    eq(C.solve([formatter.format(2),formatter.format(3),formatter.format(8),'x'],3).result,12n);
  }
});

test('native keyboard digits, bidi marks and negative results are accepted',()=>{
  for(const input of ['١٢٫٥','۱۲٫۵','१२.५','১২.৫','๑๒.๕','１２.５','\u061c١٢٫٥','\u200e۱۲٫۵\u200f'])eq(C.parse(input),25n,2n);
  for(const input of ['−١٢٫٥','-۱۲٫۵','−१२.५','-১২.৫'])eq(C.parse(input),-25n,2n);
  eq(C.evaluate('١٢٫٥×٢'),25n);eq(C.evaluate('۱۲٫۵+۰٫۵'),13n);
  assert.throws(()=>C.parse('١٬٢٣٤'),/numberError/);
  assert.throws(()=>C.evaluate('١÷٠'),/calculatorZero/);
});
test('calculator arithmetic, precedence, grouping and unary signs',()=>{
  for(const [input,n,d=1n] of [['12+8',20n],['10−13',-3n],['7×6',42n],['20÷4',5n],['2+3×4',14n],['(2+3)×4',20n],['10-3-2',5n],['20/2/5',2n],['-2*(-3+1)',4n],['2--3',5n],['.5+2.',5n,2n]])eq(C.evaluate(input),n,d);
});
test('calculator keeps decimals and continued results exact',()=>{
  eq(C.evaluate('0,1+0,2'),3n,10n);
  eq(C.evaluate('(1÷3)×3'),1n);
  eq(C.evaluate('1/1000000000000'),1n,1000000000000n);
  eq(C.evaluate('999999999999999999999999+1'),1000000000000000000000000n);
  assert.deepEqual(C.decimal(C.evaluate('1/3'),'it-IT',10),{text:'0,3333333333',approximate:true});
});
test('calculator rejects malformed input and division by zero',()=>{
  for(const input of ['','()','2+','2(3)','1 2','1,2.3','2**3','(2+3','2+3)','alert(1)','1e3','Infinity'])assert.throws(()=>C.evaluate(input),/expressionError/);
  assert.throws(()=>C.evaluate('1/(3-3)'),/calculatorZero/);
  assert.throws(()=>C.evaluate('1'.repeat(121)),/expressionLimit/);
  assert.throws(()=>C.evaluate('0.1234567890123'),/expressionLimit/);
  assert.throws(()=>C.evaluate('('.repeat(33)+'1'+')'.repeat(33)),/expressionLimit/);
});
