(function(){
  'use strict';
  const $=id=>document.getElementById(id), C=window.Calc, dictionaries=window.I18N;
  const historyKey='calcolo-semplice.history.v1', languageKey='discount-language',themeKey='calcolo-semplice.theme.v1';
  let language='it',page='calculator',mode='guided',unknown=3,known=['','','',''];
  let currentCalculator=null,currentDiscount=null,currentProportion=null,lastSaved=true,history=[];
  const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  function t(key){return dictionaries[language][key]||dictionaries.it[key]||key;}
  function number(value){return C.decimal(value,t('region'));}
  function fmt(value){return number(value).text;}
  function money(cents){return new Intl.NumberFormat(t('region'),{style:'currency',currency:'EUR'}).format(Number(cents)/100);}
  function validEntry(e){
    try{
      if(!e||!['calculator','discount','proportion'].includes(e.type)||typeof e.id!=='string'||e.id.length>80||!Number.isFinite(e.time)||e.time<0||!Number.isFinite(new Date(e.time).getTime()))return false;
      if(e.type==='calculator'){C.evaluate(e.expression);}
      else if(e.type==='discount'){if(typeof e.amount!=='string'||typeof e.percent!=='string'||e.amount.length>20||e.percent.length>20)return false;C.discount(e.amount,e.percent);}
      else {if(!['guided','formula'].includes(e.mode)||!Array.isArray(e.values)||e.values.length!==4||e.values.some(v=>typeof v!=='string'||v.length>20))return false;C.solve(e.values,e.unknown);}
      return true;
    }catch(_){return false;}
  }
  try{const parsed=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(parsed))history=parsed.filter(validEntry).slice(0,200);const pref=localStorage.getItem(languageKey);if(pref&&own(dictionaries,pref))language=pref;}catch(_){}
  function setTheme(value){
    const theme=value==='pink'?'pink':'blue';
    document.documentElement.dataset.theme=theme;$('theme').value=theme;
    document.querySelector('meta[name="theme-color"]').content=theme==='pink'?'#fff2f7':'#f1f6ff';
    try{localStorage.setItem(themeKey,theme);}catch(_){}
  }
  let savedTheme='blue';try{savedTheme=localStorage.getItem(themeKey)||'blue';}catch(_){}
  setTheme(savedTheme);
  $('theme').addEventListener('change',event=>setTheme(event.target.value));
  function persist(){try{localStorage.setItem(historyKey,JSON.stringify(history));return true;}catch(_){return false;}}
  function save(entry){
    const data=Object.assign({},entry,{id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),time:Date.now()});
    history.unshift(data);history=history.slice(0,200);lastSaved=persist();$('history-count').textContent=history.length;
  }
  function setError(id,key){$(id).hidden=!key;$(id).textContent=key?t(key):'';$(id).dataset.error=key||'';}
  function savedLabel(id){$(id).textContent=t(lastSaved?'saved':'storageError');$(id).classList.toggle('warning',!lastSaved);}
  function drawCalculator(){
    $('calculator-result').hidden=!currentCalculator;if(!currentCalculator)return;
    const value=C.evaluate(currentCalculator.expression),result=C.decimal(value,t('region'),10);
    $('calculator-total').textContent=(result.approximate?'≈ ':'= ')+result.text;
    $('calculator-exact').hidden=!result.approximate;$('calculator-exact').textContent=t('exact')+': '+value.n+' / '+value.d;
    $('calculator-approx').hidden=!result.approximate;savedLabel('calculator-saved');
  }
  function clearCalculatorResult(){currentCalculator=null;drawCalculator();setError('calculator-error','');}
  function calculatorKey(key){
    const input=$('expression');
    if(key==='clear'){input.value='';clearCalculatorResult();return;}
    if(currentCalculator&&key!=='backspace'){
      input.value=['+','−','×','÷'].includes(key)?'('+currentCalculator.expression+')':'';
      input.setSelectionRange(input.value.length,input.value.length);
    }
    clearCalculatorResult();
    let start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;
    if(key==='backspace'){if(start===end)start=Math.max(0,start-1);key='';}
    else if(key==='('&&/[\d)]$/.test(C.normalizeInput(input.value.slice(0,start)))){key='×(';}
    else if(C.normalizeInput(key)==='.'&&(start===0||/[+−×÷(\-*/]$/.test(input.value.slice(0,start)))){key='0'+key;}
    const next=input.value.slice(0,start)+key+input.value.slice(end);
    if(next.length>120){setError('calculator-error','expressionLimit');return;}
    input.value=next;input.setSelectionRange(start+key.length,start+key.length);
  }
  function drawDiscount(){
    $('discount-result').hidden=!currentDiscount;if(!currentDiscount)return;
    const r=C.discount(currentDiscount.amount,currentDiscount.percent);
    $('discount-total').textContent=money(r.total);$('discount-saving').textContent=money(r.saving);
    $('discount-math').textContent=money(r.cents)+' − '+money(r.saving)+' = '+money(r.total);savedLabel('discount-saved');
  }
  function drawProportion(){
    $('proportion-result').hidden=!currentProportion;if(!currentProportion)return;
    const r=C.solve(currentProportion.values,currentProportion.unknown);const n=number(r.result);
    $('proportion-total').textContent='x '+(n.approximate?'≈':'=')+' '+n.text;
    $('exact').hidden=r.result.d===1n;$('exact').textContent=t('exact')+': '+r.result.n+' / '+r.result.d;
    const [p,q,d]=r.rule;const letters=['A','B','C','D'];
    $('symbolic').textContent='x = ('+letters[p]+' × '+letters[q]+') ÷ '+letters[d];
    $('numeric').textContent='x = ('+fmt(r.values[p])+' × '+fmt(r.values[q])+') ÷ '+fmt(r.values[d])+' '+(n.approximate?'≈':'=')+' '+n.text;
    const equation=r.values.map(v=>fmt(v));$('completed').textContent=equation[0]+' : '+equation[1]+(n.approximate?' ≈ ':' = ')+equation[2]+' : '+equation[3];
    $('approx').hidden=!n.approximate;savedLabel('proportion-saved');
  }
  function setPage(value){page=value;$('calculator-page').hidden=page!=='calculator';$('discount-page').hidden=page!=='discount';$('proportion-page').hidden=page!=='proportion';document.querySelectorAll('[data-page]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.page===page)));}
  function setMode(value){mode=value;$('guided-fields').hidden=mode!=='guided';$('formula-fields').hidden=mode!=='formula';document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===mode)));currentProportion=null;drawProportion();setError('proportion-error','');}
  function updateTerms(){['a','b','c','d'].forEach((letter,i)=>{const field=$('term-'+letter);field.value=i===unknown?'x':known[i];field.readOnly=i===unknown;field.tabIndex=i===unknown?-1:0;});$('unknown').value=unknown;}
  function drawHistory(){
    const list=$('history-list');list.replaceChildren();$('history-count').textContent=history.length;$('history-empty').hidden=!!history.length;$('history-clear').hidden=!history.length;
    history.forEach(entry=>{
      const card=document.createElement('article');card.className='history-item';
      const meta=document.createElement('div');meta.className='history-meta';
      const type=document.createElement('span');type.className='history-type';type.textContent=entry.type==='calculator'?t('calculator'):entry.type==='discount'?t('discountTab'):t('proportions')+' · '+t(entry.mode);
      const date=document.createElement('time');date.dateTime=new Date(entry.time).toISOString();date.textContent=new Intl.DateTimeFormat(t('region'),{dateStyle:'short',timeStyle:'short'}).format(entry.time);meta.append(type,date);
      const result=document.createElement('div');result.className='history-result';const details=document.createElement('p');details.className='math small';
      if(entry.type==='calculator'){const r=C.decimal(C.evaluate(entry.expression),t('region'),10);result.textContent=(r.approximate?'≈ ':'= ')+r.text;result.classList.add('expression-math');details.classList.add('expression-math');details.textContent=entry.expression;}
      else if(entry.type==='discount'){const r=C.discount(entry.amount,entry.percent);result.textContent=t('pay')+': '+money(r.total);details.textContent=money(r.cents)+' − '+fmt(C.parse(entry.percent,2))+'% → '+money(r.total)+' · '+t('save')+' '+money(r.saving);}
      else{const r=C.solve(entry.values,entry.unknown);const n=number(r.result);result.textContent='x '+(n.approximate?'≈':'=')+' '+n.text;result.classList.add('expression-math');details.classList.add('expression-math');const a=entry.values.map((v,i)=>i===entry.unknown?'x':fmt(C.parse(v)));details.textContent=a[0]+' : '+a[1]+' = '+a[2]+' : '+a[3];}
      const open=document.createElement('button');open.type='button';open.className='text-button';open.textContent=t('reopen');open.addEventListener('click',()=>reopen(entry));card.append(meta,result,details,open);list.append(card);
    });
    $('storage-message').hidden=lastSaved;$('storage-message').textContent=t('storageError');
  }
  function openHistory(){drawHistory();$('tools-view').hidden=true;$('history-view').hidden=false;window.scrollTo(0,0);$('history-back').focus();}
  function closeHistory(){ $('history-view').hidden=true;$('tools-view').hidden=false;$('history-open').focus(); }
  function reopen(entry){
    closeHistory();setPage(entry.type);setError('calculator-error','');setError('discount-error','');setError('proportion-error','');
    if(entry.type==='calculator'){$('expression').value=entry.expression;$('expression').setSelectionRange(entry.expression.length,entry.expression.length);currentCalculator=entry;drawCalculator();}
    else if(entry.type==='discount'){$('amount').value=entry.amount;$('percent').value=entry.percent;currentDiscount=entry;drawDiscount();}
    else{setMode(entry.mode);unknown=entry.unknown;known=entry.values.map((v,i)=>i===unknown?'':v);updateTerms();if(mode==='guided'){['a','b','c'].forEach((v,i)=>$('guide-'+v).value=entry.values[i]);}currentProportion=entry;drawProportion();}
    window.scrollTo(0,0);
  }
  function setLanguage(value){
    language=own(dictionaries,value)?value:'it';document.documentElement.lang=language;document.title=t('appName');$('language').value=language;$('language').setAttribute('aria-label',t('language'));$('tools-tabs').setAttribute('aria-label',t('appName'));
    const direction=window.LANGUAGES.find(entry=>entry.code===language).dir;
    document.documentElement.dir=direction;$('history-back').firstChild.textContent=direction==='rtl'?'→ ':'← ';
    document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
    document.querySelectorAll('[data-label]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.label)));
    const decimalSeparator=new Intl.NumberFormat(t('region')).formatToParts(1.1).find(p=>p.type==='decimal').value;
    $('decimal-key').textContent=decimalSeparator;$('decimal-key').dataset.key=decimalSeparator;
    $('amount').placeholder=new Intl.NumberFormat(t('region'),{minimumFractionDigits:2,useGrouping:false}).format(100);
    ['calculator-error','discount-error','proportion-error'].forEach(id=>{if($(id).dataset.error)setError(id,$(id).dataset.error);});
    try{localStorage.setItem(languageKey,language);}catch(_){}
    drawCalculator();drawDiscount();drawProportion();drawHistory();
  }
  $('calculator-form').addEventListener('submit',event=>{
    event.preventDefault();const data={type:'calculator',expression:$('expression').value.trim()};
    try{C.evaluate(data.expression);setError('calculator-error','');currentCalculator=data;save(data);drawCalculator();document.activeElement.blur();}
    catch(error){currentCalculator=null;drawCalculator();setError('calculator-error',error.message);}
  });
  document.querySelectorAll('[data-key]').forEach(button=>button.addEventListener('click',()=>calculatorKey(button.dataset.key)));
  $('expression').addEventListener('input',clearCalculatorResult);
  $('expression').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();calculatorKey('clear');}});
  $('discount-form').addEventListener('submit',event=>{
    event.preventDefault();const data={type:'discount',amount:$('amount').value.trim(),percent:$('percent').value.trim()};
    try{C.discount(data.amount,data.percent);setError('discount-error','');currentDiscount=data;save(data);drawDiscount();document.activeElement.blur();}
    catch(error){currentDiscount=null;drawDiscount();setError('discount-error',error.message);$(error.message==='amountError'?'amount':'percent').focus();}
  });
  $('proportion-form').addEventListener('submit',event=>{
    event.preventDefault();const values=mode==='guided'?[$('guide-a').value,$('guide-b').value,$('guide-c').value,'x']:['a','b','c','d'].map(l=>$('term-'+l).value);
    const data={type:'proportion',mode,unknown:mode==='guided'?3:unknown,values:values.map(v=>v.trim())};
    try{if(mode==='guided'&&values.slice(0,3).some(v=>C.parse(v).n<=0n))throw Error('guidePositive');C.solve(data.values,data.unknown);setError('proportion-error','');currentProportion=data;save(data);drawProportion();document.activeElement.blur();}
    catch(error){currentProportion=null;drawProportion();setError('proportion-error',error.message);}
  });
  ['amount','percent'].forEach(id=>$(id).addEventListener('input',()=>{currentDiscount=null;drawDiscount();setError('discount-error','');}));
  document.querySelectorAll('#proportion-form input').forEach(input=>input.addEventListener('input',()=>{currentProportion=null;drawProportion();setError('proportion-error','');if(input.id.startsWith('term-'))known['abcd'.indexOf(input.id.slice(-1))]=input.value;}));
  $('unknown').addEventListener('change',event=>{unknown=Number(event.target.value);updateTerms();currentProportion=null;drawProportion();setError('proportion-error','');});
  $('example').addEventListener('click',()=>{$('guide-a').value='2';$('guide-b').value='150';$('guide-c').value='6';currentProportion=null;drawProportion();setError('proportion-error','');});
  document.querySelectorAll('[data-page]').forEach(el=>el.addEventListener('click',()=>setPage(el.dataset.page)));
  document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>setMode(el.dataset.mode)));
  $('language').addEventListener('change',e=>setLanguage(e.target.value));$('history-open').addEventListener('click',openHistory);$('history-back').addEventListener('click',closeHistory);
  $('history-clear').addEventListener('click',()=>$('clear-dialog').showModal());$('clear-cancel').addEventListener('click',()=>$('clear-dialog').close());
  $('clear-confirm').addEventListener('click',()=>{history=[];lastSaved=persist();$('clear-dialog').close();drawHistory();});
  window.handleAndroidBack=function(){if($('clear-dialog').open){$('clear-dialog').close();return true;}if(!$('history-view').hidden){closeHistory();return true;}return false;};
  updateTerms();setLanguage(language);
})();
