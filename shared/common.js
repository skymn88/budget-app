/* SKY ortak kodları: tüm araçlar ve ana ekran bu dosyayı yükler */
const APP_VERSION='2.1';

/* APK derlenirken GitHub Actions bu iki değeri gerçek değerlerle değiştirir; web sürümünde olduğu gibi kalır */
const BUILD='__BUILD__',REPO='__REPO__';
const hasBuild=/^\d+$/.test(BUILD)&&/^[\w.-]+\/[\w.-]+$/.test(REPO);
const APK_NAME='sky.apk';

/* sitenin kök yolu (ör. /skymoon-app/ veya /) */
const ROOT=(()=>{try{return new URL(document.currentScript.src).pathname.replace(/shared\/common\.js$/,'')}catch(e){return '/'}})();

/* ---------- küçük yardımcılar ---------- */
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function num(s){if(s===''||s==null)return NaN;s=String(s).trim();
  if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(','))s=s.replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  return parseFloat(s)}

/* ---------- telefonda güvenilir giriş alanları ----------
   Android WebView'da type=time/date/month kutuları açılmayabiliyor. Bunların yerine sayısal klavye
   açan metin alanları ve seçim kutuları kullanıyoruz. Değerler kaydederken kutudan okunur. */
const MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
/* yazarken 0830 -> 08:30; ilk rakam 3-9 ise başına 0 eklenir (8 -> 08) */
function maskTime(el){
  let d=el.value.replace(/\D/g,'').slice(0,4);
  if(d&&d[0]>'2')d='0'+d;
  if(d.length>=2&&+d.slice(0,2)>23)d='0'+d;
  d=d.slice(0,4);
  el.value=d.length>2?d.slice(0,2)+':'+d.slice(2):d;
}
/* "830", "8:30", "08.30", "8" -> "HH:MM"; boşsa ''; geçersizse null */
function normTime(s){
  s=String(s==null?'':s).trim();if(!s)return '';
  const m=s.match(/^(\d{1,2})(?:\s*[:.,]?\s*(\d{2}))?$/);
  if(!m)return null;
  const h=+m[1],mi=m[2]==null?0:+m[2];
  return(h>23||mi>59)?null:pad(h)+':'+pad(mi);
}
const timeInput=(id,val,onch,oninp)=>`<input id="${id}" type="text" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="08:30" value="${esc(val||'')}" oninput="maskTime(this)${oninp?';'+oninp:''}" onfocus="this.select()"${onch?` onchange="${onch}"`:''}>`;
function timeVal(id){const el=document.getElementById(id);return el?normTime(el.value):''}

function maskDate(el){
  const d=el.value.replace(/\D/g,'').slice(0,8);let o=d.slice(0,2);
  if(d.length>2)o+='.'+d.slice(2,4);
  if(d.length>4)o+='.'+d.slice(4);
  el.value=o;
}
const fmtDate=k=>k?k.slice(8,10)+'.'+k.slice(5,7)+'.'+k.slice(0,4):'';
/* "25.10.2026" veya "25102026" -> "2026-10-25"; boşsa ''; geçersizse null */
function normDate(s){
  s=String(s==null?'':s).trim();if(!s)return '';
  const m=s.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4})$/)||s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if(!m)return null;
  const d=+m[1],mo=+m[2],y=+m[3],t=new Date(y,mo-1,d);
  if(mo<1||mo>12||t.getFullYear()!==y||t.getMonth()!==mo-1||t.getDate()!==d)return null;
  return y+'-'+pad(mo)+'-'+pad(d);
}
const dateInput=(id,val,onch)=>`<input id="${id}" type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="25.10.2026" value="${fmtDate(val)}" oninput="maskDate(this)" onfocus="this.select()"${onch?` onchange="${onch}"`:''}>`;
function dateVal(id){const el=document.getElementById(id);return el?normDate(el.value):''}

/* ay + yıl seçim kutuları; allowEmpty ise ilk seçenek "Süresiz" (boş değer) */
function monthSelect(id,val,allowEmpty,onch){
  const cy=new Date().getFullYear();let y=0,m=0;
  if(val){const p=val.split('-').map(Number);y=p[0];m=p[1]}
  const y0=Math.min(cy-3,y||cy),y1=Math.max(cy+10,y||cy),ys=[];
  for(let i=y0;i<=y1;i++)ys.push(`<option value="${i}" ${i===(y||cy)?'selected':''}>${i}</option>`);
  const ms=(allowEmpty?`<option value="" ${val?'':'selected'}>— Süresiz</option>`:'')
    +MONTHS.map((n,i)=>`<option value="${pad(i+1)}" ${i+1===m?'selected':''}>${n}</option>`).join('');
  const oc=onch?` onchange="${onch}"`:'';
  return `<div class="two"><select id="${id}m"${oc}>${ms}</select><select id="${id}y"${oc}>${ys.join('')}</select></div>`;
}
function monthVal(id){
  const m=document.getElementById(id+'m'),y=document.getElementById(id+'y');
  return(m&&y&&m.value)?y.value+'-'+m.value:'';
}

/* ---------- depo adresi ve APK bağlantıları ---------- */
function repoGuess(){
  if(hasBuild)return REPO;
  const h=location.hostname;
  if(/\.github\.io$/.test(h)){const owner=h.split('.')[0],seg=location.pathname.split('/')[1];if(seg&&seg.indexOf('.')<0)return owner+'/'+seg}
  return '';
}
const apkUrl=()=>{const r=repoGuess();return r?`https://github.com/${r}/releases/latest/download/${APK_NAME}`:''};
const releaseUrl=()=>{const r=repoGuess();return r?`https://github.com/${r}/releases/tag/latest`:''};
const isNative=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());

/* ---------- ortak alt panel (sheet), onay ve bildirim ---------- */
document.body.insertAdjacentHTML('beforeend','<div id="ov" onclick="closeSheet()"></div><div id="sheet"></div><div id="toast"></div>');
function showSheet(html){
  const s=document.getElementById('sheet');
  if(html!=null)s.innerHTML=html;
  s.style.display='block';document.getElementById('ov').style.display='block';
}
function closeSheet(){document.getElementById('ov').style.display='none';document.getElementById('sheet').style.display='none'}
let tt;function toast(m){const e=document.getElementById('toast');e.textContent=m;e.style.display='block';clearTimeout(tt);tt=setTimeout(()=>e.style.display='none',2000)}
/* tarayıcı confirm() penceresi bazı ortamlarda engelleniyor; onayı uygulama içinde soruyoruz */
function ask(msg,okLabel,fn,back){
  globalThis._yes=fn;globalThis._back=back||closeSheet;
  showSheet(`<h3>${esc(msg)}</h3><button class="btn del" onclick="_yes()">${okLabel}</button><button class="btn sec" onclick="_back()">Vazgeç</button>`);
}

/* ---------- güncelleme bildirimi (yalnızca APK içinde) ---------- */
function skipUpd(n){try{localStorage.setItem('sky.updskip',String(n))}catch(e){}const u=document.getElementById('upd');if(u)u.innerHTML=''}
function checkUpdate(){
  try{
    if(!hasBuild||!isNative())return;
    fetch('https://api.github.com/repos/'+REPO+'/releases/tags/latest',{headers:{'Accept':'application/vnd.github+json'}})
      .then(r=>r.ok?r.json():null).then(d=>{
        if(!d)return;
        const m=/Derleme numarası:\s*(\d+)/.exec(d.body||'');
        const n=m?+m[1]:0,url=String(d.html_url||'');
        if(!n||n<=+BUILD||!url.startsWith('https://github.com/'))return;
        let skip=0;try{skip=+localStorage.getItem('sky.updskip')||0}catch(e){}
        if(skip>=n)return;
        const u=document.getElementById('upd');if(!u)return;
        u.innerHTML=`<div class="upd"><span>Yeni sürüm mevcut</span><span><a href="${esc(url)}" target="_blank" rel="noopener">İndir</a><button onclick="skipUpd(${n})">Sonra</button></span></div>`;
      }).catch(()=>{});
  }catch(e){}
}

/* ---------- çevrimdışı çalışma (servis çalışanı) ---------- */
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register(ROOT+'sw.js',{scope:ROOT}).catch(()=>{});
