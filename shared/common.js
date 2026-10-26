/* SKY ortak kodları: tüm araçlar ve ana ekran bu dosyayı yükler */
const APP_VERSION='2.0';

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
