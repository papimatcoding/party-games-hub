// Authored vector avatars. Every possible path, accessory and color is curated.
// Player names or arbitrary strings are never interpolated into SVG.
export const SKINS=["#f7c9a1","#e9b58e","#d99b72","#c88a60","#b77955","#9a644b","#78513d","#583a33"];
export const HAIR_COLORS=["#302639","#51372e","#8a5434","#dca55c","#f4d89b","#181e35","#77566f","#b84d6a","#f0eced","#42758f"];
export const CLOTH_COLORS=["#8978ee","#f2a04b","#e77a99","#4dafa7","#7590ea","#e9d38b","#db7271","#a9c56b","#aa7ac1","#4e5d87"];
export const STYLE_OPTIONS={skin:8,hair:12,eyes:8,mouth:8,hair_color:10,outfit_color:10};
const num=(v,max,def=0)=>Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<max?Number(v):def;
const hairShapes=[
'M47 66Q29 30 68 25Q115 12 132 57L119 60 108 46 93 64 75 51 57 68Z',
'M40 70Q33 23 84 25Q129 25 136 65L114 51 100 72 84 48 69 79 53 52Z',
'M43 64Q44 27 92 27Q128 32 135 64L113 48 103 62 83 46 59 66Z',
'M37 69Q27 39 65 24Q109 10 136 55L124 68 105 55 93 73 67 52Z',
'M52 54Q53 28 88 29Q125 30 129 57L113 52 93 61 73 52Z',
'M38 74Q37 34 70 27Q125 18 139 72L115 50 107 75 84 50 72 76 58 54Z',
'M43 70Q22 36 63 25Q120 14 139 67L120 49 101 67 94 45 78 72 56 52Z',
'M42 64Q47 29 90 30Q123 31 133 59Q110 72 94 52Q67 75 42 64Z',
'M39 70Q26 31 74 26Q122 13 140 61L123 73 105 52 87 68 67 51Z',
'M41 70Q41 21 87 23Q120 26 135 60L124 73 107 54 93 69 80 51 62 68Z',
'M47 56Q53 31 85 32Q121 28 130 57Q108 65 96 54Q66 65 47 56Z',
'M35 78Q24 30 67 26Q126 14 142 72L124 52 116 77 95 53 83 77 62 54Z'
];
const eyeStyles=[
'<ellipse cx="69" cy="91" rx="4.7" ry="6.3"/><ellipse cx="111" cy="91" rx="4.7" ry="6.3"/>',
'<path d="M62 91Q69 83 76 91M104 91Q111 83 118 91" fill="none" stroke-width="4" stroke-linecap="round"/>',
'<ellipse cx="69" cy="91" rx="6" ry="7"/><ellipse cx="111" cy="91" rx="6" ry="7"/>',
'<path d="M62 91Q69 99 76 91M104 91Q111 99 118 91" fill="none" stroke-width="4" stroke-linecap="round"/>',
'<path d="M62 93L76 87M104 87L118 93" fill="none" stroke-width="4" stroke-linecap="round"/>',
'<ellipse cx="69" cy="91" rx="3" ry="7"/><ellipse cx="111" cy="91" rx="3" ry="7"/>',
'<path d="M62 89L76 94M104 94L118 89" fill="none" stroke-width="4" stroke-linecap="round"/>',
'<path d="M62 92Q69 80 76 92M104 92Q111 80 118 92" fill="none" stroke-width="4" stroke-linecap="round"/>'
];
const mouthStyles=[
'<path d="M80 114Q90 123 100 114" fill="none" stroke-width="3.8" stroke-linecap="round"/>',
'<path d="M79 112Q90 132 101 112Z" fill="#9c395a" stroke-width="2.5"/><path d="M82 117H98" stroke="#fff3e8" stroke-width="3"/>',
'<path d="M83 115H98" fill="none" stroke-width="3.7" stroke-linecap="round"/>',
'<ellipse cx="91" cy="116" rx="6" ry="8" fill="#73344f"/>',
'<path d="M80 122Q90 108 101 122" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
'<path d="M80 110Q91 128 102 110" fill="none" stroke-width="4" stroke-linecap="round"/>',
'<path d="M82 116Q91 110 101 116" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
'<path d="M81 110Q90 117 101 110L98 119Q90 126 84 118Z" fill="#c85872" stroke-width="2"/>'
];
function backArt(s){
 switch(s){
 case "back_pack":return '<rect x="43" y="119" width="94" height="48" rx="18" fill="#b7806a" stroke="#342740" stroke-width="5"/><rect x="64" y="135" width="52" height="27" rx="8" fill="#e4ae86"/>';
 case "back_cape":return '<path d="M55 119L26 187Q90 199 153 187L125 119Z" fill="#db688d" stroke="#342740" stroke-width="5"/><path d="M40 173Q90 189 140 173" stroke="#ffe0ac" stroke-width="4" fill="none"/>';
 case "back_wings":return '<path d="M64 125Q13 76 20 140Q0 164 29 171Q44 188 74 151M116 125Q167 76 161 140Q180 164 151 171Q137 188 106 151" fill="#a7dbdf" stroke="#342740" stroke-width="5"/>';
 case "back_balloon":return '<path d="M125 131Q161 84 163 54" fill="none" stroke="#f2e4d3" stroke-width="2"/><ellipse cx="163" cy="32" rx="15" ry="22" fill="#ef7898" stroke="#342740" stroke-width="4"/>';
 case "back_jetpack":return '<rect x="48" y="120" width="84" height="50" rx="13" fill="#7c82ad" stroke="#342740" stroke-width="5"/><rect x="64" y="132" width="21" height="42" rx="7" fill="#8de7e1"/><rect x="96" y="132" width="21" height="42" rx="7" fill="#8de7e1"/>';
 default:return "";
 }
}
function outfitArt(s,col){
 let fill=col,details="";
 if(s==="outfit_suit"){fill="#46506f";details='<path d="M65 126L89 150L115 126" fill="#fff4dc" stroke="#30263d" stroke-width="3"/><path d="M87 140L96 140L94 171H87Z" fill="#e8897f"/>';}
 if(s==="outfit_sport")details='<path d="M61 139H120M67 158H116" stroke="#fff1df" stroke-width="6"/>';
 if(s==="outfit_denim"){fill="#428fc5";details='<path d="M64 127L91 146L115 127M91 146V176" stroke="#d0e6eb" stroke-width="4" fill="none"/>';}
 if(s==="outfit_chef"){fill="#f4eadd";details='<path d="M90 127V179" stroke="#8da0aa" stroke-width="3"/><circle cx="80" cy="151" r="3.5" fill="#536373"/><circle cx="80" cy="167" r="3.5" fill="#536373"/>';}
 if(s==="outfit_space"){fill="#eef1f3";details='<rect x="76" y="139" width="29" height="19" rx="4" fill="#7fd4d7" stroke="#48526c" stroke-width="3"/><path d="M64 129V166M116 129V166" stroke="#a6b2c4" stroke-width="5"/>';}
 if(s==="outfit_ninja"){fill="#40405c";details='<path d="M60 129L119 165M120 129L61 165" stroke="#9370b5" stroke-width="8"/>';}
 if(s==="outfit_royal"){fill="#7952a6";details='<path d="M63 137L90 160L116 137" stroke="#f5d16f" stroke-width="8" fill="none"/>';}
 if(s==="outfit_banana"){fill="#f9cd52";details='<path d="M70 130L109 171" stroke="#fff3ad" stroke-width="12"/>';}
 if(s==="outfit_galaxy"){fill="#514090";details='<circle cx="70" cy="140" r="5" fill="#efdc96"/><circle cx="112" cy="155" r="4" fill="#b0edee"/><path d="M65 164Q92 130 119 141" stroke="#b48bdf" stroke-width="4" fill="none"/>';}
 return '<path d="M58 122Q90 110 121 122L138 179Q90 195 43 179Z" fill="'+fill+'" stroke="#30243d" stroke-width="5"/><path d="M64 127Q91 138 116 127" fill="none" stroke="#ffffff48" stroke-width="7"/>'+details;
}
function headArt(s){
 switch(s){
 case "head_cap":return '<path d="M47 56Q44 18 89 20Q135 19 136 57L129 65H47Z" fill="#5e74cc" stroke="#30243d" stroke-width="4"/><path d="M84 60Q119 55 150 72Q121 85 86 68Z" fill="#394d89" stroke="#30243d" stroke-width="3"/>';
 case "head_beanie":return '<path d="M42 59Q38 19 88 19Q139 19 138 61Z" fill="#f2a585" stroke="#30243d" stroke-width="4"/><rect x="38" y="55" width="103" height="15" rx="7" fill="#f2c2a0" stroke="#30243d" stroke-width="3"/><circle cx="89" cy="18" r="10" fill="#f1ca91"/>';
 case "head_crown":case "head_champion":return '<path d="M49 58L40 14L64 30L90 5L114 30L139 14L131 58Z" fill="#f3cc68" stroke="#30243d" stroke-width="4"/><rect x="49" y="49" width="82" height="13" rx="5" fill="#efb95b" stroke="#30243d" stroke-width="3"/><circle cx="90" cy="43" r="6" fill="#ee789f"/>';
 case "head_frog":return '<path d="M40 65Q43 24 90 27Q136 24 139 65Z" fill="#84c681" stroke="#30243d" stroke-width="4"/><circle cx="64" cy="30" r="12" fill="#92cf87" stroke="#30243d" stroke-width="4"/><circle cx="116" cy="30" r="12" fill="#92cf87" stroke="#30243d" stroke-width="4"/><circle cx="64" cy="30" r="4.5" fill="#2a3436"/><circle cx="116" cy="30" r="4.5" fill="#2a3436"/>';
 case "head_cat":return '<path d="M46 64L42 20L73 41Q89 33 106 41L137 20L133 64Z" fill="#d8b392" stroke="#30243d" stroke-width="4"/><path d="M53 30L63 47M128 30L117 47" stroke="#e794a0" stroke-width="8"/>';
 case "head_party":return '<path d="M73 63L90 5L109 63Z" fill="#eb9c68" stroke="#30243d" stroke-width="4"/><path d="M78 48H104M84 29H98" stroke="#ffe9ad" stroke-width="6"/><circle cx="90" cy="7" r="7" fill="#f887a6"/>';
 case "head_chef":return '<path d="M48 63L45 34Q35 9 57 15Q69 -2 90 15Q109 -2 122 17Q145 7 134 43L129 63Z" fill="#fcf4e3" stroke="#30243d" stroke-width="4"/><rect x="48" y="51" width="82" height="16" rx="5" fill="#ebebed" stroke="#30243d" stroke-width="3"/>';
 case "head_helmet":return '<path d="M40 77Q28 19 88 15Q145 19 140 77L126 89L53 89Z" fill="#89a3c5" stroke="#30243d" stroke-width="5"/><path d="M49 57H132L125 78H56Z" fill="#8be3d9" stroke="#30243d" stroke-width="3"/>';
 case "head_pirate":return '<path d="M27 67Q54 54 56 29Q89 5 123 30Q129 56 153 67Q100 77 27 67Z" fill="#414159" stroke="#30243d" stroke-width="4"/><path d="M78 42L91 28L102 42L91 55Z" fill="#f8dfb9"/>';
 case "head_fish":return '<path d="M41 58Q52 16 113 30L141 17L136 44L141 69L111 57Q64 81 41 58Z" fill="#8ed0e2" stroke="#30243d" stroke-width="4"/><circle cx="64" cy="48" r="5" fill="#253a4d"/>';
 default:return "";
 }
}
function faceArt(s){
 switch(s){
 case "face_round":return '<circle cx="69" cy="91" r="14" fill="none" stroke="#484266" stroke-width="3.5"/><circle cx="111" cy="91" r="14" fill="none" stroke="#484266" stroke-width="3.5"/><path d="M83 90H97" stroke="#484266" stroke-width="3"/>';
 case "face_sun":return '<path d="M53 82H84L80 100Q68 111 55 99ZM96 82H128L126 99Q114 111 99 100Z" fill="#302a53" stroke="#30243d" stroke-width="3"/><path d="M84 88H96" stroke="#30243d" stroke-width="4"/>';
 case "face_star":return '<path d="M68 78L72 86L81 87L74 93L76 103L68 98L60 103L62 93L55 87L64 86ZM112 78L116 86L125 87L118 93L120 103L112 98L104 103L106 93L99 87L108 86Z" fill="#f0d075" stroke="#30243d" stroke-width="2.5"/>';
 case "face_patch":return '<path d="M45 72L136 85" stroke="#30243d" stroke-width="3"/><rect x="101" y="80" width="22" height="24" rx="8" fill="#30243d"/>';
 case "face_mustache":return '<path d="M91 113Q71 98 61 117Q76 120 91 113Q108 98 119 117Q104 120 91 113Z" fill="#513747"/>';
 case "face_mask":return '<path d="M49 80Q90 69 132 80L127 103Q90 112 54 103Z" fill="#69518a" stroke="#30243d" stroke-width="3"/><ellipse cx="69" cy="92" rx="9" ry="5" fill="#231b32"/><ellipse cx="111" cy="92" rx="9" ry="5" fill="#231b32"/>';
 case "face_heart":return '<path d="M69 100Q48 86 59 80Q66 78 69 84Q80 76 82 86Q81 93 69 100ZM112 100Q92 86 103 80Q109 78 112 84Q124 76 126 86Q125 93 112 100Z" fill="#ef7097"/>';
 default:return "";
 }
}
export function avatarMarkup(p={}){
 const skin=SKINS[num(p.skin,8,3)],hairColor=HAIR_COLORS[num(p.hair_color,10,1)],cloth=CLOTH_COLORS[num(p.outfit_color,10,0)];
 const hair=num(p.hair,12,0),eyes=num(p.eyes,8,0),mouth=num(p.mouth,8,0);
 const outfit=p.outfit||"outfit_hoodie",head=p.head||"head_none",face=p.face||"face_none",back=p.back||"back_none";
 return [
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 205" role="img" aria-label="Avatar caricaturesco Party Hub">',
 '<ellipse cx="90" cy="190" rx="49" ry="9" fill="#20192c" opacity=".23"/>',
 backArt(back),
 '<path d="M70 165L66 183Q76 195 88 190L94 170M107 165L112 183Q102 194 93 190L90 170" fill="'+cloth+'" stroke="#30243d" stroke-width="5" stroke-linejoin="round"/>',
 '<path d="M61 180Q72 175 85 183Q91 192 84 195H57Q51 193 61 180ZM97 183Q109 175 122 183Q130 194 120 195H93Q87 191 97 183Z" fill="#f4e8df" stroke="#30243d" stroke-width="4"/>',
 '<path d="M58 133Q32 130 39 150L44 168Q54 176 64 164L70 147M121 133Q145 130 141 150L136 168Q125 176 116 163L110 147" fill="'+skin+'" stroke="#30243d" stroke-width="5" stroke-linecap="round"/>',
 outfitArt(outfit,cloth),
 '<path d="M81 116V130Q90 138 100 130V116" fill="'+skin+'" stroke="#30243d" stroke-width="4"/>',
 '<path d="M40 80Q36 21 89 22Q144 22 140 85L131 115Q108 140 90 132Q58 140 45 111Z" fill="'+hairColor+'" stroke="#30243d" stroke-width="4"/>',
 '<path d="M57 48Q90 26 122 48Q139 70 130 111Q110 135 90 135Q65 134 50 111Q41 78 57 48Z" fill="'+skin+'" stroke="#30243d" stroke-width="4"/>',
 '<path d="M61 55Q90 39 119 54" fill="none" stroke="#fff3dd" stroke-width="4" opacity=".25"/>',
 '<ellipse cx="50" cy="96" rx="9" ry="13" fill="'+skin+'" stroke="#30243d" stroke-width="3.5"/>',
 '<ellipse cx="130" cy="96" rx="9" ry="13" fill="'+skin+'" stroke="#30243d" stroke-width="3.5"/>',
 '<ellipse cx="66" cy="108" rx="11" ry="5" fill="#f58b9b" opacity=".24"/><ellipse cx="113" cy="108" rx="11" ry="5" fill="#f58b9b" opacity=".24"/>',
 '<g fill="#30243d" stroke="#30243d">',eyeStyles[eyes],'</g>',
 '<path d="M87 102Q91 105 95 102" stroke="#9a624e" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
 '<g stroke="#30243d">',mouthStyles[mouth],'</g>',
 '<path d="'+hairShapes[hair]+'" fill="'+hairColor+'" stroke="#30243d" stroke-width="3.5" stroke-linejoin="round"/>',
 '<path d="M53 50Q65 31 83 30" stroke="#fff5e2" stroke-width="4" stroke-linecap="round" opacity=".22" fill="none"/>',
 faceArt(face),headArt(head),
 '</svg>'
 ].join("");
}
// Cache parsed SVG templates so roster refreshes only clone vectors instead of
// reparsing hundreds of path nodes on every Supabase snapshot.
const ART_CACHE=new Map();
export function makeAvatar(appearance={},extraClass=""){
 const wrap=document.createElement("span");
 wrap.className="ph-avatar "+extraClass;
 const key=JSON.stringify([
  num(appearance?.skin,8,3),num(appearance?.hair,12),num(appearance?.eyes,8),
  num(appearance?.mouth,8),num(appearance?.hair_color,10,1),
  num(appearance?.outfit_color,10),appearance?.outfit||"outfit_hoodie",
  appearance?.head||"head_none",appearance?.face||"face_none",
  appearance?.back||"back_none"
 ]);
 let art=ART_CACHE.get(key);
 if(!art){
  const template=document.createElement("template");
  template.innerHTML=avatarMarkup(appearance);
  art=template.content.firstElementChild;
  if(ART_CACHE.size>=256)ART_CACHE.delete(ART_CACHE.keys().next().value);
  ART_CACHE.set(key,art);
 }
 wrap.append(art.cloneNode(true));
 return wrap;
}
