/* SKY araç listesi.
   Yeni araç eklemek için: tools/<id>/ klasörünü oluştur ve aşağıya bir satır ekle.
   - key:   aracın localStorage anahtarı (yedek ve silme işlemleri bunu kullanır)
   - files: çevrimdışı çalışsın diye önbelleğe alınacak dosyalar */
const TOOLS=[
  {id:'budget',name:'Bütçe',desc:'Maaş ve giderlerle aylık hesap, öngörü',icon:'💸',hue:250,path:'tools/budget/',key:'butce.v1',files:['index.html','app.js']},
  {id:'mesai',name:'Mesai',desc:'Giriş-çıkış, mola ve mesai hesabı',icon:'⏱️',hue:170,path:'tools/mesai/',key:'mesai.v1',files:['index.html','app.js','app.css']}
];
