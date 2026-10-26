const KEY='butce.v1';
const CATS={expense:['Kira','Elektrik','Su','Doğalgaz','İnternet / Telefon','Fatura','Market','Ulaşım','Abonelik','Taksit / Kredi','Sağlık','Eğitim','Eğlence','Diğer'],income:['Maaş','Ek gelir','Kira geliri','Diğer']};
const CI={'Maaş':['💰',145],'Ek gelir':['💵',165],'Kira geliri':['🏘️',200],'Kira':['🏠',25],'Elektrik':['💡',48],'Su':['💧',200],'Doğalgaz':['🔥',15],'İnternet / Telefon':['📡',260],'Fatura':['🧾',45],'Market':['🛒',120],'Ulaşım':['🚌',215],'Abonelik':['📺',280],'Taksit / Kredi':['💳',340],'Sağlık':['💊',350],'Eğitim':['🎓',235],'Eğlence':['🎬',300],'Diğer':['📦',220]};
const iconOf=(cat,type)=>CI[cat]||[type==='income'?'💰':'📦',type==='income'?145:220];
const icHtml=(cat,type)=>{const [e,hu]=iconOf(cat,type);return `<div class="ic" style="background:hsl(${hu} 85% 55% / .2)">${e}</div>`};
const ymOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1);
const addM=(m,n)=>{const [y,mo]=m.split('-').map(Number);const d=new Date(y,mo-1+n,1);return ymOf(d)};
const label=m=>{const [y,mo]=m.split('-').map(Number);return new Date(y,mo-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'})};
const fmt=n=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(n)+' ₺';
function fresh(){return {opening:0,openingMonth:ymOf(new Date()),recurring:[],oneoff:[],actuals:{}}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.recurring)return s}catch(e){}return fresh()}
let S=load();
function persist(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Kaydedilemedi')}}
let M=ymOf(new Date()),view='home';

/* ---------- hesaplama ---------- */
const mdiff=(a,b)=>{const [ya,ma]=a.split('-').map(Number),[yb,mb]=b.split('-').map(Number);return (yb-ya)*12+(mb-ma)};
const isActive=(r,m)=>r.start<=m&&(!r.end||m<=r.end)&&mdiff(r.start,m)%(r.every||1)===0;
const freq=n=>n>1?n+' ayda bir, ayın':'her ayın';
function monthItems(m){
  const out=[];
  S.recurring.forEach(r=>{
    if(isActive(r,m)){
      out.push({kind:'rec',id:r.id,type:r.type,name:r.name,cat:r.cat,exp:r.amount,act:S.actuals[m+'|'+r.id],day:r.day,every:r.every||1});
    }
  });
  S.oneoff.forEach(t=>{
    if(t.date.slice(0,7)===m)out.push({kind:'one',id:t.id,type:t.type,name:t.name,cat:t.cat,exp:t.amount,act:t.amount,day:+t.date.slice(8,10)});
  });
  return out.sort((a,b)=>a.day-b.day);
}
const proj=it=>it.act!==undefined?it.act:it.exp;
function totals(m){
  const t={inc:{exp:0,proj:0,real:0},ex:{exp:0,proj:0,real:0}};
  monthItems(m).forEach(it=>{
    const g=it.type==='income'?t.inc:t.ex;
    g.exp+=it.exp;g.proj+=proj(it);
    if(it.act!==undefined)g.real+=it.act;
  });
  return t;
}
function endBalance(m,useProj){
  let b=+S.opening||0,c=S.openingMonth,g=0;
  while(c<=m&&g++<600){const t=totals(c);b+=useProj?(t.inc.proj-t.ex.proj):(t.inc.exp-t.ex.exp);c=addM(c,1)}
  return b;
}

/* ---------- görünümler ---------- */
function render(){
  document.getElementById('title').textContent={home:'Özet',rec:'Gelir / Gider',fc:'Öngörü',set:'Ayarlar'}[view];
  document.getElementById('mnav').innerHTML=(view==='home')?
    `<button onclick="goM(-1)">‹</button><span>${label(M)}</span><button onclick="goM(1)">›</button>`:'';
  document.getElementById('nav').innerHTML=[['home','🏠','Özet'],['rec','💸','Gelir/Gider'],['fc','📈','Öngörü'],['set','⚙️','Ayarlar']]
    .map(([v,i,t])=>`<button class="${view===v?'on':''}" onclick="go('${v}')"><i>${i}</i>${t}</button>`).join('');
  document.getElementById('main').innerHTML={home:vHome,rec:vRec,fc:vFc,set:vSet}[view]();
}
const go=v=>{view=v;render();document.getElementById('main').scrollTop=0};
const goM=n=>{M=addM(M,n);render()};

function rowHtml(it){
  const isRec=it.kind==='rec';
  const cls=it.type==='income'?'inc':'exp';
  let right;
  if(isRec){
    if(it.act!==undefined){
      const d=it.act-it.exp;
      const good=(it.type==='income')?d>=0:d<=0;
      right=`<div class="${cls}" style="font-weight:700">${fmt(it.act)}</div><div class="sub">beklenen ${fmt(it.exp)}${d!==0?` · <span style="color:var(${good?'--inc':'--exp'})">${d>0?'+':''}${fmt(d)}</span>`:''}</div>`;
    }else right=`<div style="font-weight:700;color:var(--mut)">${fmt(it.exp)}</div><div class="sub" style="color:var(--warn)">beklenen · girilmedi</div>`;
  }else right=`<div class="${cls}" style="font-weight:700">${fmt(it.act)}</div>`;
  return `<div class="row" onclick="openSheet({kind:'${it.kind}',id:'${it.id}'})"><div class="l">${icHtml(it.cat,it.type)}<div><div class="n">${esc(it.name)}${isRec?`<span class="chip rec">${it.every>1?'her '+it.every+' ayda':'düzenli'}</span>`:''}</div><div class="sub">${esc(it.cat||'')} · ayın ${it.day}'i</div></div></div><div class="r">${right}</div></div>`;
}
function vHome(){
  const t=totals(M),items=monthItems(M);
  const inc=items.filter(i=>i.type==='income'),ex=items.filter(i=>i.type==='expense');
  const net=t.inc.proj-t.ex.proj,netE=t.inc.exp-t.ex.exp;
  const missing=items.filter(i=>i.kind==='rec'&&i.act===undefined).length;
  const pct=t.inc.proj>0?Math.min(100,Math.round(t.ex.proj/t.inc.proj*100)):0;
  return `<div class="card hero"><small>${label(M)} bakiyesi</small><div class="big">${fmt(net)}</div>
    <small>Beklenen: ${fmt(netE)} · yalnızca bu ayın geliri − gideri</small>
    ${t.inc.proj>0?`<div class="bar"><i style="width:${pct}%"></i></div><small>Gelirin %${pct}'i harcanıyor</small>`:''}</div>
  <div class="grid">
    <div class="card inc-card"><div class="lbl">Gelir</div><div class="val inc">${fmt(t.inc.proj)}</div><div class="sub">beklenen ${fmt(t.inc.exp)}</div></div>
    <div class="card exp-card"><div class="lbl">Gider</div><div class="val exp">${fmt(t.ex.proj)}</div><div class="sub">beklenen ${fmt(t.ex.exp)}</div></div>
  </div>
  <div class="hint">${missing?`${missing} düzenli kalemin gerçek değeri girilmedi; hesapta beklenen değer kullanılıyor.`:'Girilen gerçek değerler hesaba katılıyor.'}</div>
  <h2>GELİRLER</h2><div class="card">${inc.length?inc.map(rowHtml).join(''):'<div class="empty">Bu ay gelir yok</div>'}</div>
  <h2>GİDERLER</h2><div class="card">${ex.length?ex.map(rowHtml).join(''):'<div class="empty">Bu ay gider yok<br>Sağ alttaki + ile ekle</div>'}</div>`;
}
function rowRec(r){
  return `<div class="row" onclick="openSheet({kind:'rec',id:'${r.id}'})"><div class="l">${icHtml(r.cat,r.type)}<div><div class="n">${esc(r.name)}</div><div class="sub">${freq(r.every||1)} ${r.day}'i · ${label(r.start)} → ${r.end?label(r.end):'süresiz'}</div></div></div><div class="r ${r.type==='income'?'inc':'exp'}" style="font-weight:700">${fmt(r.amount)}</div></div>`;
}
function vRec(){
  if(!S.recurring.length)return '<div class="card empty">Henüz düzenli gelir veya gider yok.<br>Sağ alttaki + ile ekleyip "Düzenli" kutusunu işaretle.</div>';
  const list=[...S.recurring].sort((a,b)=>a.day-b.day);
  const inc=list.filter(r=>r.type==='income'),ex=list.filter(r=>r.type==='expense');
  const avg=a=>a.reduce((s,r)=>s+r.amount/(r.every||1),0);
  const block=(a,e)=>a.length?`<div class="card">${a.map(rowRec).join('')}</div>`:`<div class="card empty">${e}</div>`;
  return `<h2>DÜZENLİ GELİRLER · aylık ortalama ${fmt(avg(inc))}</h2>${block(inc,'Düzenli gelir yok')}
  <h2>DÜZENLİ GİDERLER · aylık ortalama ${fmt(avg(ex))}</h2>${block(ex,'Düzenli gider yok')}
  <div class="hint">Dokunarak tutarı, sıklığı, bitiş ayını değiştirebilir veya silebilirsin. Tek seferlik kayıtlar Özet sekmesinde, ait olduğu ayda görünür.</div>`;
}
function vFc(){
  const cur=ymOf(new Date());let h='',sum=0,cumEnd=0;
  for(let i=0;i<6;i++){
    const m=addM(cur,i),t=totals(m),net=t.inc.proj-t.ex.proj,cum=endBalance(m,true);
    sum+=net;cumEnd=cum;
    const pct=t.inc.proj>0?Math.min(100,Math.round(t.ex.proj/t.inc.proj*100)):(t.ex.proj>0?100:0);
    h+=`<div class="card pm"><div class="top"><b>${label(m)}</b><span class="val ${net>=0?'inc':'exp'}">${net>=0?'+':''}${fmt(net)}</span></div>
    <div class="grid"><div><div class="lbl">Gelir</div><div class="inc" style="font-weight:600">${fmt(t.inc.proj)}</div></div><div><div class="lbl">Gider</div><div class="exp" style="font-weight:600">${fmt(t.ex.proj)}</div></div></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="sub">Birikmiş toplam: <b class="${cum>=0?'inc':'exp'}">${fmt(cum)}</b></div></div>`;
  }
  return `<div class="card hero"><small>Önümüzdeki 6 ayın toplam neti</small><div class="big">${sum>=0?'+':''}${fmt(sum)}</div><small>6. ay sonundaki birikmiş toplam: ${fmt(cumEnd)}</small></div>${h}
  <div class="hint">Büyük rakam o ayın kendi bakiyesidir. Birikmiş toplam, Ayarlar'daki başlangıç bakiyesine önceki ayların netleri eklenerek bulunur. Gerçek değer girilmeyen kalemler beklenen tutarla hesaplanır.</div>`;
}
function vSet(){
  return `<div class="card"><label style="margin-top:0">Başlangıç bakiyesi (₺) · Öngörü'deki birikmiş toplam için</label><input id="ob" inputmode="decimal" value="${S.opening||''}" placeholder="0">
    <label>Birikim hangi aydan başlasın?</label><input id="om" type="month" value="${S.openingMonth}">
    <button class="btn" onclick="saveSet()">Kaydet</button></div>
  <h2>YEDEK</h2><div class="card">
    <div class="sub" style="margin-bottom:8px">Veriler yalnızca bu telefonun tarayıcısında durur. Düzenli yedek almanı öneririm. Tüm araçların yedeğini SKY ana ekranındaki Ayarlar'dan da alabilirsin.</div>
    <button class="btn sec" style="margin-top:0" onclick="exportData()">Yedeği indir (JSON)</button>
    <button class="btn sec" onclick="copyData()">Yedeği panoya kopyala</button>
    <button class="btn sec" onclick="document.getElementById('imp').click()">Yedekten yükle</button>
    <input type="file" id="imp" accept=".json,application/json" style="display:none" onchange="importData(this)">
    <button class="btn del" onclick="resetAll()">Tüm verileri sil</button></div>
  <div class="hint" style="text-align:center">Bütçe aracı · SKY sürüm ${APP_VERSION}${hasBuild?' · derleme '+BUILD:''}</div>`;
}
function saveSet(){
  const v=num(document.getElementById('ob').value);
  S.opening=isNaN(v)?0:v;S.openingMonth=document.getElementById('om').value||ymOf(new Date());
  persist();toast('Kaydedildi');
}
function exportData(){
  const b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='butce-yedek-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();
}
function copyData(){
  const txt=JSON.stringify(S);
  (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Kopyalandı')).catch(()=>toast('Kopyalanamadı, indirmeyi dene'));
}
function importData(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.recurring||!d.oneoff||!d.actuals)throw 0;
    ask('Mevcut veriler bu yedekle değiştirilsin mi?','Evet, yükle',()=>{S=d;persist();closeSheet();render();toast('Yüklendi')},closeSheet)}catch(e){toast('Geçersiz dosya')}};
  r.readAsText(f);inp.value='';
}
function resetAll(){ask('Tüm veriler silinecek ve geri alınamaz. Emin misin?','Evet, hepsini sil',()=>{S=fresh();persist();closeSheet();render();toast('Tüm veriler silindi')},closeSheet)}

/* ---------- ekle / düzenle ---------- */
let F=null;
function openSheet(o){
  if(o.kind==='rec'){
    const r=S.recurring.find(x=>x.id===o.id);if(!r)return;
    const a=S.actuals[M+'|'+r.id];
    F={edit:true,rec:true,id:r.id,type:r.type,name:r.name,cat:r.cat,amount:r.amount,day:r.day,every:r.every||1,start:r.start,end:r.end||'',actual:a===undefined?'':a,date:''};
  }else if(o.kind==='one'){
    const t=S.oneoff.find(x=>x.id===o.id);if(!t)return;
    F={edit:true,rec:false,id:t.id,type:t.type,name:t.name,cat:t.cat,amount:t.amount,day:1,every:1,start:M,end:'',actual:'',date:t.date};
  }else{
    const now=ymOf(new Date());
    F={edit:false,rec:false,type:'expense',name:'',cat:CATS.expense[0],amount:'',day:1,every:1,start:M,end:'',actual:'',date:(M===now?new Date().toISOString().slice(0,10).slice(0,8)+pad(new Date().getDate()):M+'-01')};
    F.date=M===now?now+'-'+pad(new Date().getDate()):M+'-01';
  }
  renderSheet();
  document.getElementById('ov').style.display='block';document.getElementById('sheet').style.display='block';
}
function setType(t){F.type=t;F.cat=CATS[t][0];renderSheet()}
function setRec(v){F.rec=v;renderSheet()}
function renderSheet(){
  const f=F,tp=f.type;
  const cats=CATS[tp].map(c=>`<option value="${c}" ${c===f.cat?'selected':''}>${iconOf(c,tp)[0]} ${c}</option>`).join('');
  let h=`<h3>${f.edit?'Düzenle':'Yeni kayıt'}</h3>
  <div class="seg"><button class="${tp==='expense'?'on e':''}" onclick="setType('expense')">Gider</button><button class="${tp==='income'?'on i':''}" onclick="setType('income')">Gelir</button></div>
  <label style="margin-top:0">Ad</label><input value="${esc(f.name)}" oninput="F.name=this.value" placeholder="${tp==='income'?'Maaş':'Kira, elektrik...'}">
  <label>Kategori</label><select onchange="F.cat=this.value">${cats}</select>
  <label>${f.rec?'Beklenen tutar (₺)':'Tutar (₺)'}</label><input inputmode="decimal" value="${f.amount}" oninput="F.amount=this.value" placeholder="0">
  <label class="chk"><input type="checkbox" ${f.rec?'checked':''} ${f.edit?'disabled':''} onchange="setRec(this.checked)"> Düzenli (her ay tekrar eder)</label>`;
  if(f.rec){
    const opts=[[1,'Her ay'],[2,'2 ayda bir'],[3,'3 ayda bir'],[4,'4 ayda bir'],[6,'6 ayda bir'],[12,'Yılda bir']]
      .map(([v,t])=>`<option value="${v}" ${+f.every===v?'selected':''}>${t}</option>`).join('');
    const act=f.start&&isActive({start:f.start,end:f.end||null,every:+f.every||1},M);
    h+=`<label>Sıklık</label><select onchange="F.every=+this.value;renderSheet()">${opts}</select>
    <div class="two"><div><label>Ayın kaçıncı günü</label><input type="number" min="1" max="31" value="${f.day}" oninput="F.day=this.value"></div>
    <div><label>Başlangıç ayı</label><input type="month" value="${f.start}" onchange="F.start=this.value;renderSheet()"></div></div>
    <label>Son ay (boşsa süresiz)</label><input type="month" value="${f.end}" onchange="F.end=this.value;renderSheet()">
    <div class="hint">Başlangıç ayı ilk gerçekleşme ayıdır, sonra seçilen sıklıkta tekrar eder. Çift maaş gibi ek gelirler için ayrı bir düzenli gelir ekleyip "6 ayda bir" seçebilirsin.</div>`;
    h+=act?`<label>Gerçekleşen — ${label(M)} (boşsa girilmedi)</label><input inputmode="decimal" value="${f.actual}" oninput="F.actual=this.value" placeholder="Beklenenden farklıysa yaz">`
      :`<div class="hint">Bu kalem ${label(M)} ayında geçerli değil, o yüzden gerçek değer girilemez. Ay seçerek ilgili aya git.</div>`;
  }else{
    h+=`<label>Tarih</label><input type="date" value="${f.date}" onchange="F.date=this.value">`;
  }
  h+=`<button class="btn" onclick="save()">Kaydet</button>`;
  if(f.edit&&f.rec)h+=`<button class="btn sec" onclick="endHere()">${label(M)} ayından itibaren bitir</button><button class="btn del" onclick="delRec()">Tamamen sil</button>`;
  if(f.edit&&!f.rec)h+=`<button class="btn del" onclick="delOne()">Sil</button>`;
  h+=`<button class="btn sec" onclick="closeSheet()">Vazgeç</button>`;
  document.getElementById('sheet').innerHTML=h;
}
function save(){
  const amt=num(F.amount);
  if(!F.name.trim()||isNaN(amt)){toast('Ad ve tutar gerekli');return}
  if(F.rec){
    const day=Math.min(31,Math.max(1,parseInt(F.day)||1));
    if(!F.start){toast('Başlangıç ayı gerekli');return}
    if(F.end&&F.end<F.start){toast('Son ay başlangıçtan önce olamaz');return}
    let r;
    if(F.edit)r=S.recurring.find(x=>x.id===F.id);else{r={id:uid()};S.recurring.push(r)}
    Object.assign(r,{type:F.type,name:F.name.trim(),cat:F.cat,amount:amt,day,every:parseInt(F.every)||1,start:F.start,end:F.end||null});
    const k=M+'|'+r.id,a=num(F.actual);
    if(isNaN(a)||!isActive(r,M))delete S.actuals[k];else S.actuals[k]=a;
  }else{
    if(!F.date){toast('Tarih gerekli');return}
    if(F.edit){Object.assign(S.oneoff.find(x=>x.id===F.id),{type:F.type,name:F.name.trim(),cat:F.cat,amount:amt,date:F.date})}
    else S.oneoff.push({id:uid(),type:F.type,name:F.name.trim(),cat:F.cat,amount:amt,date:F.date});
    if(F.date.slice(0,7)!==M)M=F.date.slice(0,7);
  }
  persist();closeSheet();render();
}
function endHere(){
  const r=S.recurring.find(x=>x.id===F.id);r.end=addM(M,-1);
  if(r.end<r.start)purge(r.id);
  persist();closeSheet();render();toast('Düzenli kalem bitirildi');
}
function purge(id){S.recurring=S.recurring.filter(x=>x.id!==id);Object.keys(S.actuals).forEach(k=>{if(k.endsWith('|'+id))delete S.actuals[k]})}
function delRec(){ask('Bu düzenli kalem tüm aylardan silinsin mi?','Evet, sil',()=>{purge(F.id);persist();closeSheet();render();toast('Silindi')},renderSheet)}
function delOne(){ask('Bu kayıt silinsin mi?','Evet, sil',()=>{S.oneoff=S.oneoff.filter(x=>x.id!==F.id);persist();closeSheet();render();toast('Silindi')},renderSheet)}


render();
