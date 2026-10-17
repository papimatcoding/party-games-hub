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
 case "back_pack":return '<path d="M58 128Q35 111 28 140L26 162Q29 178 53 175L59 146M123 128Q146 111 152 140L154 162Q151 178 127 175L120 146" fill="#b98567" stroke="#30243d" stroke-width="4"/><rect x="27" y="144" width="25" height="22" rx="6" fill="#dba582" stroke="#30243d" stroke-width="3"/><rect x="129" y="144" width="25" height="22" rx="6" fill="#dba582" stroke="#30243d" stroke-width="3"/>';
 case "back_cape":return '<path d="M59 121Q43 128 36 158L25 186Q90 201 155 186L142 157Q135 129 120 121Z" fill="#e27496" stroke="#30243d" stroke-width="5"/><path d="M34 180Q89 192 146 180" fill="none" stroke="#ffd8ab" stroke-width="5"/>';
 case "back_wings":return '<path d="M59 126Q15 74 21 134Q3 150 15 165Q33 180 61 150M121 126Q165 74 159 134Q177 150 165 165Q147 180 119 150" fill="#91d6da" stroke="#30243d" stroke-width="5"/><path d="M23 136Q33 143 50 148M157 136Q147 143 130 148" fill="none" stroke="#f9fdf6" stroke-width="5" stroke-linecap="round"/>';
 case "back_balloon":return '<path d="M129 130Q157 89 159 51" fill="none" stroke="#f2e4d3" stroke-width="2.5"/><ellipse cx="159" cy="28" rx="17" ry="23" fill="#ed7399" stroke="#30243d" stroke-width="4"/><path d="M152 13Q144 25 151 37" fill="none" stroke="#ffe6ea" stroke-width="5" opacity=".8"/><path d="M155 49L159 57L163 49" fill="#f3d1a1"/>';
 case "back_jetpack":return '<rect x="29" y="119" width="28" height="56" rx="11" fill="#7b86ad" stroke="#30243d" stroke-width="4"/><rect x="123" y="119" width="28" height="56" rx="11" fill="#7b86ad" stroke="#30243d" stroke-width="4"/><rect x="36" y="132" width="13" height="25" rx="5" fill="#87e0e0"/><rect x="131" y="132" width="13" height="25" rx="5" fill="#87e0e0"/><path d="M37 176L41 190L47 177M133 177L139 190L145 176" fill="#efa968" stroke="#30243d" stroke-width="2"/>';
 default:return "";
 }
}
function frontBackArt(s){
 if(s==="back_pack")return '<path d="M68 123L72 175M112 123L108 175" stroke="#966c56" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M69 143H111" stroke="#d6a484" stroke-width="3"/>';
 if(s==="back_jetpack")return '<path d="M61 137L67 147M119 137L113 147" stroke="#8996b8" stroke-width="5"/>';
 if(s==="back_cape")return '<path d="M74 124Q91 134 105 124" stroke="#f5d18a" stroke-width="5" fill="none"/>';
 return "";
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
// Fixed landmarks shared by skin, hairstyle and accessories. The anatomical ears
// must be UNDER the face outline and IN FRONT OF the rear hair silhouette.
export const AVATAR_ANCHORS=Object.freeze({
 centerX:90,topOfHead:23,faceLine:87,leftEar:43,rightEar:137,
 hairLine:57,shoulder:125,feet:191
});
const LONG_HAIR=new Set([1,3,5,6,8,9,11]);
const LAYER_ORDER=Object.freeze(["ground","rear-accessory","legs","arms","outfit",
 "neck","rear-hair","ears","face","features","front-hair","headwear","facial-accessory"]);
function rearHair(hair,color){
 const ends=LONG_HAIR.has(hair)?(hair===11?141:hair===3?128:122):106;
 return '<path d="M44 80Q33 52 43 37Q55 18 91 21Q132 21 139 50L135 '+
  ends+'Q125 '+(ends+7)+' 114 '+(ends-1)+'L65 '+(ends-1)+
  'Q50 '+(ends+8)+' 44 '+ends+'Z" fill="'+color+
  '" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/>'+
  (LONG_HAIR.has(hair)?'<path d="M49 93Q44 115 55 '+(ends-5)+
  'M131 93Q136 115 124 '+(ends-5)+
  '" fill="none" stroke="#ffffff" opacity=".12" stroke-width="3" stroke-linecap="round"/>':"");
}
export function avatarMarkup(p={}){
 const skin=SKINS[num(p?.skin,8,3)],hairColor=HAIR_COLORS[num(p?.hair_color,10,1)],
 cloth=CLOTH_COLORS[num(p?.outfit_color,10,0)];
 const hair=num(p?.hair,12,0),eyes=num(p?.eyes,8,0),mouth=num(p?.mouth,8,0);
 const outfit=p?.outfit||"outfit_hoodie",head=p?.head||"head_none",
 face=p?.face||"face_none",back=p?.back||"back_none";
 const bodyColor=outfit==="outfit_suit"?"#46506f":
  outfit==="outfit_space"?"#eef1f3":outfit==="outfit_chef"?"#f4eadd":
  outfit==="outfit_ninja"?"#40405c":outfit==="outfit_royal"?"#7952a6":
  outfit==="outfit_banana"?"#f9cd52":outfit==="outfit_galaxy"?"#514090":
  outfit==="outfit_denim"?"#428fc5":cloth;
 const isHat=head!=="head_none"&&head!=="head_cat"&&head!=="head_party";
 const hasOpenEyes=[0,2,5].includes(eyes);
 const backBanana=outfit==="outfit_banana"?
 '<path d="M47 72Q28 25 75 16Q111 8 131 46L143 24Q139 84 129 110L54 105Z" fill="#f3ca55" stroke="#30243d" stroke-width="5"/><path d="M53 48Q81 16 117 45" fill="none" stroke="#fff2aa" stroke-width="7" opacity=".8"/>':"";
 return [
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 205" role="img" aria-label="Avatar caricaturesco Party Hub">',
 '<g data-layer="ground"><ellipse cx="90" cy="194" rx="48" ry="8" fill="#131026" opacity=".28"/></g>',
 '<g data-layer="rear-accessory">',backArt(back),backBanana,'</g>',
 '<g data-layer="legs">',
 '<path d="M67 166L64 182Q70 191 82 185L88 168M104 166L111 184Q120 191 124 182L116 165" fill="'+bodyColor+'" stroke="#30243d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
 '<path d="M58 180Q68 175 81 180Q94 185 85 192L53 192Q48 185 58 180ZM99 180Q112 175 124 180Q136 186 126 192H96Q90 186 99 180Z" fill="#faf0e6" stroke="#30243d" stroke-width="4"/>',
 '<path d="M57 187H84M98 187H126" stroke="#b2acbd" stroke-width="2" opacity=".8"/>',
 '</g>',
 '<g data-layer="arms">',
 '<path d="M61 129Q49 122 42 135L37 158Q33 174 46 177Q58 177 62 160L71 143M118 129Q132 122 139 135L143 158Q147 174 133 177Q121 177 118 160L109 143" fill="'+skin+'" stroke="#30243d" stroke-width="5" stroke-linejoin="round"/>',
 '<path d="M63 128Q51 124 45 135L41 151Q52 159 64 151L72 139M117 128Q129 124 135 135L139 151Q128 159 116 151L108 139" fill="'+bodyColor+'" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/>',
 '</g>',
 '<g data-layer="outfit">',outfitArt(outfit,cloth),
 '<path d="M70 175Q90 180 111 175" stroke="#ffffff" opacity=".15" stroke-width="3" fill="none" stroke-linecap="round"/></g>',
 '<g data-layer="front-back">',frontBackArt(back),'</g>',
 '<g data-layer="neck"><path d="M81 113V128Q90 138 101 128V113" fill="'+skin+'" stroke="#30243d" stroke-width="4"/></g>',
 '<g data-layer="rear-hair">',rearHair(hair,hairColor),'</g>',
 '<g data-layer="ears">',
 '<ellipse cx="43" cy="96" rx="10" ry="14" fill="'+skin+'" stroke="#30243d" stroke-width="4"/>',
 '<ellipse cx="137" cy="96" rx="10" ry="14" fill="'+skin+'" stroke="#30243d" stroke-width="4"/>',
 '<path d="M42 92Q37 97 43 102M138 92Q143 97 137 102" fill="none" stroke="#8e5b56" opacity=".55" stroke-width="2.1" stroke-linecap="round"/>',
 '</g>',
 '<g data-layer="face">',
 '<path d="M51 67Q55 43 89 40Q124 40 129 67L131 91Q131 115 111 129Q91 141 70 128Q49 114 49 91Z" fill="'+skin+'" stroke="#30243d" stroke-width="4.1" stroke-linejoin="round"/>',
 '<path d="M54 76Q59 51 79 49" fill="none" stroke="#fff3e2" stroke-width="5" opacity=".3" stroke-linecap="round"/>',
 '<ellipse cx="64" cy="106" rx="10" ry="5.5" fill="#f17e90" opacity=".19"/>',
 '<ellipse cx="116" cy="106" rx="10" ry="5.5" fill="#f17e90" opacity=".19"/>',
 '</g>',
 '<g data-layer="features" fill="#30243d" stroke="#30243d">',
 '<path d="M61 78Q69 75 76 78M104 78Q112 75 119 78" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
 eyeStyles[eyes],
 hasOpenEyes?'<ellipse cx="67.5" cy="88" rx="1.8" ry="2.5" fill="#fff7f0" stroke="none"/><ellipse cx="109" cy="88" rx="1.8" ry="2.5" fill="#fff7f0" stroke="none"/>':"",
 '<path d="M87 101Q90 103 93 101" stroke="#956154" stroke-width="2" fill="none" stroke-linecap="round"/>',
 mouthStyles[mouth],'</g>',
 '<g data-layer="front-hair">',
 '<path d="'+hairShapes[hair]+'" fill="'+hairColor+'" stroke="#30243d" stroke-width="3.5" stroke-linejoin="round"/>',
 isHat?'':('<path d="M55 49Q68 32 84 32" stroke="#fff7e7" stroke-width="3.5" fill="none" opacity=".15" stroke-linecap="round"/>'),
 '</g>',
 '<g data-layer="headwear">',headArt(head),'</g>',
 '<g data-layer="facial-accessory">',faceArt(face),'</g>',
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
