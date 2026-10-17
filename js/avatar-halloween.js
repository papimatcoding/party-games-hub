// Original Halloween designs for Party Hub's shared chibi body rig.
// Not based on any licensed character. All shapes are curated SVG, no user markup.
export function halloweenHead(s){
 switch(s){
 case "head_pumpkin": return '<path d="M93 29L89 13Q100 7 112 14L102 32Z" fill="#699458" stroke="#30243d" stroke-width="4"/><path d="M91 29Q48 13 37 58Q26 97 46 121Q60 140 90 140Q119 141 135 119Q155 92 139 54Q122 16 91 29Z" fill="#f49a48" stroke="#33253e" stroke-width="5"/><path d="M65 36Q49 80 60 120M89 31Q78 81 89 137M117 35Q133 83 119 123" stroke="#cf713d" stroke-width="5" fill="none"/><path d="M56 82L79 89L70 99L54 96Z M124 82L102 89L111 99L127 96Z" fill="#302437"/><path d="M84 101L91 91L98 102Z" fill="#302437"/><path d="M62 111Q89 129 118 109L108 125L91 119L76 125Z" fill="#302437"/><path d="M57 48Q65 38 79 39" stroke="#ffd693" stroke-width="6" fill="none" opacity=".8" stroke-linecap="round"/>';
 case "head_hockey":return '<path d="M49 58Q56 31 89 29Q122 29 135 58L132 112Q113 139 91 140Q64 132 48 108Z" fill="#a78f84" stroke="#30243d" stroke-width="5"/><path d="M54 49Q89 27 128 49L129 110Q108 135 90 133Q61 126 52 107Z" fill="#ede7d7" stroke="#30243d" stroke-width="4"/><path d="M85 43L86 112M96 43L94 112" stroke="#9fa2a6" stroke-width="3" opacity=".5"/><ellipse cx="69" cy="86" rx="10" ry="7" fill="#2e283d"/><ellipse cx="112" cy="86" rx="10" ry="7" fill="#2e283d"/><path d="M90 98L84 106L96 106Z" fill="#353144"/><path d="M70 106L76 118M111 106L105 118" stroke="#c66172" stroke-width="4"/><circle cx="64" cy="63" r="3" fill="#8c959c"/><circle cx="116" cy="63" r="3" fill="#8c959c"/><circle cx="90" cy="120" r="3" fill="#8c959c"/>';
 case "head_witch":return '<path d="M88 6Q110 20 117 40L137 57L146 68Q89 83 33 68L57 51Q73 26 88 6Z" fill="#624a86" stroke="#30243d" stroke-width="5" stroke-linejoin="round"/><path d="M60 55Q93 64 126 53" stroke="#e0a471" stroke-width="9" fill="none"/><rect x="84" y="51" width="17" height="12" rx="2" fill="#f8cd74" stroke="#463453" stroke-width="3"/><path d="M85 21Q92 27 91 36" stroke="#b5a0cf" stroke-width="3" fill="none"/>';
 case "head_spectral":return '<path d="M90 22Q123 18 137 57Q147 102 121 140L109 154L98 143L83 151L68 138Q34 116 40 69Q46 26 90 22Z" fill="#d6d0dc" stroke="#30243d" stroke-width="5" stroke-linejoin="round"/><path d="M90 31Q116 29 129 64Q138 92 117 123Q102 142 90 138Q65 142 52 106Q43 72 57 47Q68 32 90 31Z" fill="#f5eff0" stroke="#8d8299" stroke-width="2.5"/><path d="M57 76Q69 59 80 76Q73 99 65 99Q54 91 57 76Z M104 76Q118 60 125 76Q123 96 114 100Q103 91 104 76Z" fill="#282436"/><path d="M88 106L79 124L89 131L98 124Z" fill="#30253d"/><path d="M77 140Q90 131 103 140" stroke="#827f91" stroke-width="3" fill="none"/><path d="M60 53Q70 37 84 39" stroke="#fff" stroke-width="5" fill="none" opacity=".65"/>';
 case "head_ghost":return '<path d="M50 37Q66 20 90 22Q119 21 133 43Q145 75 141 108L147 141L130 132L116 143L102 132L90 143L76 133L60 142L48 131L32 140L40 103Q36 59 50 37Z" fill="#fbf5e9" stroke="#30243d" stroke-width="5" stroke-linejoin="round"/><path d="M52 54Q70 33 92 38" stroke="#fff" opacity=".85" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="69" cy="90" rx="9" ry="11" fill="#353047"/><ellipse cx="110" cy="90" rx="9" ry="11" fill="#353047"/><path d="M84 114Q90 105 97 115Q90 127 84 114Z" fill="#353047"/>';
 default:return "";
 }
}
export function halloweenFace(s){
 switch(s){
 case "face_scary":return '<path d="M55 82Q67 71 79 82M101 82Q112 71 125 82" stroke="#67436f" stroke-width="5" fill="none"/><ellipse cx="69" cy="92" rx="9" ry="10" fill="#30243c"/><ellipse cx="112" cy="92" rx="9" ry="10" fill="#30243c"/><circle cx="66" cy="87" r="2" fill="#ecd9f7"/><circle cx="109" cy="87" r="2" fill="#ecd9f7"/><path d="M87 113Q91 109 95 113" stroke="#67436f" stroke-width="4" fill="none"/>';
 case "face_stitched":return '<path d="M66 117Q90 129 115 116" fill="none" stroke="#613e56" stroke-width="3"/><path d="M74 115L71 124M85 119L83 127M97 119L99 127M107 115L110 124" stroke="#613e56" stroke-width="3"/><path d="M58 81L74 77M104 77L120 81" stroke="#77546b" stroke-width="3" fill="none"/>';
 default:return "";
 }
}
export function halloweenOutfit(s){
 switch(s){
 case "outfit_skeleton":return {fill:"#353448",details:'<path d="M91 132V173M73 141H109M74 153H108M80 164H103" stroke="#faf0df" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M75 170L84 165M106 170L97 165" stroke="#f9e8d6" stroke-width="5" fill="none"/>'};
 case "outfit_witch":return {fill:"#634475",details:'<path d="M67 128Q91 151 114 128" fill="none" stroke="#e9ae8d" stroke-width="8"/><path d="M65 156H115" stroke="#352942" stroke-width="7"/><rect x="82" y="151" width="17" height="14" rx="2" fill="#e9c073" stroke="#30243d" stroke-width="3"/><path d="M58 172Q90 188 124 172" stroke="#a886b7" stroke-width="4" fill="none"/>'};
 case "outfit_vampire":return {fill:"#49435f",details:'<path d="M66 126L90 149L114 126" fill="#e9e3e8" stroke="#30243d" stroke-width="3"/><path d="M84 137H97L94 169H88Z" fill="#bc5f78"/><path d="M58 128L49 171M123 128L132 171" stroke="#ab617a" stroke-width="7"/><circle cx="91" cy="168" r="4" fill="#f4cf90"/>'};
 default:return null;
 }
}
export function halloweenBack(s){
 if(s==="back_smoke")return '<path d="M60 160Q20 163 29 139Q14 115 37 103Q22 76 51 66Q61 54 78 68M119 160Q159 163 150 139Q166 115 143 103Q157 76 130 66Q119 54 102 68" fill="none" stroke="#b49adb" stroke-width="12" stroke-linecap="round" opacity=".9"/><path d="M53 166Q16 156 35 137M126 165Q161 153 143 137" fill="none" stroke="#f5d3ef" stroke-width="4" stroke-linecap="round" opacity=".7"/><circle cx="32" cy="94" r="8" fill="#a385c7" opacity=".75"/><circle cx="150" cy="98" r="8" fill="#a385c7" opacity=".75"/>';
 if(s!=="back_bats")return "";
 return '<path d="M41 126L23 103L27 123L10 118L18 145L40 143L49 159L61 138Z" fill="#554265" stroke="#30243d" stroke-width="3"/><path d="M139 126L157 103L153 123L170 118L162 145L140 143L131 159L119 138Z" fill="#554265" stroke="#30243d" stroke-width="3"/><circle cx="30" cy="135" r="2.2" fill="#f7bac9"/><circle cx="149" cy="135" r="2.2" fill="#f7bac9"/>';
}
// Every hat owns the entire hair silhouette. Crowns are the only pieces with
// a bespoke, fitted hairstyle instead of layering on whichever base hair is worn.
export const HEAD_COVERAGE=Object.freeze({
 head_none:"show",
 head_cap:"hide_all",head_beanie:"hide_all",head_chef:"hide_all",
 head_frog:"hide_all",head_fish:"hide_all",head_helmet:"hide_all",
 head_cat:"hide_all",head_party:"hide_all",head_pirate:"hide_all",
 head_witch:"hide_all",
 head_crown:"integrated",head_champion:"integrated",
 head_pumpkin:"replace",head_hockey:"replace",head_ghost:"replace",
 head_spectral:"replace"
});
export function headHairMode(code){return HEAD_COVERAGE[code]||"show";}
