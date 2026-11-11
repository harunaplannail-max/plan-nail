/* ============================================================
   galaxy-core.js — GALAXY OF NAIL の惑星と月の「作り方」を1か所にまとめた共用ファイル
   universe.html(本編)と index.html(ホームの入口)の両方が読み込む。
   惑星や月の見た目・データを直すときは、ここを直せば両方に反映される。
   決まりごと:
   - three.js(THREE)を先に読み込んでおくこと
   - 画面のDOM(ラベル・ボタンなど)には触らない。テクスチャ用の canvas を作るだけ
   - 本編の変数(scene・camera・planets など)は直接使わない。必要なものは引数で受け取る
   ============================================================ */
(function(global){

/* ---------- 1. タキソノミーのデータ(描画と分離。ここを書き換えれば宇宙に反映) ---------- */
const TAXONOMY = {
  categories: [
    { id:'romantic', type:'planet', name:'ROMANTIC', jp:'女性らしさ', concept:'FEMININITY / ORGANIC BEAUTY', material:'pearl',
      desc:'シアーやパール、バラのように、やわらかく有機的な美しさ。光を透かす繊細さが核。', pos:[-9,3.5,-3], size:2.6 },
    { id:'metallic', type:'planet', name:'METALLIC', jp:'質感・構造', concept:'MATERIAL / STRUCTURE', material:'chrome',
      desc:'マグネット、クロム、クリア。素材そのものの質感と、光の構造で見せるジャンル。', pos:[9,3.5,-3], size:2.6 },
    { id:'dark', type:'planet', name:'DARK', jp:'ダーク', concept:'INTROSPECTION', material:'blackJupiter',
      desc:'ゴシック、グランジ、パンク、サイバーなど、ダークな世界観を表現するネイル。黒や深い色、無機質な質感、退廃的なモチーフを取り入れた、個性と存在感のあるデザイン。', pos:[-10,-2.5,4], size:2.8 },
    { id:'natural', type:'planet', name:'NATURAL', jp:'肌なじみ・時代を問わない', concept:'SKIN TONE / TIMELESS BEAUTY', material:'air',
      desc:'ヌード、ベージュ、ミルク。頑張っていないように見える完璧さ。Quiet Luxuryの文脈。', pos:[10,-2.5,4], size:2.5 },
    { id:'revival', type:'planet', name:'REVIVAL', jp:'時代の再解釈', concept:'CULTURAL REINTERPRETATION', material:'holo',
      desc:'Y2K、パンク、平成ノスタルジー。過去の時代を、今の感覚で描き直すジャンル。', pos:[0,-6,6], size:2.6 },
  ],
  subcategories: [
    ['romantic',['Sheer','Pearl','Rose','Classic Romantic',{name:'Y2K Girlhood',children:['Fairy','Wishcore','Coconut Girl','Angelcore','Pink Glamour','Unicorn']}]],
    ['metallic',['Magnet','Chrome','Clear','Star Galaxy','Aurora','Bubble']],
    ['dark',['Gothic',{name:'Grunge',children:['Foggy','Smoke','Ink Art','Nuance Art']},{name:'Mystic',children:['Tarot','Astrology']},
             {name:'Cyber',children:['Cybersigilism','Cyber Tribal']},'Neo Tribal',{name:'Street',children:['Graffiti','Hardcore']},{name:'Extreme',children:['Super-realistic']},'Piercing']],  // パンクは月ではなく、思想のパルサー PUNK SPIRIT へ。Neo TribalはCyberの隣の独立した月(2026-11-11追加)
    ['natural',['Nude','Beige','Milk','Clean Girl',{name:'Quiet Luxury',children:[]},'French']],  // FrenchはNATURALの月(2026-11-11追加)
    ['revival',['Y2K','Mcbling','Y3K','2010s Swag',{name:'Kidcore',children:['Beads','Candy','Primary Colors','Miniature Food']}]],
  ],
  motifs: [
    { id:'patterns', type:'asteroid', name:'PATTERNS', jp:'柄', items:['Stripe','Dot','Swirl','Check','Leopard','Zebra','Tortoise'], related:[] },
    { id:'ethnic', type:'asteroid', name:'ETHNIC', jp:'民族柄', items:['Hawaiian','African','Mexican','Neo-Chinese'], related:[] },
    { id:'decoration', type:'asteroid', name:'DECORATION', jp:'素材装飾', items:['Lace','Bijou','Button','Feather','Clover','Tattoo Stencil','Ribbon','Heart','Music Notes','Cursive','Porcelain','Knit / Quilting'], related:[] },
    { id:'creatures', type:'asteroid', name:'CREATURES', jp:'生き物・キャラクター', items:['Alien','Animals','Characters'],
      related:[{to:'metallic',note:'Alien：可愛い・宇宙的 → METALLIC'},{to:'dark',note:'Alien：不気味・歪み → DARK'}] },
    { id:'flowers', type:'asteroid', name:'FLOWERS', jp:'花', items:['Rose','Orchid','Plumeria / Hibiscus','Blooming'],
      related:[{to:'romantic',note:'Rose：ロマンティックな解釈 → ROMANTIC'},{to:'dark',note:'Rose・Orchid：暗い植物の解釈 → DARK'}] },
    { id:'flame', type:'asteroid', name:'FLAME', jp:'炎', items:['Fire Flame','Hot Rod','Punk Rock'],
      related:[{to:'revival',note:'レトロ・ホットロッド → REVIVAL'},{to:'dark',note:'暗いグラフィティの炎 → DARK / Street'}] },
    { id:'fungi', type:'asteroid', name:'FUNGI', jp:'菌', items:['Mushroom','Spore','Mycelium','Fungi','Psychedelic'], related:[] },  // 菌の帯(2026-11-11追加)。帯だけでは惑星を決めない
    { id:'fabric', type:'asteroid', name:'FABRIC', jp:'布・裁縫', items:['Button','Thread','Embroidery','Knit','Denim','Sewing','Ribbon','Lace'], related:[] },  // 布の帯(2026-11-11追加)。Button・Ribbon・LaceはDECORATIONと重なってOK
  ],
  textures: [
    { id:'glaze', type:'nebula', name:'GLAZE', jp:'グレーズ', color:['#f4e4d6','#fff6ee'], pos:[4,6,-8], related:['natural'], items:['Skin-like Shine','Creamy Gloss','Natural Translucency'],
      desc:'clean girl由来。肌なじみのいい、やわらかくクリーミーなツヤ。' },
    { id:'chrome', type:'nebula', name:'CHROME', jp:'クロム', color:['#cfd8e6','#8fa2c4'], pos:[14,8,-6], related:['metallic','revival'], items:['Mirror Shine','Ice Nails','Juicy Nails'],
      desc:'Y2K・ギャル文脈。鏡のような金属のツヤ。氷ネイル＝平面で光を反射、うるうるネイル＝内側から光がにじむ。' },
    { id:'sea', type:'nebula', name:'SEA', jp:'海', color:['#9fd8df','#7aa6e8'], pos:[6,-10,-2], related:['revival','romantic'], items:['Mermaidcore','Summer Siren'],
      desc:'貝殻やうろこ、水のゆらぎ。2026年夏のトレンド。' },
    { id:'tumblr', type:'nebula', name:'TUMBLR', jp:'Tumblr系', color:['#b9a4e8','#f0b8d8'], pos:[-4,9,-9], related:['romantic','dark'], items:['Clouds','Galaxy','Large Glitter','Soft Grunge','Shooting Stars','Constellations','Rainbows','Scattered Hearts'],
      desc:'2010年代のTumblrの空気。雲、ギャラクシー、大粒のラメ、ソフトグランジ。' },
    { id:'grunge', type:'nebula', name:'GRUNGE TECHNIQUES', jp:'グランジの技法', color:['#8a7a8e','#4a3a52'], pos:[-15,-8,-2], related:['dark'], items:['Ink Art','Nuance Art','Blurred Textures','Marble'],
      desc:'にじみや大理石のような模様。輪郭が残るぶん、印象派とダブ音楽の中間のような表現。' },
  ],
  // トレンド=彗星。state: emerging(生まれたて) / active(いま輝く) / archived(アーカイブ。消さずに残す)
  trends: [
    { id:'rosalie', type:'comet', name:'Rosalie Core', state:'active', comet:'pearl', color:'#efc3d3', path:['romantic'], related:['romantic'],
      desc:'バラがモチーフの、ROMANTIC寄りのトレンド。西洋的で甘さのある花のコア。' },
    { id:'lotus', type:'comet', name:'Lotus Core', state:'emerging', comet:'crystal', color:'#bfe3d6', path:[], related:[], // どの惑星にも属さず、自由に漂う彗星
      desc:'蓮・水・翡翠。オリエンタルで鉱物のような質感のミント、印象派の現代版。Rosalie Coreの隣を進む。' },
    { id:'mauve', type:'comet', name:'Mauve', state:'active', comet:'nebula', color:'#b79ad6', path:['romantic','dark','revival'], related:['romantic','dark','revival'],
      desc:'くすみパープル・暗めパープルに、明るめパープルの差し色。解釈しだいで複数の惑星を行き来する。' },
    { id:'mintwave', type:'comet', name:'Mint Core', state:'active', comet:'crystal', color:'#8fe6c4', path:[], related:[],
      desc:'平成ノスタルジーから続くミントの流れ。ここからLotus Coreが生まれた。ミント色の尾を引いて、どの惑星にも属さず漂う。' },
  ],
  // 中心の恒星=展示のキャプション(この宇宙を作った経緯・考え方・見どころ・感謝)。ここを書き換えれば反映される
  statement: {
    title:'ABOUT THIS GALAXY', jp:'この銀河について',
    sections:[
      { h:'WITH YOU — お客様と一緒に', p:'音楽やファッションにジャンルがあるように、ネイルにもさまざまなデザインがあります。たくさんのお客様との出会いを通して、こんなにも多くの表現ができることを、お客様と一緒に作ってきました。世界中のトレンドやカルチャーを知っていくなかで、リスペクトを忘れずに、私自身もその当事者として、それぞれをつなぐハブ的な存在でありたいと思っています。' },
      { h:'WHY A GALAXY — この形にした理由', p:'ゲーム「スカイリム」のスキルツリーを知っていますか？スカイリムでは、主人公の剣術や魔法などの技能が、夜空の星座として描かれています。技能を使うほど腕が上がり、新しい能力を覚えるたびに、星座の星がひとつずつ灯っていく仕組みです。私の中の知識や技術も、それと同じように、少しずつ枝分かれしながら増えていきます。それは宇宙が広がっていくようでもあり、ニューロンからシナプスが伸びてつながっていく感覚にも似ています。その広がりをひとつにまとめて、目に見える形にしてみたいと思いました。' },
      { h:'HOW IT IS MAPPED — 分類の考え方', p:'分類の軸は「技法の近さ」と「トーンの近さ（暗い⇔明るい）」の二つ。同じ技法でもトーンが違えば、別の惑星に置いています。流行は彗星のように現れては去っていき、モチーフはどの惑星にも行き来できる。けれど、5つの惑星は動きません。' },
      { h:'FROM COMET TO STAR — 彗星から星へ', p:'トレンドは、やがて定番のアートへ。それは、彗星が衝突をくり返しながら、いつか星になっていくような。そんなロマンを、私は感じています。' },
      { h:'HIGHLIGHTS — 見どころ', p:'惑星はそれぞれ違う素材でできています。真珠層のROMANTIC、液体金属のMETALLIC、黒い岩石のDARK、空気のNATURAL、ホログラムのREVIVAL。向かい合う惑星を結ぶ星座や、遠くで静かに光るトレンドのアーカイブ、ときどき現れるUFOも探してみてください。' },
      { h:'MUSIC — 音とネイル', p:'ファッションやタトゥーが音楽と一緒に育ってきたように、ネイルもその隣にいます。パンク、グランジ、ゴス、ヒップホップ。ネイルのジャンルの多くは、音楽のシーンから生まれてきました。あなたの好きな音楽の惑星は、どこにありますか。' },
      { h:'PLAN — 名前に込めたこと', p:'Planという名前には、ネイルのその先に目的がある、という思いを込めています。ネイルをすることだけが、すべてじゃない。よく耳にするPDCAサイクル（Plan・Do・Check・Act＝計画・実行・評価・改善）のようなイメージが現実的ですが、最初は、Planがplanet（惑星）になり、planetarium（プラネタリウム）へと育っていけたら面白いなと、ちょっと宇宙征服のようなことも考えていました。' },
      { h:'FINALLY — 最後に', p:'この宇宙で、あなたのワクワクするものを探してみてください。<br>遊び心を忘れずに、時には自身の背景について考えるのも大切です。<br><br>誰かに言いたくなっちゃうようなワクワク感<br>それは目には見えなくても<br>引力を持っている＝魅力なんだと私は考えます。<br><br>そのワクワクをネイルに<br>日々技術を高めている全てのネイリストを代表して' },
    ],
    sign:'Plan.nail Haruna — Okinawa, 2026'
  },
  // 思想の軸(BELIEF AXIS):「なぜその爪にするのか」。惑星ではなく、星雲をまとったパルサー(中性子星)として置く。ここに足せば増やせる
  beliefs: [
    { id:'punk', name:'PUNK SPIRIT', aliases:['Punk','Punk Spirit','パンク'], tags:'ANTI-WAR / ANTI-ESTABLISHMENT / DIY', pos:[-27,-16,14], size:20, seed:2.3, pulse:1.7, // DARKよりさらに左下、手前側(最初の画面からは外れる)
      colors:{ outer:'#9c0f1f', mid:'#6b2a9e', inner:'#5a8cff' },
      quote:'An expression of resistance, freedom, and individuality.', descEn:'A rebellious spirit and anti-authoritarianism. Questioning what is called “common sense”, and refusing to obey authority blindly. Not having things made for you, but making your own culture yourself — DIY. Its look may live on DARK, but what lies behind it is the belief itself. An anarchy mark faintly emerges from the shimmering nebula, and the light it sometimes releases reaches every planet.',
      desc:'反骨精神と反権威主義。「常識」と呼ばれるものに疑問を持ち、権威に盲従しない。誰かに作ってもらうのではなく、自分の文化を自分で作る——DIY。見た目の居場所はDARKでも、その奥にあるのは思想そのもの。ゆらめく星雲の中に、アナーキーマークがかすかに浮かぶ。ときどき放たれる光は、どの惑星にも届く。' },
  ],
  // 星座=ジャンル同士の関係
  relationships: [
    { id:'c1', type:'constellation', a:'romantic', b:'metallic', name:'ROMANTIC ↔ METALLIC', note:'有機的な柔らかさ ⇔ 機械的な硬さ' },
    { id:'c2', type:'constellation', a:'dark', b:'natural', name:'DARK ↔ NATURAL', note:'内省 ⇔ 頑張ってない風の完璧' },
    { id:'c3', type:'constellation', a:'natural', b:'revival', name:'NATURAL ↔ REVIVAL', note:'頑張ってない風の完璧 ⇔ 時代の再解釈' },
    { id:'c4', type:'constellation', a:'dark', b:'revival', name:'DARK ↔ REVIVAL', note:'オルタナティブ、パンク、グランジ。反骨と、時代の再解釈がつながる' },
    { id:'c5', type:'constellation', a:'metallic', b:'revival', name:'METALLIC ↔ REVIVAL', note:'Y2Kの美学、電子音楽、レトロフューチャー' },
  ],
  // 音楽:惑星ごとの「近い音楽」と、音の波のリズム。ここを書き換えれば宇宙に反映される
  music: {
    romantic:{ wave:'soft',  label:'SOFT WAVES', genres:['Dream Pop','J-POP Girl Groups'],
      note:'ふわりと揺らぐ、やわらかな音。透け感と甘さのあるネイルと同じ温度。' },
    metallic:{ wave:'electronic', label:'ELECTRONIC WAVES', genres:['Hyperpop','Techno'],
      note:'鋭く、正確に刻まれる電子の音。金属の反射や、構造の美しさと響き合う。' },
    dark:{ wave:'low', label:'LOW FREQUENCY WAVES', genres:['Goth Rock','Grunge','Industrial','Hip Hop'],
      note:'低く重い、ゆっくりとした響き。陰翳や反骨を抱えたネイルの、内側の鼓動。' },
    natural:{ wave:'ambient', label:'AMBIENT WAVES', genres:['Lo-fi','Neo Soul','Ambient'],
      note:'静かに広がる、輪郭のない音。肌になじむネイルの、余白のような心地よさ。' },
    revival:{ wave:'high', label:'HIGH ENERGY WAVES', genres:['Punk Rock','2000s Pop','R&B','Trap','Rockabilly'],
      note:'速く跳ねる、時代を行き来する音。過去を今の感覚で鳴らし直す、再解釈のビート。' },
  },
};

// 光:本編と入口で同じ当たり方にする
function addLights(scene){
  scene.add(new THREE.AmbientLight(0x5f5870, 0.6));
  const core = new THREE.PointLight(0xfff1e6, 1.5, 140); scene.add(core);
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(18, 22, 16); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa79cff, 0.5); rim.position.set(-22, 10, -14); scene.add(rim);
  return { core, key, rim }; }

const rnd = (a,b)=> a + Math.random()*(b-a);
function canvasTex(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
function glowTex(color, soft){ return canvasTex(128,128,(g,w,h)=>{ const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2); r.addColorStop(0,color); r.addColorStop(soft?.2:.35,color+'99'); r.addColorStop(1,'#00000000'); g.fillStyle=r; g.fillRect(0,0,w,h); }); }
// なめらかな疑似ノイズ(外部ライブラリなし)
function noise3(x,y,z){ return Math.sin(x*1.7+Math.sin(y*2.3))*.5 + Math.sin(y*1.9+Math.sin(z*1.3))*.3 + Math.sin(z*2.6+Math.sin(x*.9))*.2; }

// ── 宇宙の環境:無数の星くずと、オーロラのような星間ガス ──
const NOISE_GLSL=`float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*n3(p); p*=2.07; a*=0.5; } return s; }`;

/* ---------- 4. 惑星ごとに違う「素材」 ---------- */
// 黒い鉱物のテクスチャ(手続き的に毎回ちがう模様を作るので、くり返しが目立たない)
function mineralTextures(W,H,seedScale){
  const height=document.createElement('canvas'); height.width=W; height.height=H; const hg=height.getContext('2d');
  hg.fillStyle='#808080'; hg.fillRect(0,0,W,H);
  // いくつもの細かさのノイズを重ねる(粗い起伏〜細かな粒)
  [6,12,24,48,96,200].forEach((cells,i)=>{ const c=document.createElement('canvas'); c.width=cells*2; c.height=cells; const x=c.getContext('2d'); const d=x.createImageData(c.width,c.height);
    for(let k=0;k<d.data.length;k+=4){ const v=Math.random()*255; d.data[k]=d.data[k+1]=d.data[k+2]=v; d.data[k+3]=255; } x.putImageData(d,0,0);
    hg.globalAlpha=[.5,.4,.32,.26,.22,.2][i]; hg.imageSmoothingEnabled=true; hg.drawImage(c,0,0,W,H); });
  hg.globalAlpha=1;
  // 小さな穴・くぼみ
  for(let i=0;i<900*seedScale;i++){ const x=rnd(0,W), y=rnd(0,H), r=Math.pow(Math.random(),3)*7+.6; const gr=hg.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(0,0,0,.75)'); gr.addColorStop(1,'rgba(0,0,0,0)'); hg.fillStyle=gr; hg.beginPath(); hg.arc(x,y,r,0,7); hg.fill(); }
  // 自然なひび割れ(枝分かれする細い線)
  hg.strokeStyle='rgba(0,0,0,.85)';
  for(let i=0;i<34*seedScale;i++){ let x=rnd(0,W), y=rnd(0,H), a=rnd(0,6.28); hg.lineWidth=rnd(.5,1.6); hg.beginPath(); hg.moveTo(x,y);
    for(let k=0;k<rnd(6,16);k++){ a+=rnd(-.7,.7); x+=Math.cos(a)*rnd(6,22); y+=Math.sin(a)*rnd(3,12); hg.lineTo(x,y); if(Math.random()<.15){ hg.stroke(); hg.beginPath(); hg.moveTo(x,y); hg.lineWidth*=.7; } } hg.stroke(); }
  const H8=hg.getImageData(0,0,W,H).data;
  // なめらかな黒曜石の領域(大きなまだら)
  const smooth=document.createElement('canvas'); smooth.width=W; smooth.height=H; const sg=smooth.getContext('2d');
  { const c=document.createElement('canvas'); c.width=10; c.height=5; const x=c.getContext('2d'); const d=x.createImageData(10,5); for(let k=0;k<d.data.length;k+=4){ const v=Math.random()*255; d.data[k]=d.data[k+1]=d.data[k+2]=v; d.data[k+3]=255; } x.putImageData(d,0,0); sg.drawImage(c,0,0,W,H); }
  const S8=sg.getImageData(0,0,W,H).data;
  const map=document.createElement('canvas'); map.width=W; map.height=H; const mg=map.getContext('2d'); const md=mg.createImageData(W,H);
  const orm=document.createElement('canvas'); orm.width=W; orm.height=H; const og=orm.getContext('2d'); const od=og.createImageData(W,H);
  for(let k=0;k<md.data.length;k+=4){ const v=H8[k]/255, sm=S8[k]/255; const obs=sm>.62?1:0; // 黒曜石の部分
    const base=10+Math.pow(v,1.6)*34;            // ほぼ黒〜グラファイト
    md.data[k]=base*0.96; md.data[k+1]=base*0.96; md.data[k+2]=base*1.04; md.data[k+3]=255;
    od.data[k]=255; od.data[k+1]= obs? 70+v*40 : 175+v*70;    // G=ざらつき(黒曜石は少しなめらか)
    od.data[k+2]= obs? 70 : 25; od.data[k+3]=255; }           // B=金属っぽさ(控えめ)
  // 岩に埋まった小さな金属の粒(銀・ガンメタル)
  for(let i=0;i<5200*seedScale;i++){ const x=Math.floor(rnd(0,W)), y=Math.floor(rnd(0,H)); const big=Math.random()<.08; const r=big?2:1;
    for(let dy=0;dy<r;dy++) for(let dx=0;dx<r;dx++){ const k=((y+dy)%H*W+(x+dx)%W)*4; const sv=big?150:rnd(70,130);
      md.data[k]=sv; md.data[k+1]=sv; md.data[k+2]=sv*1.05; od.data[k+1]=40; od.data[k+2]=255; } }
  mg.putImageData(md,0,0); og.putImageData(od,0,0);
  const toTex=(cv,srgb)=>{ const t=new THREE.CanvasTexture(cv); if(srgb) t.encoding=THREE.sRGBEncoding; t.anisotropy=4; return t; };
  return { map:toTex(map,true), bump:toTex(height,false), orm:toTex(orm,false) }; }
// DARKの月を、サブジャンルの性格に合わせて作り分ける(博物館の標本のように、素材ごとにリアルな質感)
const _specTex={};
function specTex(key, fn){ return _specTex[key] || (_specTex[key]=fn()); }
function stoneMat(seed, opt){ const T=specTex('stone'+seed,()=>mineralTextures(512,256,.7));
  return new THREE.MeshStandardMaterial(Object.assign({ map:T.map, bumpMap:T.bump, bumpScale:1.3, roughnessMap:T.orm, metalnessMap:T.orm, roughness:1, metalness:.55, envMapIntensity:.8 }, opt||{})); }
function debris(root, r, n, mat, spread){ const g=new THREE.IcosahedronGeometry(1,0); const im=new THREE.InstancedMesh(g, mat, n); const m=new THREE.Matrix4(), q=new THREE.Quaternion(), s=new THREE.Vector3(), p=new THREE.Vector3();
  for(let k=0;k<n;k++){ p.set(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize().multiplyScalar(r*rnd(1,spread)); q.setFromEuler(new THREE.Euler(rnd(0,6),rnd(0,6),rnd(0,6))); s.setScalar(r*rnd(.03,.09)); m.compose(p,q,s); im.setMatrixAt(k,m); }
  root.add(im); }
function darkMoon(name, r, i){
  if(name==='Gothic' || name==='Extreme'){ // 黒い玄武岩/古い大聖堂の石(Extremeは今は同じ黒い石の標本)
    const geo=displace(displace(new THREE.IcosahedronGeometry(r*1.05,4),.16,2.2),.035,8);
    return new THREE.Mesh(geo, stoneMat(name==='Gothic'?1:2, { color:name==='Gothic'?0xbfbfc4:0xa8a8ae, roughness:.95 })); }
  if(name==='Grunge'){ // 割れた岩:風化した外側は暗くざらざら、割れた断面は少し明るくなめらか
    const outer=stoneMat(3,{ color:0x9c9ca2, roughness:1, flatShading:true });
    const face=new THREE.MeshStandardMaterial({ color:0x4a4a50, roughness:.62, metalness:.25, flatShading:true, envMapIntensity:.9 });
    const root=new THREE.Mesh(displace(new THREE.IcosahedronGeometry(r*.72,1),.22,2.4), outer);
    for(let k=0;k<6;k++){ const s=new THREE.Mesh(displace(new THREE.IcosahedronGeometry(r*rnd(.28,.48),0),.3,3), k%2?face:outer); const a=k/6*Math.PI*2;
      s.position.set(Math.cos(a)*r*.82, rnd(-.25,.25)*r, Math.sin(a)*r*.82); s.rotation.set(rnd(0,3),rnd(0,3),rnd(0,3)); root.add(s); }
    debris(root, r, 26, face, 1.6); return root; }
  if(name==='Mystic'){ // 天然のアメジスト:根元は深い紫、先へ向かって淡いラベンダーと透明な水晶へ
    const h=r*2.4, body=new THREE.CylinderGeometry(r*.55,r*.62,h*.62,6,4), tip=new THREE.ConeGeometry(r*.55,h*.42,6,2);
    tip.translate(0,h*.52,0); const geo=mergeGeos([body,tip]);
    const pos=geo.attributes.position, col=new Float32Array(pos.count*3), cA=new THREE.Color('#3d1d6e'), cB=new THREE.Color('#9a78d0'), cC=new THREE.Color('#ece6f6');
    for(let k=0;k<pos.count;k++){ const y=(pos.getY(k)+h*.31)/(h*1.04); pos.setX(k,pos.getX(k)*(1+rnd(-.06,.06))); pos.setZ(k,pos.getZ(k)*(1+rnd(-.06,.06))); // 自然な面のゆらぎ
      const c=y<.55? cA.clone().lerp(cB,y/.55) : cB.clone().lerp(cC,(y-.55)/.45); col[k*3]=c.r; col[k*3+1]=c.g; col[k*3+2]=c.b; }
    geo.setAttribute('color',new THREE.BufferAttribute(col,3)); geo.computeVertexNormals();
    const root=new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors:true, metalness:0, roughness:.06, transparent:true, opacity:.8, clearcoat:1, clearcoatRoughness:.05, flatShading:true, envMapIntensity:1.6, emissive:0x2a1450, emissiveIntensity:.25, depthWrite:false }));
    root.rotation.z=.25; root.position.y-=r*.2;
    // 中の内包物・くもり・小さなひび(白く細かな粒)
    const n=70, ip=new Float32Array(n*3); for(let k=0;k<n;k++){ ip[k*3]=rnd(-.35,.35)*r; ip[k*3+1]=rnd(-.25,.9)*h*.5; ip[k*3+2]=rnd(-.35,.35)*r; }
    const ig=new THREE.BufferGeometry(); ig.setAttribute('position',new THREE.BufferAttribute(ip,3));
    root.add(new THREE.Points(ig,new THREE.PointsMaterial({ color:0xf3eaff, size:.03, transparent:true, opacity:.6, depthWrite:false })));
    const veil=new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex('#efe6ff',true), transparent:true, opacity:.18, depthWrite:false })); veil.scale.set(r*.9,r*1.6,1); veil.position.y=h*.05; root.add(veil);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex('#8a62d0',true), transparent:true, opacity:.22, depthWrite:false, blending:THREE.AdditiveBlending })); glow.scale.setScalar(r*3.2); root.add(glow);
    return root; }
  if(name==='Cyber'){ // 隕鉄:研磨された面、酸化した暗い部分、ウィドマンシュテッテン模様、細かな傷
    const T=specTex('iron',()=>{ const W=512,H=256; const map=document.createElement('canvas'); map.width=W; map.height=H; const g=map.getContext('2d');
      g.fillStyle='#6d7179'; g.fillRect(0,0,W,H);
      [0,60,120].forEach((ang,ai)=>{ g.save(); g.translate(W/2,H/2); g.rotate(ang*Math.PI/180); for(let k=-W;k<W;k+=rnd(6,16)){ g.fillStyle=`rgba(${ai?200:170},${ai?204:174},${ai?212:182},${rnd(.05,.16)})`; g.fillRect(k,-H,rnd(1.5,4),H*2); } g.restore(); }); // 結晶の交差模様
      for(let k=0;k<26;k++){ const x=rnd(0,W), y=rnd(0,H), rr=rnd(10,50); const gr=g.createRadialGradient(x,y,0,x,y,rr); gr.addColorStop(0,'rgba(40,36,34,.55)'); gr.addColorStop(1,'rgba(40,36,34,0)'); g.fillStyle=gr; g.fillRect(x-rr,y-rr,rr*2,rr*2); } // 酸化
      g.strokeStyle='rgba(230,232,238,.25)'; for(let k=0;k<160;k++){ g.lineWidth=rnd(.3,.8); g.beginPath(); const x=rnd(0,W), y=rnd(0,H); g.moveTo(x,y); g.lineTo(x+rnd(-30,30),y+rnd(-6,6)); g.stroke(); } // 傷
      g.strokeStyle='rgba(20,22,26,.35)'; g.lineWidth=.8; for(let k=0;k<6;k++){ g.beginPath(); let x=rnd(0,W), y=rnd(0,H); g.moveTo(x,y); for(let s=0;s<5;s++){ if(Math.random()<.5) x+=rnd(10,40); else y+=rnd(-20,20); g.lineTo(x,y); } g.stroke(); } // ごく淡い回路のような刻み
      const t=new THREE.CanvasTexture(map); t.encoding=THREE.sRGBEncoding; return t; });
    return new THREE.Mesh(displace(new THREE.IcosahedronGeometry(r,2),.07,3), new THREE.MeshStandardMaterial({ map:T, bumpMap:T, bumpScale:.4, color:0xd6d8de, metalness:.92, roughness:.42, flatShading:true, envMapIntensity:1.1 })); }
  if(name==='Street'){ // 壊れた鉄筋コンクリートの破片(壁やスラブのかけら)。①コンクリートの塊 ②錆びた鉄筋2本 ③「Plan」の落書き(デカール)を別々の形で作る
    const HX=1.15*r, HY=.8*r, HZ=.48*r; // 幅広い正面、はっきりした厚み
    // ① 本体:箱から始めて、角を斜めに割り落とし、上と右の割れ口だけ大きくガタガタにする(丸くしない)
    const geo=new THREE.BoxGeometry(HX*2,HY*2,HZ*2,14,10,6); const p=geo.attributes.position, v=new THREE.Vector3();
    const cuts=[[ .75, .66,0, HX*.92],[-.8,.6,.1,HX*.9],[-.7,-.7,0,HX*.95],[.2,.95,.25,HY*1.0],[.55,-.83,-.1,HX*.82]].map(([x,y,z,d])=>({n:new THREE.Vector3(x,y,z).normalize(),d}));
    for(let k=0;k<p.count;k++){ v.fromBufferAttribute(p,k);
      cuts.forEach(c=>{ const dd=v.dot(c.n)-c.d; if(dd>0) v.addScaledVector(c.n,-dd); });                 // 角を斜めに割る
      const top=Math.max(0,(v.y/HY-.55)/.45), right=Math.max(0,(v.x/HX-.6)/.4);                          // 上と右は割れ口
      const j=noise3(v.x*6/r,v.y*6/r,v.z*6/r);
      v.y += top*(-Math.abs(j)*.16*r); v.x += right*(-Math.abs(j)*.12*r); // 割れ口は内側へ欠けるだけ(外へ垂れ下がる塊を作らない)
      if(Math.abs(v.z)>HZ*.98){ v.z += (noise3(v.x*3/r,v.y*3/r,1.7)-.5)*.03*r; }                          // 正面と背面はほぼ平ら(少しだけ不陸)
      else { v.x += (noise3(v.x*9/r,v.y*9/r,v.z*9/r)-.5)*.03*r; v.y += (noise3(v.y*9/r,v.z*9/r,v.x*9/r)-.5)*.03*r; } // 側面のこまかな欠け
      p.setXYZ(k,v.x,v.y,v.z); }
    geo.computeVertexNormals();
    const concrete=canvasTex(512,512,(cx,w,hh)=>{ cx.fillStyle='#807d77'; cx.fillRect(0,0,w,hh);
      for(let k=0;k<50;k++){ const x=rnd(0,w), y=rnd(0,hh), rr=rnd(40,170); const g=cx.createRadialGradient(x,y,0,x,y,rr); const t=Math.random();
        g.addColorStop(0, t<.45?'rgba(60,57,52,.24)':(t<.8?'rgba(152,147,138,.2)':'rgba(138,126,108,.15)')); g.addColorStop(1,'rgba(0,0,0,0)'); cx.fillStyle=g; cx.fillRect(x-rr,y-rr,rr*2,rr*2); }
      for(let k=0;k<2400;k++){ cx.fillStyle=Math.random()<.55?`rgba(${rnd(45,72)},${rnd(45,70)},${rnd(42,64)},.25)`:`rgba(${rnd(160,192)},${rnd(156,188)},${rnd(148,178)},.18)`; cx.fillRect(rnd(0,w),rnd(0,hh),rnd(.6,2),rnd(.6,2)); }
      for(let k=0;k<120;k++){ const x=rnd(0,w), y=rnd(0,hh), rr=Math.pow(Math.random(),2)*11+2; const dark=Math.random()<.35;
        cx.fillStyle=dark?`rgb(${rnd(34,54)},${rnd(34,52)},${rnd(32,48)})`:`rgb(${rnd(108,150)},${rnd(100,138)},${rnd(88,122)})`; cx.beginPath(); cx.ellipse(x,y,rr,rr*rnd(.5,1),rnd(0,3),0,7); cx.fill(); }
      for(let k=0;k<150;k++){ const x=rnd(0,w), y=rnd(0,hh), rr=rnd(.8,2.6); cx.fillStyle='rgba(26,24,22,.6)'; cx.beginPath(); cx.arc(x,y,rr,0,7); cx.fill(); }   // 気泡は控えめに
      cx.strokeStyle='rgba(28,26,24,.55)'; for(let k=0;k<8;k++){ cx.lineWidth=rnd(.6,1.4); cx.beginPath(); let x=rnd(0,w), y=rnd(0,hh); cx.moveTo(x,y); for(let s=0;s<rnd(5,12);s++){ x+=rnd(-28,28); y+=rnd(-28,28); cx.lineTo(x,y); } cx.stroke(); } });
    const root=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({ map:concrete, bumpMap:concrete, bumpScale:1.8, roughness:1, metalness:0 }));
    // ② 鉄筋:右の割れ口の同じ場所から2本。中に埋まり、外へ短く、でもはっきり見える太さで
    const rustTex=specTex('rust',()=>canvasTex(128,64,(cx,w,hh)=>{ cx.fillStyle='#5a2e1a'; cx.fillRect(0,0,w,hh); for(let k=0;k<900;k++){ cx.fillStyle=Math.random()<.5?`rgba(${rnd(130,175)},${rnd(65,95)},${rnd(25,45)},.55)`:`rgba(${rnd(30,50)},${rnd(18,28)},${rnd(12,20)},.5)`; cx.fillRect(rnd(0,w),rnd(0,hh),rnd(1,3),rnd(1,3)); } }));
    const rustM=new THREE.MeshStandardMaterial({ map:rustTex, bumpMap:rustTex, bumpScale:2, roughness:.8, metalness:.5 });
    const ribbed=(len,rad)=>{ const g=new THREE.CylinderGeometry(rad,rad,len,12,40); const q=g.attributes.position; for(let k=0;k<q.count;k++){ const y=q.getY(k); const rib=1+.22*Math.max(0,Math.sin(y/len*40*Math.PI))+rnd(-.03,.03); q.setX(k,q.getX(k)*rib); q.setZ(k,q.getZ(k)*rib); } g.computeVertexNormals(); return g; };
    [[.18,.12],[-.06,-.1]].forEach(([y,z],i)=>{ const len=r*1.6; const bar=new THREE.Mesh(ribbed(len,r*.075),rustM); bar.rotation.z=Math.PI/2+(i?-.06:.05); bar.rotation.y=(i?.08:-.05);
      bar.position.set(HX + .42*r - len*.5, y*r, z*r); root.add(bar);
      // 鉄筋の出口:小さく割れたくぼみ(ギザギザの暗い縁と、のぞく骨材)
      const sh=new THREE.Shape(); const N=14; for(let k=0;k<=N;k++){ const a=k/N*Math.PI*2, rr=r*(.13+Math.random()*.06); const px=Math.cos(a)*rr, py=Math.sin(a)*rr; k?sh.lineTo(px,py):sh.moveTo(px,py); }
      const hole=new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color:0x3a3733, roughness:1, metalness:0, polygonOffset:true, polygonOffsetFactor:-2 }));
      hole.rotation.y=Math.PI/2; hole.position.set(HX-.03*r, y*r, z*r); root.add(hole);
      for(let k=0;k<5;k++){ const ag=new THREE.Mesh(new THREE.IcosahedronGeometry(r*rnd(.018,.03),0), new THREE.MeshStandardMaterial({ color:Math.random()<.5?0x5a5650:0x8a8174, roughness:1, flatShading:true })); const a=rnd(0,6.28); ag.position.set(HX-.03*r, y*r+Math.sin(a)*r*.12, z*r+Math.cos(a)*r*.12); root.add(ag); } });                                 // 外に出ているのは先の約0.4rだけ
    // ③ 落書き:正面(+Z)の左下の端に、薄い板(デカール)として貼る。面がほぼ平らなので、面にぴったり沿う
    // 手で描いたグラフィティのタグ「Plan」(フォントは使わず、角ばった線を1本ずつ描く)
    const tagTex=canvasTex(512,256,(cx,w,hh)=>{ const t=document.createElement('canvas'); t.width=w; t.height=hh; const g=t.getContext('2d'); g.fillStyle='#0b0b0b'; g.strokeStyle='#0b0b0b';
      // 太さが変わる線(始まり→途中→終わりで太さを変え、先は鋭く)
      const stroke=(pts,w0,w1,w2)=>{ const L=[],R=[]; for(let i=0;i<pts.length;i++){ const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let dx=b[0]-a[0], dy=b[1]-a[1]; const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l;
          const u=i/(pts.length-1), ww=(u<.5? w0+(w1-w0)*u*2 : w1+(w2-w1)*(u-.5)*2)*1.9*(0.85+Math.random()*.3)/2; L.push([pts[i][0]-dy*ww, pts[i][1]+dx*ww]); R.push([pts[i][0]+dy*ww, pts[i][1]-dx*ww]); }
        g.beginPath(); g.moveTo(L[0][0],L[0][1]); L.forEach(q=>g.lineTo(q[0],q[1])); R.reverse().forEach(q=>g.lineTo(q[0],q[1])); g.closePath(); g.fill(); };
      g.save(); g.translate(0,-18); g.transform(1,-.06,-.22,1,40,0); // 全体を少し右上がり・前傾に
      // P:長い縦線(下に鋭いはね)と、角ばったループ
      stroke([[78,222],[86,160],[96,96],[108,38]],7,16,3); stroke([[70,232],[60,246],[44,252]],10,6,1);
      stroke([[100,46],[150,34],[184,52],[170,96],[132,116],[96,112]],5,14,4);
      // l:細く高い縦線から、鋭いキック
      stroke([[214,26],[206,110],[198,196]],3,13,8); stroke([[198,196],[232,186],[250,170]],9,6,1);
      // a:三角に近い角ばった形と、はねる尻尾(lと少し重ねてつなげる)
      stroke([[292,124],[248,134],[236,188],[280,184],[300,126],[294,196],[322,206]],5,14,2);
      // n:ジグザグの山と、上へ飛び出す鋭い先
      stroke([[330,200],[344,128],[366,192],[386,124],[398,190]],6,13,7); stroke([[386,124],[404,96],[420,84]],8,5,1);
      // 下のはね上がる線と、たれ
      stroke([[40,238],[150,252],[280,246],[400,218],[468,176]],3,15,1);
      g.restore();
      g.lineCap='round'; [[118,228,16],[200,230,24],[292,222,14]].forEach(([x,y,len])=>{ g.lineWidth=2.6; g.beginPath(); g.moveTo(x,y); g.lineTo(x+1,y+len); g.stroke(); g.beginPath(); g.arc(x+1,y+len,2.4,0,7); g.fill(); }); // スプレーのたれ
      // 塗りむら・かすれ
      const d=g.getImageData(0,0,w,hh); for(let k=0;k<d.data.length;k+=4){ if(d.data[k+3]>0){ const n=Math.random(); d.data[k+3]*= n<.05?.35:(n<.18?.75:1); } } g.putImageData(d,0,0);
      // オーバースプレー(ぼかした霧)と、まわりに飛んだ細かな粒
      cx.globalAlpha=.3; cx.filter='blur(3px)'; cx.drawImage(t,0,0); cx.filter='none';
      cx.globalAlpha=.5; cx.fillStyle='#111'; const tg=t.getContext('2d').getImageData(0,0,w,hh).data;
      for(let k=0;k<1800;k++){ const x=Math.floor(rnd(0,w)), y=Math.floor(rnd(0,hh)); let near=false; for(let s2=0;s2<3&&!near;s2++){ const xx=Math.min(w-1,Math.max(0,x+Math.floor(rnd(-7,7)))), yy=Math.min(hh-1,Math.max(0,y+Math.floor(rnd(-7,7)))); if(tg[(yy*w+xx)*4+3]>0) near=true; } if(near) cx.fillRect(x,y,rnd(.6,1.6),rnd(.6,1.6)); }
      cx.globalAlpha=.92; cx.drawImage(t,0,0); cx.globalAlpha=1; });
    const tag=new THREE.Mesh(new THREE.PlaneGeometry(HX*1.0,HX*.5), new THREE.MeshStandardMaterial({ map:tagTex, transparent:true, roughness:1, metalness:0, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 }));
    // 落書きは今は外している(戻すときは root.add(tag) を有効に)
    // 小さな瓦礫を、塊のそばにランダムに3つ(鉄筋の出口からは離して、塊から少し浮かせる)
    for(let k=0;k<3;k++){ const s=Math.random(); const pg=new THREE.BoxGeometry(r*rnd(.12,.2),r*rnd(.09,.16),r*rnd(.1,.18),2,2,2); const q=pg.attributes.position;
      for(let j=0;j<q.count;j++){ q.setXYZ(j, q.getX(j)*(1+rnd(-.25,.25)), q.getY(j)*(1+rnd(-.25,.25)), q.getZ(j)*(1+rnd(-.25,.25))); } pg.computeVertexNormals();
      const piece=new THREE.Mesh(pg, root.material);
      const a=rnd(Math.PI*.55,Math.PI*1.75), el=rnd(-.6,.6); // 左・上下・奥側に散らす(右の鉄筋側は避ける)
      piece.position.set(Math.cos(a)*HX*rnd(1.35,1.75), el*HY*1.6, Math.sin(a)*HZ*rnd(1.6,2.6)); piece.rotation.set(rnd(0,6),rnd(0,6),rnd(0,6)); root.add(piece); }
    root.rotation.y=-.35; // 正面と、鉄筋の出ている右側が両方見える向き
    return root; }
  if(name==='Piercing'){ // ピアス:インプラントグレードのチタン/サージカルステンレスのキャプティブビーズリング
    const steel=new THREE.MeshPhysicalMaterial({ color:0xdcdfe6, metalness:1, roughness:.07, clearcoat:.6, clearcoatRoughness:.05, envMapIntensity:1.8 });
    const root=new THREE.Mesh(new THREE.TorusGeometry(r*1.05,r*.16,24,72,Math.PI*1.82), steel); root.rotation.z=-Math.PI*.41; // 玉(ビーズ)が真下に来る向き
    const bead=new THREE.Mesh(new THREE.SphereGeometry(r*.32,32,20), new THREE.MeshPhysicalMaterial({ color:0xd8d6e8, metalness:1, roughness:.05, clearcoat:.8, envMapIntensity:2, sheen:new THREE.Color('#7a86c8') })); // ごくわずかな青紫の陽極酸化
    bead.position.set(Math.cos(-Math.PI*.09)*r*1.05, Math.sin(-Math.PI*.09)*r*1.05, 0); root.add(bead);
    return root; }
  return null;
}
// 複数のジオメトリを1つにまとめる(アメジストの柱と先端)
function mergeGeos(list){ const parts=list.map(g=>g.index?g.toNonIndexed():g); let n=0; parts.forEach(g=>n+=g.attributes.position.count);
  const pos=new Float32Array(n*3); let o=0; parts.forEach(g=>{ pos.set(g.attributes.position.array,o); o+=g.attributes.position.array.length; });
  const out=new THREE.BufferGeometry(); out.setAttribute('position',new THREE.BufferAttribute(pos,3)); out.computeVertexNormals(); return out; }
// DARKの衛星:1つずつ性格の違う、小さな岩のかけら
let rockTex=null;
function rockMoonMaterial(i){ if(!rockTex) rockTex=mineralTextures(256,128,.35);
  const kinds=[ {r:.95,m:.15,c:0x1a1a1e},{r:.8,m:.35,c:0x222226},{r:.55,m:.7,c:0x2a2a30},{r:.9,m:.2,c:0x141417},{r:.65,m:.55,c:0x26262c},{r:.75,m:.4,c:0x1d1d22},{r:.5,m:.8,c:0x303036} ];
  const k=kinds[i%kinds.length];
  return new THREE.MeshStandardMaterial({ color:k.c, map:rockTex.map, bumpMap:rockTex.bump, bumpScale:1.2, roughness:k.r, metalness:k.m, envMapIntensity:.9, flatShading:i%3===0 }); }

function displace(geo, amp, freq){ const p=geo.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); const n=v.clone().normalize(); const k=1+amp*noise3(n.x*freq,n.y*freq,n.z*freq); v.copy(n.multiplyScalar(v.length()*k)); p.setXYZ(i,v.x,v.y,v.z); }
  geo.computeVertexNormals(); return geo; }
const MATERIALS = {
  // ROMANTIC:真珠層・オパール・花びらの重なり
  pearl(P){ const g=new THREE.Group();
    const tex=canvasTex(512,256,(c,w,h)=>{ const lg=c.createLinearGradient(0,0,w,h); ['#f6e9df','#f1d3dc','#e6dcf0','#fbf3ea'].forEach((col,i)=>lg.addColorStop(i/3,col)); c.fillStyle=lg; c.fillRect(0,0,w,h);
      for(let i=0;i<60;i++){ c.globalAlpha=rnd(.08,.2); c.strokeStyle=['#ffffff','#f3c6d6','#cdbfe8'][i%3]; c.lineWidth=rnd(2,10); c.beginPath(); c.arc(rnd(0,w),rnd(0,h),rnd(20,90),rnd(0,3),rnd(3,6)); c.stroke(); } });
    const core=new THREE.Mesh(displace(new THREE.SphereGeometry(P.size,64,40),.03,2.2), new THREE.MeshPhysicalMaterial({ map:tex, roughness:.32, metalness:.15, clearcoat:1, clearcoatRoughness:.25, sheen:new THREE.Color('#f7d7e6') }));
    g.add(core);
    for(let i=0;i<3;i++){ const shell=new THREE.Mesh(displace(new THREE.SphereGeometry(P.size*(1.04+i*.035),48,32),.06,1.6+i), new THREE.MeshPhysicalMaterial({ color:['#ffe6ef','#efe0ff','#fff4e6'][i], transparent:true, opacity:.12, roughness:.2, clearcoat:1, depthWrite:false }));
      shell.rotation.set(rnd(0,3),rnd(0,3),0); g.add(shell); }
    g.userData.hit=core; g.userData.iri=core.material; return g; },
  // METALLIC:液体金属・磁性流体。表面がゆっくり波打つ
  chrome(P){ const geo=new THREE.SphereGeometry(P.size,72,48); geo.userData.base=geo.attributes.position.array.slice();
    const mesh=new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:0xe8ecf2, metalness:1, roughness:.08, envMapIntensity:1.4 }));
    mesh.userData.liquid=true; const g=new THREE.Group(); g.add(mesh);
    const glass=new THREE.Mesh(new THREE.SphereGeometry(P.size*1.12,48,32), new THREE.MeshPhysicalMaterial({ color:0xdfe8ff, transparent:true, opacity:.1, roughness:0, metalness:0, clearcoat:1, depthWrite:false }));
    g.add(glass); g.userData.hit=mesh; g.userData.liquid=mesh; return g; },
  // DARK:黒曜石・火山岩。不規則な岩肌に、ひびから鈍い光
  // DARK:黒い鉱物の星。黒曜石・玄武岩・隕石・鉄の鉱物。ざらついた粒、小さな穴、ひび、埋まった金属の粒
  obsidian(P){ const T=mineralTextures(1024,512,1);
    const geo=displace(displace(new THREE.SphereGeometry(P.size,128,96),.045,1.6),.012,6.5); // 大きなうねり+細かな凹凸
    const mesh=new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map:T.map, bumpMap:T.bump, bumpScale:.9, roughnessMap:T.orm, metalnessMap:T.orm,
      roughness:1, metalness:1, clearcoat:.18, clearcoatRoughness:.55, envMapIntensity:.9 }));
    const g=new THREE.Group(); g.add(mesh);
    const smoke=new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex('#2a2830',true), transparent:true, opacity:.35, depthWrite:false })); smoke.scale.setScalar(P.size*4.2); g.add(smoke);
    g.userData.hit=mesh; return g; },
  // NATURAL:アラバスター・磁器。マットな鉱物の肌
  porcelain(P){ const tex=canvasTex(512,256,(c,w,h)=>{ c.fillStyle='#efe5d6'; c.fillRect(0,0,w,h);
      for(let i=0;i<40;i++){ c.globalAlpha=rnd(.05,.14); c.strokeStyle=['#c9b49a','#fffaf2','#d8c6b0'][i%3]; c.lineWidth=rnd(.6,3); c.beginPath(); let x=0,y=rnd(0,h); c.moveTo(x,y); while(x<w){ x+=rnd(10,40); y+=rnd(-12,12); c.lineTo(x,y); } c.stroke(); } });
    const mesh=new THREE.Mesh(displace(new THREE.SphereGeometry(P.size,64,40),.025,3), new THREE.MeshStandardMaterial({ map:tex, roughness:.88, metalness:0, envMapIntensity:.35 }));
    const g=new THREE.Group(); g.add(mesh); g.userData.hit=mesh; return g; },
  // NATURAL:空気。ほぼ透明な球の中を、温かい霞がゆっくり巡る。ふちだけがかすかに光る(背景の星が透けて見える)
  // DARK:黒い木星。黒〜炭色の大気の帯が渦を巻いて流れ、外側では煙がもくもくと吹き荒れる
  blackJupiter(P){
    const body=new THREE.ShaderMaterial({ uniforms:{ uTime:{value:0} },
      vertexShader:`varying vec3 vP; varying vec3 vN; varying vec3 vV; varying vec3 vWN; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vWN=normalize(mat3(modelMatrix)*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV; varying vec3 vWN; ${NOISE_GLSL}
        void main(){ vec3 d=normalize(vP); float lat=d.y, lon=atan(d.z,d.x);
          float spd=0.02+0.025*sin(lat*9.0);                                              // 緯度ごとに違う速さで流れる帯
          vec3 q=vec3(cos(lon+uTime*spd)*2.0, lat*3.2, sin(lon+uTime*spd)*2.0);
          vec3 w=vec3(fbm(q*1.4+vec3(0.0,0.0,uTime*0.03)), fbm(q*1.4+vec3(5.2,1.3,-uTime*0.02)), 0.0);
          float bands=sin(lat*13.0 + (w.x-0.5)*5.0 + fbm(q*0.8)*2.5);                    // 乱れた帯
          float storm=fbm(q*3.2+w*3.0-uTime*0.04);                                         // 吹き荒れる細かな渦
          // 大きな黒い渦(大赤斑のような嵐)
          vec2 spot=vec2(lon-(-1.2+uTime*0.015), (lat+0.32)*2.2); float sp=length(spot*vec2(0.7,1.0));
          float vort=smoothstep(0.55,0.0,sp); float swirl=sin(atan(spot.y,spot.x)*3.0+sp*14.0-uTime*0.6)*vort;
          float v=bands*0.35+storm*0.75+swirl*0.25;
          vec3 black=vec3(0.025,0.024,0.03), coal=vec3(0.09,0.085,0.095), smoke=vec3(0.24,0.22,0.25), wine=vec3(0.16,0.04,0.07), violet=vec3(0.12,0.08,0.18);
          vec3 col=mix(black,coal,smoothstep(-0.2,0.6,v));
          col=mix(col,smoke,smoothstep(0.55,1.0,storm)*0.6);                                // 明るい煙の筋
          col=mix(col,wine,smoothstep(0.6,1.0,bands*0.5+0.5)*0.35);                          // ほのかなボルドーの帯
          col=mix(col,violet,vort*0.5);
          vec3 L=normalize(vec3(0.5,0.6,0.6)); float diff=0.35+0.75*max(dot(vWN,L),0.0);
          float rim=pow(1.0-max(dot(vN,vV),0.0),2.5);
          col=col*diff + vec3(0.22,0.18,0.26)*rim*0.6;                                     // 大気のふちが、かすかに光る
          gl_FragColor=vec4(col,1.0); }` });
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(P.size,72,54), body);
    // 外側の煙の層:大気の上を、より速く吹き荒れる
    const smokeMat=new THREE.ShaderMaterial({ transparent:true, depthWrite:false, uniforms:{ uTime:{value:0} },
      vertexShader:`varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV; ${NOISE_GLSL}
        void main(){ vec3 d=normalize(vP); float lon=atan(d.z,d.x);
          vec3 q=vec3(cos(lon+uTime*0.06)*2.6, d.y*4.0, sin(lon+uTime*0.06)*2.6);
          float s=fbm(q*1.8+vec3(fbm(q*1.2-uTime*0.05)*2.0));
          float a=smoothstep(0.52,0.85,s)*0.55; float rim=pow(1.0-max(dot(vN,vV),0.0),1.5);
          gl_FragColor=vec4(vec3(0.3,0.28,0.32), a*(0.6+rim*0.6)); }` });
    const smokeShell=new THREE.Mesh(new THREE.SphereGeometry(P.size*1.04,56,40), smokeMat);
    const g=new THREE.Group(); g.add(mesh); g.add(smokeShell);
    // まわりに湧き上がって流れていく煙のかたまり(もくもく)
    const puffs=[]; for(let k=0;k<14;k++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex('#4a4652',true), transparent:true, opacity:0, depthWrite:false })); g.add(s);
      puffs.push({ s, a:rnd(0,6.28), lat:rnd(-.6,.6), t:rnd(0,1), sp:rnd(.08,.16), size:rnd(1,1.8) }); }
    g.userData.hit=mesh; g.userData.smoke={ body, smokeMat, smokeShell, puffs, R:P.size };
    return g; },
  // NATURAL:空気 × 木星の大気。透けるベージュの球に、煙のような雲の帯がゆっくり流れる
  air(P){ const mk=(layer)=>new THREE.ShaderMaterial({ transparent:true, depthWrite:false,
      uniforms:{ uTime:{value:0}, uPulse:{value:0}, uR:{value:P.size*(layer?0.82:1)}, uLayer:{value:layer},
        // ピンクベージュ寄りのパレット
        uIvory:{value:new THREE.Color('#fff3f5')}, uMilk:{value:new THREE.Color('#fde4ea')}, uChamp:{value:new THREE.Color('#f6d2dc')},
        uNude:{value:new THREE.Color('#ecbfcb')}, uTaupe:{value:new THREE.Color('#bba0aa')} },
      vertexShader:`varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vWN;
        void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vWN=normalize(mat3(modelMatrix)*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform float uTime; uniform float uPulse; uniform float uR; uniform float uLayer;
        uniform vec3 uIvory; uniform vec3 uMilk; uniform vec3 uChamp; uniform vec3 uNude; uniform vec3 uTaupe;
        varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vWN;
        float h(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*n3(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          vec3 d=normalize(vP);                          // 球の上の向き
          // 地球の雲のように:大気の上に、ちぎれた雲のかたまりと渦がゆっくり流れる
          float lon=atan(d.z,d.x);
          float spd = uLayer>0.5 ? 0.014 : 0.008;
          vec3 p=vec3(cos(lon+uTime*spd), d.y, sin(lon+uTime*spd));
          vec3 pe=vec3(p.x*1.0, p.y*1.6, p.z*1.0);        // 少しだけ横に流れる形(地球の雲の帯っぽさ)
          vec3 w=vec3(fbm(pe*2.0+vec3(1.7,9.2,0.0)), fbm(pe*2.0+vec3(8.3,2.8,uTime*0.01)), fbm(pe*2.0+vec3(3.1,5.4,1.2)));
          float c=fbm(pe*3.4 + w*2.2);                     // 渦を巻くようにゆがめた雲
          float fine=fbm(pe*9.0 + w*3.0 + uTime*0.01);     // 雲のふちの細かいちぎれ
          float cloud=smoothstep(0.34,0.86, c*0.9+fine*0.12); // 境目をゆるく、ふわっとにじむように
          float haze=smoothstep(0.3,0.8,fbm(pe*1.5-uTime*0.005)); // 雲の下の、うっすらした大気のむら
          // 色:雲はアイボリー〜ミルクの白っぽいピンク、雲の切れ間はピンクベージュの大気
          vec3 base=mix(uChamp,uNude,haze*0.6);
          vec3 col=mix(base,mix(uMilk,uIvory,smoothstep(0.3,0.8,fine)),cloud);
          col=mix(col,uTaupe,(1.0-cloud)*haze*0.12);
          float swirl=fine;
          // やわらかい光(広く、鋭いハイライトなし)
          vec3 L=normalize(vec3(0.6,0.7,0.4)); float diff=0.55+0.45*max(dot(vWN,L),0.0);
          col*=diff; col+=uIvory*0.08*uPulse;
          float rim=pow(1.0-max(dot(vN,vV),0.0),2.4);
          // 透け感:澄んだ所は薄く、雲の帯は少し濃く。ふちは大気のように光る
          float a = uLayer>0.5 ? (0.14+haze*0.12) : (0.13+cloud*0.5+haze*0.08); // 内側=うっすらした大気、外側=雲
          a += rim*(0.34+0.2*uPulse);
          a = clamp(a,0.0,0.82);
          gl_FragColor=vec4(col + rim*uIvory*0.25, a); }` });
    const outer=mk(0), inner=mk(1);
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(P.size,72,54), outer);
    const innerMesh=new THREE.Mesh(new THREE.SphereGeometry(P.size*.82,56,40), inner); innerMesh.rotation.z=.18; // 内側の層:少し傾けて、違う速さで流す(奥行き)
    innerMesh.renderOrder=1; mesh.renderOrder=2; // 内側を先に描いて、外側の帯を重ねる
    const g=new THREE.Group(); g.add(innerMesh); g.add(mesh);
    g.userData.hit=mesh; g.userData.air=[outer, inner]; return g; },
  // REVIVAL:ホログラムの樹脂。割れた幾何学の面が、角度で虹色に
  holo(P){ const geo=new THREE.IcosahedronGeometry(P.size,2); const n=geo.attributes.position.count; const col=new Float32Array(n*3); geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const mesh=new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors:true, metalness:.55, roughness:.18, clearcoat:1, flatShading:true, envMapIntensity:1.2 }));
    mesh.userData.holo=true; const g=new THREE.Group(); g.add(mesh);
    const frag=new THREE.Mesh(new THREE.IcosahedronGeometry(P.size*1.22,1), new THREE.MeshBasicMaterial({ color:0xc9b6ff, wireframe:true, transparent:true, opacity:.14 })); g.add(frag);
    g.userData.hit=mesh; g.userData.holo=mesh; g.userData.frag=frag; return g; },
};
const holoColor=new THREE.Color();
function updateHolo(mesh, t){ const c=mesh.geometry.attributes.color, p=mesh.geometry.attributes.position;
  for(let i=0;i<c.count;i+=3){ const h=((p.getX(i)*.08+p.getY(i)*.05+t*.05)%1+1)%1; holoColor.setHSL(.5+h*.45, .7, .62); for(let k=0;k<3;k++) c.setXYZ(i+k,holoColor.r,holoColor.g,holoColor.b); } c.needsUpdate=true; }
function updateLiquid(mesh, t){ const geo=mesh.geometry, base=geo.userData.base, p=geo.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){ v.set(base[i*3],base[i*3+1],base[i*3+2]); const n=v.clone().normalize(); const k=1+.045*Math.sin(n.x*4+t*.9)*Math.cos(n.y*3.5+t*.7)+.02*Math.sin(n.z*7+t*1.3); v.multiplyScalar(k); p.setXYZ(i,v.x,v.y,v.z); }
  p.needsUpdate=true; geo.computeVertexNormals(); }

const PAL = { romantic:['#f6dce6','#d8b6e6'], metallic:['#e6ebf2','#9aa6b8'], dark:['#6a4f7a','#3a2a44'], natural:['#efe2d0','#c9b49a'], revival:['#bfa8ff','#7fd3e8'] };
const SUBS = Object.fromEntries(TAXONOMY.subcategories);
/* ---------- 惑星と月(サブジャンル)を1つ作る ----------
   hooks.onGroup(g) / onHit(hit) / onMoon(m,name):本編はここでシーンへの追加・タップ登録・名前ラベルを行う
   返り値:{ group, body, hit, moonG, moons, data, spin, links } */
function buildPlanet(P, hooks){ hooks=hooks||{};
  const g=new THREE.Group(); g.position.set(...P.pos); if(hooks.onGroup) hooks.onGroup(g);
  const body=MATERIALS[P.material](P); g.add(body); const hit=body.userData.hit; hit.userData={kind:'planet',data:P}; if(hooks.onHit) hooks.onHit(hit);
  const atm=new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex(PAL[P.id][0],true), transparent:true, opacity:P.id==='dark'?.18:.28, depthWrite:false, blending:THREE.AdditiveBlending })); atm.scale.setScalar(P.size*3.8); g.add(atm);
  const ring=new THREE.Mesh(new THREE.RingGeometry(P.size*1.38,P.size*1.46,128), new THREE.MeshBasicMaterial({ color:PAL[P.id][0], transparent:true, opacity:.28, side:THREE.DoubleSide, depthWrite:false }));
  ring.rotation.x=Math.PI/2+rnd(-.5,.5); ring.rotation.y=rnd(-.4,.4); g.add(ring);
  const moonG=new THREE.Group(); g.add(moonG); const moons=[];
  (SUBS[P.id]||[]).forEach((s,i,arr)=>{ const name=typeof s==='string'?s:s.name, children=typeof s==='string'?[]:(s.children||[]);
    const a=i/arr.length*Math.PI*2, R=P.size*1.95+(i%2)*.6;
    // 月はガラスの泡のように(参考画像のイメージ)。DARKの月だけは、黒い岩のかけら
    const rockGeo = P.id==='dark' ? displace(displace(new THREE.IcosahedronGeometry((children.length?.36:.28)*rnd(.85,1.25),3),rnd(.12,.26),rnd(1.8,3.2)),.05,7) : null;
    const special = P.id==='dark' ? darkMoon(name, children.length?.36:.28, i) : null; // DARKの月は、サブジャンルごとに違う姿
    const m = special || new THREE.Mesh(rockGeo || new THREE.SphereGeometry(children.length?.36:.28,28,20), rockGeo ? rockMoonMaterial(i) : new THREE.MeshPhysicalMaterial({ color:PAL[P.id][i%2], roughness:.05, metalness:.1, clearcoat:1, clearcoatRoughness:.05, transparent:true, opacity:.62, envMapIntensity:1.6, emissive:new THREE.Color(PAL[P.id][0]), emissiveIntensity:.08 }));
    m.position.set(Math.cos(a)*R, Math.sin(a*1.7)*.8, Math.sin(a)*R); m.userData={kind:'moon',name,children,planet:P}; moonG.add(m); if(hooks.onMoon) hooks.onMoon(m,name); moons.push(m); });
  return {group:g,body,hit,moonG,moons,data:P,spin:rnd(.04,.08),links:[]};
}
// Neo Tribal の月と Cyber の月を、うっすらした細いラインでつなぐ(同じ moonG の子なので、一緒に公転する)
function linkNeoTribal(moonG, moons, links){ const names=moons.map(m=>m.userData.name);
  const ci=names.indexOf('Cyber'), ni=names.indexOf('Neo Tribal'); if(ci<0||ni<0) return;
  const a=moons[ci].position, b=moons[ni].position;
  const mid=a.clone().lerp(b,.5); mid.y+=.22; // ほんの少しだけ膨らませて、直線に見えすぎないように
  const curve=new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)), new THREE.LineBasicMaterial({ color:0xa8c8e0, transparent:true, opacity:.22 }));
  moonG.add(line); links.push({ line, a:moons[ci], b:moons[ni] }); }
// 月を動かすページ(ホームの入口など)向け:つないだ線を、今の月の位置に合わせて引き直す
function updateLinks(p){ (p.links||[]).forEach(o=>{ const a=o.a.position, b=o.b.position; const mid=a.clone().lerp(b,.5); mid.y+=.22;
  o.line.geometry.setFromPoints(new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone()).getPoints(24)); }); }

// 惑星の素材アニメーション(液体・ホロ・煙・輝き・空気)。本編とホームの入口で共通
function animateBody(p, t, dt, frame){
    if(p.body.userData.liquid && frame%2===0) updateLiquid(p.body.userData.liquid,t);
    if(p.body.userData.holo && frame%3===0){ updateHolo(p.body.userData.holo,t); p.body.userData.frag.rotation.y-=dt*.2; }
    if(p.body.userData.smoke){ const S=p.body.userData.smoke; S.body.uniforms.uTime.value=t; S.smokeMat.uniforms.uTime.value=t; S.smokeShell.rotation.y+=dt*.04;
      S.puffs.forEach(o=>{ o.t+=dt*o.sp; if(o.t>1){ o.t=0; o.a=rnd(0,6.28); o.lat=rnd(-.6,.6); } const r=S.R*(1.02+o.t*.55), a=o.a+o.t*.6;
        o.s.position.set(Math.cos(a)*Math.cos(o.lat)*r, Math.sin(o.lat)*r, Math.sin(a)*Math.cos(o.lat)*r); o.s.scale.setScalar(S.R*o.size*(.35+o.t*.9)); o.s.material.opacity=.38*Math.sin(Math.PI*o.t); }); }
    if(p.body.userData.iri) p.body.userData.iri.sheen.setHSL((.92+Math.sin(t*.3)*.06)%1,.5,.82);
    if(p.body.userData.air){ p.body.userData.air.forEach((m,i)=>{ m.uniforms.uTime.value=t; m.uniforms.uPulse.value=airPulse(t); }); p.body.children[0].rotation.y-=dt*.03; } }

// 空気の「呼吸」:ときどき、ふわっと明るくなって戻る(規則的にならないよう間隔をばらす)
let airNext=8, airStart=-99; function airPulse(t){ if(t>airNext){ airStart=t; airNext=t+rnd(9,17); } const x=(t-airStart)/3.2; return x>=0&&x<=1 ? Math.sin(Math.PI*x)**2 : 0; }

global.GalaxyCore = { TAXONOMY, addLights, rnd, canvasTex, glowTex, noise3, NOISE_GLSL,
  mineralTextures, _specTex, specTex, stoneMat, debris, darkMoon, mergeGeos, rockTex, rockMoonMaterial, displace, MATERIALS, holoColor, updateHolo, updateLiquid,
  PAL, SUBS, buildPlanet, linkNeoTribal, updateLinks, animateBody, airPulse };
})(window);
