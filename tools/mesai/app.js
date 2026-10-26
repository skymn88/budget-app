/* ===== Mesai aracı =====
   Veri modeli (localStorage 'mesai.v1'):
   cfg:  { type:'daily|weekly|monthly', hours, workdays:[0-6], lunchFrom, lunchTo, lunch, lunchFri }
   days: { 'YYYY-MM-DD': { in:ms, out:ms|null, breaks:[{id,s,e,t:'break|lunch'}], off:bool, override:dakika|null } }
*/
const KEY='mesai.v1';
const DEF={cfg:{type:'daily',hours:8,workdays:[1,2,3,4,5],lunchFrom:'11:30',lunchTo:'14:30',lunch:60,lunchFri:90},days:{}};
const fresh=()=>JSON.parse(JSON.stringify(DEF));
function load(){
  try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days){s.cfg=Object.assign({},DEF.cfg,s.cfg||{});return s}}catch(e){}
  return fresh();
}
let S=load();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Kaydedilemedi')}}

/* ---------- tarih / saat yardımcıları ---------- */
const DN=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const DS=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const MN=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseD=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const addD=(k,n)=>{const d=parseD(k);d.setDate(d.getDate()+n);return dkey(d)};
const todayK=()=>dkey(new Date());
const dow=k=>parseD(k).getDay();
const weekStart=k=>addD(k,-((dow(k)+6)%7));
const weekKeys=k=>{const s=weekStart(k);return Array.from({length:7},(_,i)=>addD(s,i))};
const monthKeys=k=>{const d=parseD(k);const n=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();const p=k.slice(0,8);return Array.from({length:n},(_,i)=>p+pad(i+1))};
const minOf=ts=>Math.floor(ts/60000);
const hm=ts=>{const d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes())};
const tsOf=(k,t)=>{const [h,m]=t.split(':').map(Number);const d=parseD(k);d.setHours(h,m,0,0);return d.getTime()};
const fm=m=>{const s=m<0?'-':'';m=Math.round(Math.abs(m));return s+Math.floor(m/60)+':'+pad(m%60)};
const fdur=m=>m<60?m+' dk':fm(m);
const short=k=>{const d=parseD(k);return d.getDate()+' '+MN[d.getMonth()].slice(0,3)};
const dLabel=k=>{const d=parseD(k);return DS[d.getDay()]+', '+d.getDate()+' '+MN[d.getMonth()].slice(0,3)+' '+d.getFullYear()};
const typeName={daily:'Günlük',weekly:'Haftalık',monthly:'Aylık'};
function periodLabel(t,k){
  if(t==='daily')return dLabel(k);
  if(t==='weekly'){const s=weekStart(k);return short(s)+' – '+short(addD(s,6))}
  const d=parseD(k);return MN[d.getMonth()]+' '+d.getFullYear();
}
/* "7:02" -> 422 dk, "7" -> 420, "7,5" -> 450; boşsa null, geçersizse NaN */
function parseHM(s){
  s=String(s==null?'':s).trim();if(!s)return null;
  if(s.includes(':')){const [h,m]=s.split(':').map(Number);if(isNaN(h)||isNaN(m)||m<0||m>59||h<0)return NaN;return h*60+m}
  const v=parseFloat(s.replace(',','.'));return isNaN(v)||v<0?NaN:Math.round(v*60);
}

/* ---------- hesap kuralları ---------- */
/* brüt süreye (giriş-çıkış arası) göre otomatik kesinti: sınırlar dahil */
function autoCut(g){
  if(g<=240)return 15;   /* 0:00 – 4:00   */
  if(g<=450)return 30;   /* 4:01 – 7:30   */
  if(g<=660)return 60;   /* 7:31 – 11:00  */
  return 90;             /* 11:01 ve üstü */
}
/* öğle arası cezası: aralığın [lunchFrom, lunchTo] içine düşen kısmının, süre hakkı kadarı ücretsiz; geri kalanı ceza */
function lunchPen(k,s,e){
  const dur=minOf(e)-minOf(s);
  const ws=minOf(tsOf(k,S.cfg.lunchFrom)),we=minOf(tsOf(k,S.cfg.lunchTo));
  const ov=Math.max(0,Math.min(minOf(e),we)-Math.max(minOf(s),ws));
  const allow=dow(k)===5?+S.cfg.lunchFri:+S.cfg.lunch;
  return Math.max(0,dur-Math.min(allow,ov));
}
function calcDay(k,d,now){
  now=now||Date.now();
  const r={has:false,gross:0,auto:0,breakPen:0,lunchPen:0,breakMin:0,lunchMin:0,calc:0,net:0,override:null,off:false,open:false,missingOut:false};
  if(!d)return r;
  r.off=!!d.off;r.override=(d.override==null||isNaN(d.override))?null:d.override;
  if(d.in){
    r.has=true;
    let end=d.out;
    if(!end){if(k===todayK()){end=now;r.open=true}else{end=d.in;r.missingOut=true}}
    r.gross=Math.max(0,minOf(end)-minOf(d.in));
    r.auto=r.gross>0?autoCut(r.gross):0;
    (d.breaks||[]).forEach(b=>{
      const e=Math.max(b.e||end,b.s),dur=minOf(e)-minOf(b.s);
      if(b.t==='lunch'){r.lunchMin+=dur;r.lunchPen+=lunchPen(k,b.s,e)}
      else{r.breakMin+=dur;r.breakPen+=dur}
    });
    r.calc=Math.max(0,r.gross-r.auto-r.breakPen-r.lunchPen);
  }
  r.net=r.override!=null?r.override:r.calc;
  if(r.override!=null)r.has=true;
  return r;
}
const calc=(k,now)=>calcDay(k,S.days[k],now);
const dayTarget=k=>{const d=S.days[k];if(d&&d.off)return 0;return S.cfg.workdays.includes(dow(k))?Math.round(S.cfg.hours*60):0};
const keysFor=(t,k)=>t==='daily'?[k]:t==='weekly'?weekKeys(k):monthKeys(k);
function sumKeys(keys){let net=0,tar=0;keys.forEach(x=>{net+=calc(x).net;tar+=dayTarget(x)});return{net,tar}}

/* ---------- durum ---------- */
let view='home',D=todayK(),P=null;
const openBreak=d=>(d.breaks||[]).find(b=>!b.e);
const lunchUsed=(d,exceptId)=>(d.breaks||[]).some(b=>b.t==='lunch'&&b.id!==exceptId);

/* ---------- giriş / çıkış / mola işlemleri ---------- */
function clockIn(){
  const k=todayK();let d=S.days[k];
  if(d&&d.in)return;
  d=S.days[k]=Object.assign(d||{},{in:Date.now(),out:null,breaks:(d&&d.breaks)||[]});
  persist();toast('Giriş kaydedildi · '+hm(d.in));render();
}
function clockOut(){
  const d=S.days[todayK()];if(!d||!d.in||d.out)return;
  ask('Çıkış kaydedilsin mi? ('+hm(Date.now())+')','Evet, çıkış yap',()=>{
    const now=Date.now(),ob=openBreak(d);if(ob)ob.e=now;d.out=now;
    persist();closeSheet();render();toast('Çıkış kaydedildi · '+hm(now));
  },closeSheet);
}
function undoOut(){
  const d=S.days[todayK()];if(!d||!d.out)return;
  ask('Bugünkü çıkış iptal edilip mesaiye devam edilsin mi?','Evet, devam et',()=>{d.out=null;persist();closeSheet();render()},closeSheet);
}
function breakOut(){
  const d=S.days[todayK()];if(!d||!d.in||d.out||openBreak(d))return;
  (d.breaks=d.breaks||[]).push({id:uid(),s:Date.now(),e:null,t:'break'});
  persist();toast('Mola başladı · '+hm(Date.now()));render();
}
function breakBack(t){
  const d=S.days[todayK()];if(!d)return;const b=openBreak(d);if(!b)return;
  if(t==='lunch'&&lunchUsed(d,b.id)){toast('Öğle arası bugün zaten kullanıldı');return}
  b.e=Date.now();b.t=t;persist();toast(t==='lunch'?'Öğle arası kaydedildi':'Mola kaydedildi');render();
}

/* ---------- görünümler ---------- */
function render(){
  document.getElementById('title').textContent={home:'Mesai',brk:'Mola',fix:'Düzeltme',set:'Ayarlar'}[view];
  document.getElementById('nav').innerHTML=[['home','📅','Özet'],['brk','☕','Mola'],['fix','✏️','Düzeltme'],['set','⚙️','Ayarlar']]
    .map(([v,i,t])=>`<button class="${view===v?'on':''}" onclick="go('${v}')"><i>${i}</i>${t}</button>`).join('');
  document.getElementById('main').innerHTML={home:vHome,brk:vBreak,fix:vFix,set:vSet}[view]();
}
const go=v=>{view=v;render();document.getElementById('main').scrollTop=0};
const goD=n=>{D=addD(D,n);render()};
const setD=v=>{if(/^\d{4}-\d{2}-\d{2}$/.test(v)){D=v;render()}};

function rowDay(k,fn){
  const r=calc(k),d=S.days[k],tar=dayTarget(k),future=k>todayK();
  const times=d&&d.in?hm(d.in)+' – '+(d.out?hm(d.out):(r.open?'devam ediyor':'?')):'—';
  const tags=[];
  if(k===todayK())tags.push('bugün');
  if(d&&d.off)tags.push('izinli');
  if(r.override!=null)tags.push('elle');
  if(r.missingOut)tags.push('çıkış eksik');
  const right=(r.has||(tar>0&&!future))?fm(r.net):'·';
  return `<div class="row ${k===D&&fn==='setD'?'sel':''} ${(!r.has&&!tar)?'dim':''}" onclick="${fn}('${k}')"><div><div class="n">${DS[dow(k)]} ${short(k)}</div><div class="sub">${times}${tags.length?' · '+tags.join(' · '):''}</div></div><div class="r"><div style="font-weight:700">${right}</div>${tar>0?`<div class="sub">hedef ${fm(tar)}</div>`:''}</div></div>`;
}

function vHome(){
  const t=S.cfg.type,isT=D===todayK(),d=S.days[D];
  const r=calc(D),keys=keysFor(t,D),sm=sumKeys(keys),rem=sm.tar-sm.net;
  const pct=sm.tar>0?Math.min(100,Math.round(sm.net/sm.tar*100)):(sm.net>0?100:0);
  const working=!!(d&&d.in&&!d.out),done=!!(d&&d.in&&d.out);
  let h=`<div class="dn"><button class="nb" onclick="goD(-1)">‹</button><input type="date" value="${D}" onchange="setD(this.value)"><button class="nb" onclick="goD(1)">›</button></div>`;
  if(!isT)h+=`<div style="text-align:center;margin:-4px 0 12px"><button class="chipbtn" onclick="setD(todayK())">Bugüne dön</button></div>`;
  h+=`<div class="card hero"><small>${typeName[t]} mesai · ${esc(periodLabel(t,D))}</small>
    <div class="big">${fm(sm.net)} <span class="of">/ ${fm(sm.tar)}</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <small>${sm.tar===0?'Bu dönemde çalışma günü yok':rem>0?'Kalan '+fm(rem):rem<0?'Fazla +'+fm(-rem):'Tamamlandı ✓'}</small></div>`;
  if(isT){
    h+=`<div class="two2"><button class="bigbtn in" ${working||done?'disabled':''} onclick="clockIn()">▶ Giriş</button><button class="bigbtn out" ${working?'':'disabled'} onclick="clockOut()">■ Çıkış</button></div>`;
    if(done)h+=`<div style="text-align:center;margin:-4px 0 12px"><button class="chipbtn" onclick="undoOut()">Çıkışı geri al</button></div>`;
  }
  const cut=r.gross>0?`brüt ${fm(r.gross)} aralığı`:'';
  h+=`<h2>${esc(dLabel(D)).toLocaleUpperCase('tr-TR')}${r.off?' · İZİNLİ':''}</h2><div class="card">`;
  if(!r.has)h+=`<div class="empty" style="padding:10px 0">Bu gün için kayıt yok</div>`;
  else{
    h+=`<div class="kv"><span>Giriş</span><b>${d&&d.in?hm(d.in):'—'}</b></div>
    <div class="kv"><span>Çıkış</span><b>${d&&d.out?hm(d.out):(r.open?'devam ediyor':r.missingOut?'<span style="color:var(--warn)">girilmedi</span>':'—')}</b></div>
    <div class="kv"><span>Brüt süre</span><b>${fm(r.gross)}</b></div>
    <div class="kv"><span>Otomatik kesinti${cut?` <small>(${cut})</small>`:''}</span><b class="${r.auto?'exp':''}">${r.auto?'−'+fdur(r.auto):'—'}</b></div>
    <div class="kv"><span>Mola cezası <small>(${fdur(r.breakMin)} mola)</small></span><b class="${r.breakPen?'exp':''}">${r.breakPen?'−'+fdur(r.breakPen):'—'}</b></div>
    <div class="kv"><span>Öğle arası <small>(${r.lunchMin?fdur(r.lunchMin):'yok'})</small></span><b class="${r.lunchPen?'exp':''}">${r.lunchPen?'−'+fdur(r.lunchPen)+' ceza':(r.lunchMin?'ceza yok':'—')}</b></div>`;
    if(r.override!=null)h+=`<div class="kv"><span>Otomatik hesap</span><b>${fm(r.calc)}</b></div><div class="kv"><span>Elle düzeltme</span><b>${fm(r.override)}</b></div>`;
    h+=`<div class="kv total"><span>Net mesai${r.open?' (şu ana kadar)':''}</span><b>${fm(r.net)}</b></div>`;
  }
  h+=`<button class="btn sec" onclick="editDay('${D}')">${r.has?'Bu günü düzenle':'Manuel kayıt ekle'}</button></div>`;
  if(t!=='daily')h+=`<h2>${t==='weekly'?'BU HAFTANIN GÜNLERİ':'BU AYIN GÜNLERİ'}</h2><div class="card">${keys.map(k=>rowDay(k,'setD')).join('')}</div>`;
  return h;
}

function rowBreak(k,b,mode){
  const end=b.e||(k===todayK()?Date.now():b.s),dur=Math.max(0,minOf(end)-minOf(b.s));
  const pen=b.t==='lunch'?lunchPen(k,b.s,Math.max(end,b.s)):dur;
  return `<div class="row" onclick="editBreak('${k}','${b.id}','${mode}')"><div><div class="n">${b.t==='lunch'?'🍽️ Öğle arası':'☕ Mola'}</div><div class="sub">${hm(b.s)} – ${b.e?hm(b.e):'devam ediyor'} · ${fdur(dur)}</div></div><div class="r ${pen>0?'exp':'inc'}" style="font-weight:700">${pen>0?'−'+fdur(pen):'ceza yok'}</div></div>`;
}
function vBreak(){
  const k=todayK(),d=S.days[k],c=S.cfg;
  const info=`Öğle arası: ${c.lunchFrom}–${c.lunchTo} arasında ${c.lunch} dk (Cuma ${c.lunchFri} dk) ücretsiz, günde 1 kez. Fazlası ve diğer molalar mesaiden düşer.`;
  if(!d||!d.in)return `<div class="card empty">Mola için önce <b>Özet</b> sekmesinden giriş yapmalısın.</div><div class="hint">${info}</div>`;
  const ob=openBreak(d),lb=(d.breaks||[]).find(b=>b.t==='lunch'&&b.e);
  let h='';
  if(lb){const p=lunchPen(k,lb.s,lb.e);h+=`<div class="banner ok">✅ Öğle arası yapıldı · ${hm(lb.s)}–${hm(lb.e)}<br><span style="font-weight:500">${p>0?p+' dk ceza mesaiden düşüldü':'Ceza yok'}</span></div>`}
  else h+=`<div class="banner info">🍽️ Öğle arası henüz kullanılmadı<br><span style="font-weight:500">${info}</span></div>`;
  if(d.out)h+=`<div class="card empty">Bugünkü mesai bitti (çıkış ${hm(d.out)}).</div>`;
  else if(ob){
    const el=minOf(Date.now())-minOf(ob.s);
    h+=`<div class="card" style="text-align:center"><div class="lbl">Moladasın · çıkış ${hm(ob.s)}</div><div class="val" style="font-size:34px">${fdur(el)}</div></div>
    <button class="bigbtn ret" onclick="breakBack('break')">↩ Moladan gel</button>
    <button class="bigbtn lun" ${lunchUsed(d,ob.id)?'disabled':''} onclick="breakBack('lunch')">🍽️ Öğle arasından gel</button>
    <div class="hint">"Moladan gel": süre tamamen mesaiden düşer. "Öğle arasından gel": bu ara öğle arası sayılır.</div>`;
  }else h+=`<button class="bigbtn brk" onclick="breakOut()">☕ Molaya çık</button><div class="hint">Dönerken bunun normal mola mı öğle arası mı olduğunu seçersin; sonradan listeden de değiştirebilirsin.</div>`;
  const list=(d.breaks||[]).slice().sort((a,b)=>a.s-b.s);
  if(list.length)h+=`<h2>BUGÜNKÜ ARALAR</h2><div class="card">${list.map(b=>rowBreak(k,b,'live')).join('')}</div>`;
  return h;
}

function vFix(){
  const p=P||(S.cfg.type==='monthly'?'monthly':'weekly');
  const keys=keysFor(p,D),sm=sumKeys(keys),diff=sm.net-sm.tar;
  return `<div class="seg"><button class="${p==='weekly'?'on':''}" onclick="P='weekly';render()">Hafta</button><button class="${p==='monthly'?'on':''}" onclick="P='monthly';render()">Ay</button></div>
  <div class="dn"><button class="nb" onclick="goP(-1)">‹</button><div style="flex:1;text-align:center;font-weight:700">${esc(periodLabel(p,D))}</div><button class="nb" onclick="goP(1)">›</button></div>
  <div class="card"><div class="kv"><span>Çalışılan</span><b>${fm(sm.net)}</b></div><div class="kv"><span>Hedef</span><b>${fm(sm.tar)}</b></div><div class="kv total"><span>${diff<0?'Eksik':'Fazla'}</span><b class="${diff<0?'exp':'inc'}">${diff<0?'−':'+'}${fm(Math.abs(diff))}</b></div></div>
  <h2>GÜNLER · düzeltmek için dokun</h2><div class="card">${keys.map(k=>rowDay(k,'editDay')).join('')}</div>
  <div class="hint">Giriş-çıkış saatlerini, molaları değiştirebilir veya "Net mesai (elle)" alanına doğrudan süre yazabilirsin (ör. 7:00 yerine 7:02).</div>`;
}
function goP(n){
  const p=P||(S.cfg.type==='monthly'?'monthly':'weekly');
  if(p==='weekly')D=addD(D,7*n);
  else{const d=parseD(D);d.setDate(1);d.setMonth(d.getMonth()+n);const now=new Date();D=(d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth())?todayK():dkey(d)}
  render();
}

function vSet(){
  const c=S.cfg,n=c.workdays.length;
  return `<div class="card"><label style="margin-top:0">Mesai tipi</label>
    <div class="seg">${['daily','weekly','monthly'].map(t=>`<button class="${c.type===t?'on':''}" onclick="setCfg('type','${t}')">${typeName[t]}</button>`).join('')}</div>
    <div class="hint">Günlük: her gün ${c.hours} saat · Haftalık: ${n} gün × ${c.hours} = ${n*c.hours} saat · Aylık: o ayın çalışma günü × ${c.hours} saat.</div>
    <label>Günlük çalışma süresi (saat)</label><input type="number" step="0.25" min="0" value="${c.hours}" onchange="setCfg('hours',+this.value)">
    <label>Çalışma günleri</label><div class="days">${[1,2,3,4,5,6,0].map(i=>`<button class="dchip ${c.workdays.includes(i)?'on':''}" onclick="togDay(${i})">${DS[i]}</button>`).join('')}</div>
  </div>
  <h2>ÖĞLE ARASI</h2><div class="card">
    <div class="two"><div><label style="margin-top:0">Aralık başlangıcı</label><input type="time" value="${c.lunchFrom}" onchange="setCfg('lunchFrom',this.value)"></div><div><label style="margin-top:0">Aralık bitişi</label><input type="time" value="${c.lunchTo}" onchange="setCfg('lunchTo',this.value)"></div></div>
    <div class="two"><div><label>Süre (dk)</label><input type="number" min="0" value="${c.lunch}" onchange="setCfg('lunch',+this.value)"></div><div><label>Cuma süresi (dk)</label><input type="number" min="0" value="${c.lunchFri}" onchange="setCfg('lunchFri',+this.value)"></div></div>
    <div class="hint">Öğle arasının bu aralığa düşen kısmının, süre hakkı kadarı ücretsizdir; fazlası ve aralık dışında kalan kısım mesaiden düşer. Günde yalnızca 1 öğle arası sayılır.</div></div>
  <h2>OTOMATİK KESİNTİ (giriş-çıkış arası brüt süreye göre)</h2><div class="card"><table class="tbl">
    <tr><td>0:00 – 4:00</td><td>−15 dk</td></tr><tr><td>4:01 – 7:30</td><td>−30 dk</td></tr><tr><td>7:31 – 11:00</td><td>−1 saat</td></tr><tr><td>11:01 ve üstü</td><td>−1,5 saat</td></tr></table></div>
  <button class="btn del" onclick="resetMesai()">Mesai verilerini sil</button>`;
}
function setCfg(key,val){
  if(typeof val==='number'&&(isNaN(val)||val<0))return toast('Geçersiz değer');
  if((key==='lunchFrom'||key==='lunchTo')&&!val)return;
  S.cfg[key]=val;P=null;persist();render();
}
function togDay(i){
  const a=S.cfg.workdays,j=a.indexOf(i);
  if(j>=0)a.splice(j,1);else a.push(i);
  persist();render();
}
function resetMesai(){
  ask('Tüm mesai kayıtları ve ayarları silinecek. Emin misin?','Evet, sil',()=>{S=fresh();persist();closeSheet();render();toast('Silindi')},closeSheet);
}

/* ---------- mola düzenleme ---------- */
let BE=null;
const listFor=(mode,k)=>mode==='draft'?E.breaks:((S.days[k]&&S.days[k].breaks)||[]);
function setList(mode,k,arr){if(mode==='draft')E.breaks=arr;else S.days[k].breaks=arr}
function editBreak(k,id,mode){
  const b=listFor(mode,k).find(x=>x.id===id);if(!b)return;
  BE={k,id,mode,s:hm(b.s),e:b.e?hm(b.e):'',t:b.t};renderBE();
}
function renderBE(){
  const others=listFor(BE.mode,BE.k).some(b=>b.t==='lunch'&&b.id!==BE.id);
  showSheet(`<h3>Mola düzenle</h3>
  <div class="seg"><button class="${BE.t==='break'?'on':''}" onclick="BE.t='break';renderBE()">☕ Mola</button><button class="${BE.t==='lunch'?'on':''}" ${others?'disabled style="opacity:.4"':''} onclick="BE.t='lunch';renderBE()">🍽️ Öğle arası</button></div>
  ${others?'<div class="hint" style="margin-top:-4px">Bu günde zaten bir öğle arası var.</div>':''}
  <div class="two"><div><label style="margin-top:0">Çıkış</label><input type="time" value="${BE.s}" onchange="BE.s=this.value"></div><div><label style="margin-top:0">Dönüş (boşsa devam)</label><input type="time" value="${BE.e}" onchange="BE.e=this.value"></div></div>
  <button class="btn" onclick="saveBE()">Kaydet</button><button class="btn del" onclick="delBE()">Sil</button><button class="btn sec" onclick="backBE()">Vazgeç</button>`);
}
function saveBE(){
  if(!BE.s)return toast('Çıkış saati gerekli');
  const s=tsOf(BE.k,BE.s),e=BE.e?tsOf(BE.k,BE.e):null;
  if(e!=null&&e<s)return toast('Dönüş, çıkıştan önce olamaz');
  const b=listFor(BE.mode,BE.k).find(x=>x.id===BE.id);b.s=s;b.e=e;b.t=BE.t;
  if(BE.mode==='live')persist();
  backBE();toast('Kaydedildi');
}
function delBE(){
  setList(BE.mode,BE.k,listFor(BE.mode,BE.k).filter(x=>x.id!==BE.id));
  if(BE.mode==='live')persist();
  backBE();
}
function backBE(){if(BE.mode==='draft')renderEdit();else closeSheet();render()}

/* ---------- gün düzenleme (düzeltme) ---------- */
let E=null;
function editDay(k){
  const d=S.days[k]||{};
  E={k,in:d.in?hm(d.in):'',out:d.out?hm(d.out):'',off:!!d.off,ov:d.override!=null?fm(d.override):'',breaks:JSON.parse(JSON.stringify(d.breaks||[]))};
  renderEdit();
}
function draftDay(){
  const ov=parseHM(E.ov);
  return {in:E.in?tsOf(E.k,E.in):null,out:E.out?tsOf(E.k,E.out):null,off:E.off,override:(ov==null||isNaN(ov))?null:ov,breaks:E.breaks};
}
function renderEdit(){
  const auto=calcDay(E.k,Object.assign(draftDay(),{override:null}));
  const list=E.breaks.slice().sort((a,b)=>a.s-b.s);
  showSheet(`<h3>${esc(dLabel(E.k))}</h3>
  <div class="two"><div><label style="margin-top:0">Giriş</label><input type="time" value="${E.in}" onchange="E.in=this.value;renderEdit()"></div><div><label style="margin-top:0">Çıkış</label><input type="time" value="${E.out}" onchange="E.out=this.value;renderEdit()"></div></div>
  <label class="chk"><input type="checkbox" ${E.off?'checked':''} onchange="E.off=this.checked"> İzinli / resmi tatil (hedef 0)</label>
  <label>Mola ve öğle arası</label>
  <div class="card" style="margin-bottom:6px;padding:6px 14px">${list.length?list.map(b=>rowBreak(E.k,b,'draft')).join(''):'<div class="empty" style="padding:12px 0">Kayıtlı ara yok</div>'}</div>
  <button class="btn sec" style="margin-top:0" onclick="addBreakDraft()">+ Mola ekle</button>
  <label>Net mesai (elle) — boşsa otomatik hesap kullanılır</label>
  <input value="${esc(E.ov)}" oninput="E.ov=this.value" placeholder="örn. 7:02">
  <div class="hint">Otomatik hesap: <b>${fm(auto.calc)}</b> (brüt ${fm(auto.gross)} − kesinti ${fdur(auto.auto)} − mola ${fdur(auto.breakPen)} − öğle cezası ${fdur(auto.lunchPen)})</div>
  <button class="btn" onclick="saveDay()">Kaydet</button>
  <button class="btn del" onclick="clearDay()">Günün kaydını sil</button>
  <button class="btn sec" onclick="closeSheet()">Vazgeç</button>`);
}
function addBreakDraft(){
  const s=tsOf(E.k,'12:00'),id=uid();
  E.breaks.push({id,s,e:s+15*60000,t:'break'});
  editBreak(E.k,id,'draft');
}
function saveDay(){
  const k=E.k,tin=E.in?tsOf(k,E.in):null,tout=E.out?tsOf(k,E.out):null;
  if(tout&&!tin)return toast('Çıkış için giriş saati gerekli');
  if(tout&&tin&&tout<=tin)return toast('Çıkış, girişten sonra olmalı');
  const ov=parseHM(E.ov);
  if(ov!=null&&isNaN(ov))return toast('Net mesai biçimi: 7:02');
  const d={in:tin,out:tout,off:E.off,override:ov,breaks:E.breaks};
  if(!tin&&!tout&&!E.off&&ov==null&&!E.breaks.length)delete S.days[k];else S.days[k]=d;
  persist();closeSheet();render();toast('Kaydedildi');
}
function clearDay(){
  const k=E.k;
  ask('Bu günün tüm kaydı silinsin mi?','Evet, sil',()=>{delete S.days[k];persist();closeSheet();render();toast('Silindi')},renderEdit);
}

render();
/* açık gün/mola süresi canlı güncellensin */
setInterval(()=>{
  if(document.visibilityState!=='visible')return;
  if(view!=='home'&&view!=='brk')return;
  if(document.getElementById('sheet').style.display==='block')return;
  const a=document.activeElement;if(a&&a.tagName==='INPUT')return;
  const m=document.getElementById('main'),y=m.scrollTop;render();m.scrollTop=y;
},30000);
