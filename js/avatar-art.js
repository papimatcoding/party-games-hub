// Authored vector avatars. Every possible path, accessory and color is curated.
// Player names or arbitrary strings are never interpolated into SVG.
import {halloweenHead,halloweenFace,halloweenOutfit,halloweenBack,headHairMode} from "./avatar-halloween.js?v=0.16.0";
export {headHairMode} from "./avatar-halloween.js?v=0.16.0";
export const SKINS=["#f7c9a1","#e9b58e","#d99b72","#c88a60","#b77955","#9a644b","#78513d","#583a33"];
export const HAIR_COLORS=["#302639","#51372e","#8a5434","#dca55c","#f4d89b","#181e35","#77566f","#b84d6a","#f0eced","#42758f"];
export const CLOTH_COLORS=["#8978ee","#f2a04b","#e77a99","#4dafa7","#7590ea","#e9d38b","#db7271","#a9c56b","#aa7ac1","#4e5d87"];
export const STYLE_OPTIONS={skin:8,hair:12,eyes:8,mouth:8,hair_color:10,outfit_color:10};
const num=(v,max,def=0)=>Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<max?Number(v):def;
const hairShapes=[
'M47 65Q46 33 75 29Q91 22 112 30Q132 39 133 63Q113 55 103 46Q89 61 77 51Q61 62 47 65Z',
'M46 64Q44 27 81 27Q114 20 134 59L121 53Q106 41 96 58Q84 46 73 63Q60 54 46 64Z',
'M48 62Q53 28 89 28Q122 28 133 62Q108 50 96 58Q82 49 68 60Z',
'M45 64Q45 32 75 26Q108 18 135 59Q116 52 103 57Q91 49 80 57Q65 52 45 64Z',
'M54 57Q58 29 90 28Q121 28 126 58Q108 51 93 52Q78 54 54 57Z',
'M45 69Q39 32 80 26Q114 22 136 63L120 60Q108 44 95 62Q82 49 69 67L56 53Z',
'M43 67Q44 31 81 25Q117 19 136 64L120 53L108 66L96 51L82 65L67 53L55 70Z',
'M47 63Q53 31 86 29Q115 27 133 58Q121 64 105 50Q92 64 79 52Q61 66 47 63Z',
'M43 65Q45 34 72 26Q111 15 137 62Q124 66 109 49Q91 62 79 53Q62 68 43 65Z',
'M45 67Q42 29 89 25Q119 25 135 62L121 65L108 52L94 63L80 52L65 67L54 58Z',
'M55 55Q57 32 88 32Q117 29 127 56Q111 62 96 53Q76 62 55 55Z',
'M42 70Q41 31 82 24Q120 19 137 66L121 55L111 70L96 52L81 71L67 55L54 70Z'
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
'<path d="M79 111Q90 108 101 111Q100 124 90 124Q80 124 79 111Z" fill="#9c395a" stroke-width="2.5"/><path d="M82 114Q90 117 98 114" fill="none" stroke="#fff3e8" stroke-width="3.4" stroke-linecap="round"/>',
'<path d="M83 115H98" fill="none" stroke-width="3.7" stroke-linecap="round"/>',
'<ellipse cx="91" cy="116" rx="6" ry="8" fill="#73344f"/>',
'<path d="M80 122Q90 108 101 122" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
'<path d="M80 110Q91 128 102 110" fill="none" stroke-width="4" stroke-linecap="round"/>',
'<path d="M82 116Q91 110 101 116" fill="none" stroke-width="3.5" stroke-linecap="round"/>',
'<path d="M81 110Q90 117 101 110L98 119Q90 126 84 118Z" fill="#c85872" stroke-width="2"/>'
];
function backArt(s){
 const seasonal=halloweenBack(s);if(seasonal)return seasonal;
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
 const halloween=halloweenOutfit(s);if(halloween){fill=halloween.fill;details=halloween.details;}
 const outline="#30243d";
 switch(s){
 case "outfit_hoodie":
  details='<path d="M65 122Q91 143 115 122" fill="none" stroke="#272438" stroke-width="4"/><path d="M79 132L79 153M101 132L101 153" stroke="#f4e1cf" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M69 160Q91 152 110 160V170Q90 177 69 170Z" fill="#25223a" opacity=".19"/><path d="M74 159H106" stroke="#ffffff" opacity=".34" stroke-width="3"/>';
  break;
 case "outfit_sport":
  details='<path d="M61 139H120M68 163H112" stroke="#fff1df" stroke-width="5"/><path d="M81 143H99V162H81Z" fill="#fff4e4" opacity=".28"/><text x="90" y="158" text-anchor="middle" font-size="15" font-family="sans-serif" font-weight="900" fill="#fff3df">7</text>';
  break;
 case "outfit_denim":
  fill="#428fc5";
  details='<path d="M64 127L91 146L115 127M91 146V176" stroke="#d2ebf4" stroke-width="4" fill="none"/><path d="M56 150H80L75 162H58ZM101 150H124L122 162H105Z" fill="#2d78a9" stroke="#b3d9e6" stroke-width="2"/><circle cx="92" cy="157" r="2.7" fill="#fbd78d"/>';
  break;
 case "outfit_suit":
  fill="#46506f";details='<path d="M67 127L90 151L114 127" fill="#fcf1e5" stroke="#30263d" stroke-width="3"/><path d="M71 130L88 152L80 159M108 130L94 152L101 159" stroke="#9da4b5" stroke-width="3" fill="none"/><path d="M86 141L96 141L94 168H88Z" fill="#ee927c"/><circle cx="87" cy="170" r="2.5" fill="#efdbb0"/>';
  break;
 case "outfit_chef":
  fill="#f4eadd";details='<path d="M90 126V179" stroke="#aeb5bc" stroke-width="3"/><circle cx="78" cy="149" r="3.5" fill="#647588"/><circle cx="78" cy="165" r="3.5" fill="#647588"/><path d="M100 141H117V151H100Z" fill="#d6a27b"/><path d="M101 147H116" stroke="#fff" stroke-width="2"/>';
  break;
 case "outfit_space":
  fill="#eef1f3";details='<rect x="74" y="139" width="33" height="22" rx="5" fill="#7fd4d7" stroke="#48526c" stroke-width="3"/><path d="M66 128V169M114 128V169" stroke="#a6b2c4" stroke-width="5"/><circle cx="84" cy="149" r="3" fill="#f7cb70"/><circle cx="96" cy="149" r="3" fill="#6a91da"/><path d="M60 172H121" stroke="#cad1da" stroke-width="5"/>';
  break;
 case "outfit_ninja":
  fill="#40405c";details='<path d="M62 129L118 165M118 129L62 165" stroke="#9370b5" stroke-width="8"/><path d="M71 170H109" stroke="#c8aecb" stroke-width="5"/>';
  break;
 case "outfit_royal":
  fill="#7952a6";details='<path d="M62 131L90 159L118 131" stroke="#f5d16f" stroke-width="8" fill="none"/><rect x="63" y="164" width="54" height="7" rx="3" fill="#e1b65b"/><circle cx="91" cy="168" r="5" fill="#f4e7ac"/><circle cx="60" cy="130" r="5" fill="#f1d06b"/><circle cx="121" cy="130" r="5" fill="#f1d06b"/>';
  break;
 case "outfit_banana":
  fill="#f9cd52";details='<path d="M71 126L111 176" stroke="#fff3ad" stroke-width="12"/><path d="M69 158Q87 168 111 158" stroke="#a87a35" stroke-width="3" fill="none"/><path d="M90 128V177" stroke="#a87a35" stroke-width="2.5" opacity=".55"/>';
  break;
 case "outfit_galaxy":
  fill="#514090";details='<circle cx="70" cy="140" r="5" fill="#efdc96"/><circle cx="112" cy="156" r="4" fill="#b0edee"/><path d="M66 164Q92 131 119 143" stroke="#b48bdf" stroke-width="4" fill="none"/><path d="M101 132L103 141L111 143L103 146L101 154L98 146L92 143L98 140Z" fill="#e8bddf"/>';
  break;
 default:details=details;
 }
 return '<path d="M58 122Q90 111 122 122L136 178Q89 192 43 178Z" fill="'+fill+'" stroke="'+outline+'" stroke-width="5" stroke-linejoin="round"/>'+
 '<path d="M65 125Q91 138 115 125" fill="none" stroke="#ffffff" opacity=".16" stroke-width="6"/>'+details;
}
function headArt(s){
 const seasonal=halloweenHead(s);if(seasonal)return seasonal;
 if(s==="head_party")return '<path d="M48 65Q48 39 89 37Q131 39 132 65Q90 75 48 65Z" fill="#e2a4aa" stroke="#30243d" stroke-width="4"/><path d="M69 65L90 7L111 65Z" fill="#f3a766" stroke="#30243d" stroke-width="4.5" stroke-linejoin="round"/><path d="M77 47H104M84 32H97" stroke="#fff0b3" stroke-width="7"/><circle cx="90" cy="7" r="6" fill="#f87fa5" stroke="#30243d" stroke-width="2"/><path d="M68 64Q90 67 112 64" stroke="#d47b80" stroke-width="5" fill="none"/>';
 switch(s){
 case "head_cap":
  return '<path d="M45 60Q41 27 70 20Q92 14 115 25Q136 36 136 60L130 67H48Z" fill="#6079cb" stroke="#30243d" stroke-width="4"/><path d="M89 61Q119 57 151 70Q127 82 91 71Z" fill="#374c86" stroke="#30243d" stroke-width="3"/><path d="M72 28Q92 21 114 33" fill="none" stroke="#b5c3f6" stroke-width="4" opacity=".6"/><path d="M63 59H116" stroke="#2d467e" stroke-width="3"/>';
 case "head_beanie":
  return '<path d="M42 58Q40 18 91 18Q136 20 138 60H42Z" fill="#e8a18d" stroke="#30243d" stroke-width="4"/><rect x="40" y="53" width="99" height="18" rx="8" fill="#f3c4a5" stroke="#30243d" stroke-width="4"/><circle cx="90" cy="17" r="10" fill="#f1d4a4" stroke="#30243d" stroke-width="3"/><path d="M54 59H125" stroke="#d68e7b" stroke-width="2.5" opacity=".8"/>';
 case "head_crown":
  return '<path d="M48 60L43 20L65 35L90 11L114 35L136 20L131 60Z" fill="#f0c35f" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/><rect x="48" y="52" width="83" height="13" rx="5" fill="#e1a64f" stroke="#30243d" stroke-width="3"/><path d="M90 38L96 45L90 51L84 45Z" fill="#e56f86"/>';
 case "head_champion":
  return '<path d="M39 59L33 9L58 30L89 3L122 30L146 9L139 59Z" fill="#ffe092" stroke="#30243d" stroke-width="4.5" stroke-linejoin="round"/><path d="M50 53L45 24L64 42L89 15L115 42L135 24L130 53Z" fill="#fac65a"/><rect x="39" y="53" width="101" height="16" rx="7" fill="#bd784f" stroke="#30243d" stroke-width="3"/><rect x="46" y="55" width="88" height="10" rx="4" fill="#ffd779"/><path d="M89 27L98 42L89 51L80 42Z" fill="#75dadd" stroke="#293f5c" stroke-width="2.5"/><circle cx="59" cy="44" r="4" fill="#eb7b97"/><circle cx="119" cy="44" r="4" fill="#eb7b97"/><path d="M45 67L47 83L57 70M133 67L132 83L122 70" fill="#f8cc6c" stroke="#30243d" stroke-width="2.5"/>';
 case "head_frog":
  return '<path d="M42 63Q44 25 90 27Q136 25 138 63Z" fill="#89ce7e" stroke="#30243d" stroke-width="4"/><circle cx="62" cy="30" r="13" fill="#a0d78d" stroke="#30243d" stroke-width="4"/><circle cx="117" cy="30" r="13" fill="#a0d78d" stroke="#30243d" stroke-width="4"/><circle cx="62" cy="30" r="5" fill="#28383b"/><circle cx="117" cy="30" r="5" fill="#28383b"/><path d="M78 54Q91 59 103 54" fill="none" stroke="#467f53" stroke-width="3"/>';
 case "head_cat":
  return '<path d="M44 56L38 13L69 32Q89 24 111 32L141 13L136 56Q91 69 44 56Z" fill="#d5b08d" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/><path d="M48 23L55 43L64 35Z M130 23L115 35L124 43Z" fill="#f19bab"/><path d="M68 57Q90 62 111 57" fill="none" stroke="#efcaad" stroke-width="4"/>';
 case "head_party":
  return '<path d="M73 65L89 5L109 65Z" fill="#f9aa6b" stroke="#30243d" stroke-width="4"/><path d="M79 49H104M85 30H98" stroke="#fff0ab" stroke-width="6"/><circle cx="90" cy="7" r="7" fill="#f87fa5" stroke="#30243d" stroke-width="2"/><path d="M75 64H107" stroke="#d77984" stroke-width="5"/>';
 case "head_chef":
  return '<path d="M49 62L47 39Q32 31 43 18Q57 7 68 16Q88 -5 106 16Q122 8 138 20Q149 35 134 44L132 63Z" fill="#fff8ec" stroke="#30243d" stroke-width="4"/><rect x="46" y="50" width="88" height="18" rx="5" fill="#eae6e5" stroke="#30243d" stroke-width="3"/><path d="M58 55H123" stroke="#ffffff" stroke-width="4" opacity=".8"/>';
 case "head_helmet":
  return '<path d="M40 86Q27 25 67 17Q91 9 118 20Q144 30 141 86L126 112L54 112Z" fill="#93a9ca" stroke="#30243d" stroke-width="5"/><path d="M53 68Q90 54 128 68L124 99Q90 112 55 99Z" fill="#76bec9" stroke="#30243d" stroke-width="4" opacity=".95"/><path d="M59 72Q87 63 118 74" stroke="#e4ffff" stroke-width="6" opacity=".7" fill="none" stroke-linecap="round"/><rect x="40" y="78" width="15" height="20" rx="6" fill="#6d759e" stroke="#30243d" stroke-width="3"/><rect x="126" y="78" width="15" height="20" rx="6" fill="#6d759e" stroke="#30243d" stroke-width="3"/>';
 case "head_pirate":
  return '<path d="M28 65Q52 53 58 31Q88 3 121 32Q128 56 152 65Q90 79 28 65Z" fill="#434159" stroke="#30243d" stroke-width="4"/><path d="M89 28L100 40L89 53L78 40Z" fill="#f8e6c6"/><circle cx="90" cy="40" r="4" fill="#434159"/><path d="M67 67Q90 73 116 67" stroke="#d6ab75" stroke-width="4" fill="none"/>';
 case "head_fish":
  return '<path d="M42 55Q54 16 111 28L140 12L136 42L142 70L110 58Q65 81 42 55Z" fill="#8dd1e1" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/><path d="M79 31L101 15L106 36" fill="#66b0ca" stroke="#30243d" stroke-width="3"/><circle cx="63" cy="50" r="6" fill="#fffaf2" stroke="#30243d" stroke-width="2"/><circle cx="65" cy="50" r="3" fill="#233449"/><path d="M89 44Q99 50 88 58M109 43Q119 49 108 57" stroke="#6babc2" fill="none" stroke-width="3"/>';
 default:return "";
 }
}
function faceArt(s){
 const seasonal=halloweenFace(s);if(seasonal)return seasonal;
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
 const bodyColor=halloweenOutfit(outfit)?.fill|| (outfit==="outfit_suit"?"#46506f":
  outfit==="outfit_space"?"#eef1f3":outfit==="outfit_chef"?"#f4eadd":
  outfit==="outfit_ninja"?"#40405c":outfit==="outfit_royal"?"#7952a6":
  outfit==="outfit_banana"?"#f9cd52":outfit==="outfit_galaxy"?"#514090":
  outfit==="outfit_denim"?"#428fc5":cloth);
 const coverage=headHairMode(head);
 const isHat=coverage!=="show";
 const integratedHair=coverage==="integrated"?
  '<path d="M49 66Q50 39 78 35Q92 30 111 38Q132 45 132 65Q122 56 111 56L100 65L90 58L80 66L66 57L53 70Z" fill="'+hairColor+
  '" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/>':"";
 const hasOpenEyes=[0,2,5].includes(eyes);
 const backBanana=outfit==="outfit_banana"?
 '<path d="M47 72Q28 25 75 16Q111 8 131 46L143 24Q139 84 129 110L54 105Z" fill="#f3ca55" stroke="#30243d" stroke-width="5"/><path d="M53 48Q81 16 117 45" fill="none" stroke="#fff2aa" stroke-width="7" opacity=".8"/>':"";
 return [
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 205" role="img" aria-label="Avatar caricaturesco Party Hub" data-hair-coverage="'+coverage+'">',
 '<g data-layer="ground"><ellipse cx="90" cy="194" rx="48" ry="8" fill="#131026" opacity=".28"/></g>',
 '<g data-layer="rear-accessory">',backArt(back),backBanana,'</g>',
 '<g data-layer="legs">',
 '<path d="M67 166L64 182Q70 191 82 185L88 168M104 166L111 184Q120 191 124 182L116 165" fill="'+bodyColor+'" stroke="#30243d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
 '<path d="M58 180Q68 175 81 180Q94 185 85 192L53 192Q48 185 58 180ZM99 180Q112 175 124 180Q136 186 126 192H96Q90 186 99 180Z" fill="#faf0e6" stroke="#30243d" stroke-width="4"/>',
 '<path d="M57 187H84M98 187H126" stroke="#b2acbd" stroke-width="2" opacity=".8"/>',
 '</g>',
 '<g data-layer="arms">',
 '<g data-arm="left"><path d="M61 129Q49 122 42 135L37 158Q33 174 46 177Q58 177 62 160L71 143" fill="'+skin+'" stroke="#30243d" stroke-width="5" stroke-linecap="round"/><path d="M63 128Q51 124 45 135L41 151Q52 159 64 151L72 139" fill="'+bodyColor+'" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/></g>',
 '<g data-arm="right"><path d="M118 129Q132 122 139 135L143 158Q147 174 133 177Q121 177 118 160L109 143" fill="'+skin+'" stroke="#30243d" stroke-width="5" stroke-linecap="round"/><path d="M117 128Q129 124 135 135L139 151Q128 159 116 151L108 139" fill="'+bodyColor+'" stroke="#30243d" stroke-width="4" stroke-linejoin="round"/></g>',
 '</g>',
 '<g data-layer="outfit">',outfitArt(outfit,cloth),
 '<path d="M70 175Q90 180 111 175" stroke="#ffffff" opacity=".15" stroke-width="3" fill="none" stroke-linecap="round"/></g>',
 '<g data-layer="front-back">',frontBackArt(back),'</g>',
 '<g data-layer="neck"><path d="M81 113V128Q90 138 101 128V113" fill="'+skin+'" stroke="#30243d" stroke-width="4"/></g>',
 '<g data-layer="rear-hair">',["show","hide_front"].includes(coverage)?rearHair(hair,hairColor):"","</g>",
 '<g data-layer="ears" style="display:',coverage==="replace"?"none":"inline",'">',
 '<ellipse cx="43" cy="96" rx="10" ry="14" fill="'+skin+'" stroke="#30243d" stroke-width="4"/>',
 '<ellipse cx="137" cy="96" rx="10" ry="14" fill="'+skin+'" stroke="#30243d" stroke-width="4"/>',
 '<path d="M42 92Q37 97 43 102M138 92Q143 97 137 102" fill="none" stroke="#8e5b56" opacity=".55" stroke-width="2.1" stroke-linecap="round"/>',
 '</g>',
 '<g data-layer="face" style="display:',coverage==="replace"?"none":"inline",'">',
 '<path d="M51 67Q55 43 89 40Q124 40 129 67L131 91Q131 115 111 129Q91 141 70 128Q49 114 49 91Z" fill="'+skin+'" stroke="#30243d" stroke-width="4.1" stroke-linejoin="round"/>',
 '<path d="M54 76Q59 51 79 49" fill="none" stroke="#fff3e2" stroke-width="5" opacity=".3" stroke-linecap="round"/>',
 '<ellipse cx="64" cy="106" rx="10" ry="5.5" fill="#f17e90" opacity=".19"/>',
 '<ellipse cx="116" cy="106" rx="10" ry="5.5" fill="#f17e90" opacity=".19"/>',
 '</g>',
 '<g data-layer="features" style="display:',coverage==="replace"?"none":"inline",'" fill="#30243d" stroke="#30243d">',
 '<path d="M61 78Q69 75 76 78M104 78Q112 75 119 78" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
 (["face_scary","face_mask","face_star","face_sun"].includes(face))?"":eyeStyles[eyes],
 hasOpenEyes&&!["face_scary","face_mask","face_star","face_sun"].includes(face)?'<ellipse cx="67.5" cy="88" rx="1.8" ry="2.5" fill="#fff7f0" stroke="none"/><ellipse cx="109" cy="88" rx="1.8" ry="2.5" fill="#fff7f0" stroke="none"/>':"",
 '<path d="M87 101Q90 103 93 101" stroke="#956154" stroke-width="2" fill="none" stroke-linecap="round"/>',
 (["face_stitched","face_mask","face_mustache"].includes(face))?"":mouthStyles[mouth],"</g>",
 '<g data-layer="front-hair">',integratedHair,
 coverage==="show"?'<path d="'+hairShapes[hair]+'" fill="'+hairColor+'" stroke="#30243d" stroke-width="3.5" stroke-linejoin="round"/>':"",
 coverage==="show"?('<path d="M55 49Q68 32 84 32" stroke="#fff7e7" stroke-width="3.5" fill="none" opacity=".15" stroke-linecap="round"/>'):"",
 '</g>',
 '<g data-layer="headwear">',headArt(head),'</g>',
 '<g data-layer="facial-accessory" style="display:',coverage==="replace"?"none":"inline",'">',faceArt(face),'</g>',
 '<g data-expression-effect="tears" opacity="0"><path d="M60 99L56 114Q59 120 63 114Z" fill="#85e4f5" stroke="#3a829c" stroke-width="2"/><path d="M116 99L119 114Q115 120 112 114Z" fill="#85e4f5" stroke="#3a829c" stroke-width="2"/></g>',
 '<g data-expression-effect="evil" opacity="0"><path d="M58 86Q67 72 77 84M102 84Q111 72 122 86" stroke="#e06b8e" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="69" cy="91" rx="6" ry="7" fill="#b84169"/><ellipse cx="111" cy="91" rx="6" ry="7" fill="#b84169"/></g>',
 '<g data-expression-effect="confetti" opacity="0"><path d="M28 53L35 42L41 52Z" fill="#ffd478"/><path d="M146 95L155 79L164 90Z" fill="#f19dbc"/><circle cx="150" cy="26" r="5" fill="#90d6c4"/><rect x="17" y="111" width="8" height="8" rx="1" fill="#b2a9fa" transform="rotate(20 17 111)"/></g>',
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


// Larger, cropped thumbnails show the ACTUAL unlock being sold. Facial items no
// longer look identical on microscopic full-body cards; back items stay visible.
export function makeCosmeticThumbnail(appearance,slot){
 const figure=makeAvatar(appearance,"avatar-item-figure");
 const svg=figure.firstElementChild;
 const crops={
  outfit:"30 112 120 82",
  head:"23 0 134 145",
  face:"42 65 96 70",
  back:"8 80 164 115",
  emote:"28 16 124 175"
 };
 if(svg)svg.setAttribute("viewBox",crops[slot]||"0 0 180 205");
 figure.dataset.cosmeticSlot=slot;
 return figure;
}
