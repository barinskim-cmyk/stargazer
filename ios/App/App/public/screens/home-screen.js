/**
 * @fileoverview Home Screen Module
 *
 * Dependencies (from window):
 *   - LC: canvas utilities (sizeCanvas, setupCanvas, dpr)
 *   - drawStarPointTo: star drawing function
 *   - RADIUS: global star radius (will be overridden temporarily)
 *   - loadProgress: load player progress
 *   - computeRank: compute player rank
 *   - t: translation function
 *   - THEMES: theme configuration
 *   - activeTheme: current active theme
 *   - openSettingsScreen: navigate to settings
 *   - openProfileScreen: navigate to profile
 *   - rankToAiLevel: convert rank to AI level
 *   - startGame: begin game
 *   - _lang: language code
 *
 * Game globals set by home-play-btn handler:
 *   - COUNT: number of stars (from _homeSelectedLength)
 *   - isAI: whether playing vs AI (always true on home screen)
 *   - playerNames: array of player names
 *   - stargazerLevel: AI difficulty level
 *
 * Exports:
 *   - window.showHomeScreen: display home screen
 *   - window._startHomeBgAnim: start background constellation animation
 *   - window._stopHomeBgAnim: stop background constellation animation
 *   - window._constName: get localized constellation name
 *   - window.REAL_CONSTELLATIONS: 88 IAU constellation data
 *   - window.CONSTELLATION_RU: Russian constellation name translations
 */

(function() {
  'use strict';

  // ── 88 real IAU constellations (normalized coords) ────────────────────────
  var REAL_CONSTELLATIONS=[
{n:'Andromeda',pts:[{x:.50,y:.15},{x:.38,y:.30},{x:.25,y:.47},{x:.62,y:.42},{x:.74,y:.56},{x:.85,y:.68}],lns:[[0,1],[1,2],[1,3],[3,4],[4,5]]},
{n:'Antlia',pts:[{x:.28,y:.28},{x:.65,y:.22},{x:.72,y:.68},{x:.32,y:.74}],lns:[[0,1],[1,2],[2,3],[3,0]]},
{n:'Apus',pts:[{x:.50,y:.18},{x:.28,y:.48},{x:.55,y:.78},{x:.78,y:.52}],lns:[[0,1],[1,2],[2,3],[3,0]]},
{n:'Aquarius',pts:[{x:.50,y:.12},{x:.35,y:.28},{x:.20,y:.44},{x:.50,y:.44},{x:.68,y:.28},{x:.25,y:.62},{x:.45,y:.78},{x:.68,y:.82},{x:.82,y:.65}],lns:[[0,1],[0,4],[1,2],[1,3],[3,4],[2,5],[5,6],[6,7],[7,8]]},
{n:'Aquila',pts:[{x:.50,y:.50},{x:.28,y:.35},{x:.12,y:.22},{x:.72,y:.32},{x:.88,y:.18},{x:.50,y:.72},{x:.50,y:.90}],lns:[[0,1],[1,2],[0,3],[3,4],[0,5],[5,6]]},
{n:'Ara',pts:[{x:.22,y:.28},{x:.78,y:.25},{x:.80,y:.65},{x:.55,y:.82},{x:.20,y:.68}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Aries',pts:[{x:.18,y:.42},{x:.40,y:.34},{x:.62,y:.38},{x:.82,y:.50}],lns:[[0,1],[1,2],[2,3]]},
{n:'Auriga',pts:[{x:.50,y:.08},{x:.12,y:.38},{x:.18,y:.80},{x:.50,y:.92},{x:.82,y:.78},{x:.88,y:.38}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Boötes',pts:[{x:.50,y:.08},{x:.22,y:.32},{x:.18,y:.65},{x:.50,y:.88},{x:.80,y:.62},{x:.78,y:.30}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,5]]},
{n:'Caelum',pts:[{x:.22,y:.32},{x:.58,y:.18},{x:.78,y:.58},{x:.42,y:.78}],lns:[[0,1],[1,2],[2,3]]},
{n:'Camelopardalis',pts:[{x:.18,y:.12},{x:.38,y:.22},{x:.52,y:.38},{x:.62,y:.55},{x:.58,y:.72},{x:.72,y:.88}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
{n:'Cancer',pts:[{x:.50,y:.12},{x:.18,y:.42},{x:.82,y:.38},{x:.32,y:.78},{x:.68,y:.75}],lns:[[0,1],[0,2],[1,3],[2,4]]},
{n:'Canes Venatici',pts:[{x:.32,y:.32},{x:.68,y:.68}],lns:[[0,1]]},
{n:'Canis Major',pts:[{x:.50,y:.12},{x:.28,y:.30},{x:.18,y:.55},{x:.32,y:.75},{x:.62,y:.82},{x:.78,y:.60},{x:.82,y:.32}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,6]]},
{n:'Canis Minor',pts:[{x:.28,y:.38},{x:.72,y:.62}],lns:[[0,1]]},
{n:'Capricornus',pts:[{x:.12,y:.22},{x:.48,y:.12},{x:.88,y:.25},{x:.85,y:.68},{x:.50,y:.85},{x:.18,y:.65}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,5],[0,4]]},
{n:'Carina',pts:[{x:.08,y:.55},{x:.22,y:.32},{x:.45,y:.18},{x:.68,y:.22},{x:.82,y:.40},{x:.92,y:.68}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
{n:'Cassiopeia',pts:[{x:.05,y:.68},{x:.28,y:.18},{x:.50,y:.52},{x:.72,y:.18},{x:.95,y:.62}],lns:[[0,1],[1,2],[2,3],[3,4]]},
{n:'Centaurus',pts:[{x:.50,y:.12},{x:.28,y:.28},{x:.12,y:.52},{x:.22,y:.78},{x:.52,y:.88},{x:.78,y:.72},{x:.88,y:.45},{x:.72,y:.22}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[1,7],[5,3]]},
{n:'Cepheus',pts:[{x:.50,y:.08},{x:.18,y:.35},{x:.22,y:.78},{x:.50,y:.92},{x:.78,y:.75},{x:.82,y:.32}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,5]]},
{n:'Cetus',pts:[{x:.50,y:.12},{x:.22,y:.22},{x:.08,y:.48},{x:.18,y:.78},{x:.48,y:.88},{x:.78,y:.72},{x:.88,y:.45},{x:.72,y:.18},{x:.50,y:.42}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[8,1],[8,6]]},
{n:'Chamaeleon',pts:[{x:.18,y:.48},{x:.45,y:.18},{x:.82,y:.35},{x:.78,y:.72},{x:.38,y:.80}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Circinus',pts:[{x:.28,y:.18},{x:.50,y:.78},{x:.78,y:.22}],lns:[[0,1],[1,2],[2,0]]},
{n:'Columba',pts:[{x:.50,y:.18},{x:.22,y:.48},{x:.48,y:.72},{x:.75,y:.52},{x:.82,y:.28}],lns:[[0,1],[1,2],[2,3],[3,0],[0,4]]},
{n:'Coma Berenices',pts:[{x:.22,y:.28},{x:.55,y:.18},{x:.78,y:.52},{x:.45,y:.78}],lns:[[0,1],[1,2],[2,3]]},
{n:'Corona Australis',pts:[{x:.12,y:.52},{x:.25,y:.25},{x:.42,y:.08},{x:.62,y:.08},{x:.78,y:.25},{x:.88,y:.52}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
{n:'Corona Borealis',pts:[{x:.08,y:.55},{x:.20,y:.22},{x:.42,y:.08},{x:.62,y:.12},{x:.78,y:.30},{x:.88,y:.58}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
{n:'Corvus',pts:[{x:.18,y:.18},{x:.82,y:.22},{x:.78,y:.78},{x:.22,y:.82}],lns:[[0,1],[1,2],[2,3],[3,0],[0,2]]},
{n:'Crater',pts:[{x:.50,y:.12},{x:.18,y:.42},{x:.12,y:.75},{x:.50,y:.88},{x:.82,y:.72},{x:.85,y:.38}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Crux',pts:[{x:.50,y:.05},{x:.50,y:.95},{x:.05,y:.50},{x:.95,y:.50}],lns:[[0,1],[2,3]]},
{n:'Cygnus',pts:[{x:.50,y:.08},{x:.50,y:.48},{x:.50,y:.92},{x:.08,y:.48},{x:.92,y:.48},{x:.50,y:.68}],lns:[[0,1],[1,2],[3,4],[1,5]]},
{n:'Delphinus',pts:[{x:.50,y:.12},{x:.78,y:.35},{x:.68,y:.65},{x:.32,y:.65},{x:.22,y:.35},{x:.50,y:.92}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0],[2,5]]},
{n:'Dorado',pts:[{x:.50,y:.12},{x:.22,y:.42},{x:.18,y:.72},{x:.48,y:.88},{x:.78,y:.62}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Draco',pts:[{x:.50,y:.08},{x:.68,y:.18},{x:.82,y:.32},{x:.78,y:.52},{x:.62,y:.62},{x:.50,y:.58},{x:.35,y:.52},{x:.22,y:.65},{x:.12,y:.82}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]},
{n:'Equuleus',pts:[{x:.22,y:.32},{x:.55,y:.18},{x:.78,y:.55},{x:.42,y:.72}],lns:[[0,1],[1,2],[2,3],[3,0]]},
{n:'Eridanus',pts:[{x:.88,y:.08},{x:.72,y:.22},{x:.55,y:.35},{x:.38,y:.48},{x:.22,y:.38},{x:.12,y:.52},{x:.22,y:.68},{x:.45,y:.80},{x:.62,y:.92}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]},
{n:'Fornax',pts:[{x:.22,y:.32},{x:.62,y:.18},{x:.82,y:.58},{x:.55,y:.82}],lns:[[0,1],[1,2],[2,3],[3,0]]},
{n:'Gemini',pts:[{x:.22,y:.08},{x:.78,y:.08},{x:.18,y:.35},{x:.72,y:.33},{x:.12,y:.65},{x:.65,y:.62},{x:.12,y:.92},{x:.62,y:.90}],lns:[[0,2],[2,4],[4,6],[1,3],[3,5],[5,7],[0,1],[4,5]]},
{n:'Grus',pts:[{x:.50,y:.08},{x:.32,y:.28},{x:.50,y:.55},{x:.68,y:.28},{x:.50,y:.80},{x:.28,y:.92}],lns:[[0,1],[1,2],[2,3],[3,0],[2,4],[4,5]]},
{n:'Hercules',pts:[{x:.50,y:.12},{x:.28,y:.28},{x:.22,y:.55},{x:.38,y:.70},{x:.62,y:.68},{x:.78,y:.52},{x:.72,y:.25},{x:.28,y:.88},{x:.72,y:.88}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[3,7],[4,8]]},
{n:'Horologium',pts:[{x:.50,y:.08},{x:.28,y:.35},{x:.22,y:.65},{x:.40,y:.88},{x:.68,y:.82}],lns:[[0,1],[1,2],[2,3],[3,4]]},
{n:'Hydra',pts:[{x:.05,y:.48},{x:.14,y:.38},{x:.25,y:.42},{x:.36,y:.32},{x:.48,y:.38},{x:.58,y:.48},{x:.68,y:.42},{x:.78,y:.52},{x:.88,y:.60},{x:.95,y:.55}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]]},
{n:'Hydrus',pts:[{x:.50,y:.08},{x:.12,y:.62},{x:.78,y:.82}],lns:[[0,1],[1,2],[2,0]]},
{n:'Indus',pts:[{x:.50,y:.12},{x:.18,y:.62},{x:.62,y:.88}],lns:[[0,1],[1,2],[2,0]]},
{n:'Lacerta',pts:[{x:.18,y:.18},{x:.40,y:.35},{x:.28,y:.55},{x:.55,y:.65},{x:.42,y:.82},{x:.72,y:.88}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5]]},
{n:'Leo',pts:[{x:.50,y:.48},{x:.30,y:.25},{x:.15,y:.38},{x:.22,y:.55},{x:.42,y:.60},{x:.65,y:.35},{x:.82,y:.18},{x:.75,y:.80}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[5,6],[5,7]]},
{n:'Leo Minor',pts:[{x:.18,y:.38},{x:.45,y:.22},{x:.72,y:.38},{x:.88,y:.65}],lns:[[0,1],[1,2],[2,3]]},
{n:'Lepus',pts:[{x:.22,y:.18},{x:.62,y:.12},{x:.82,y:.40},{x:.78,y:.78},{x:.42,y:.88},{x:.18,y:.65}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Libra',pts:[{x:.50,y:.12},{x:.18,y:.50},{x:.50,y:.65},{x:.82,y:.48},{x:.50,y:.90}],lns:[[0,1],[0,3],[1,2],[2,3],[2,4]]},
{n:'Lupus',pts:[{x:.50,y:.12},{x:.18,y:.30},{x:.12,y:.65},{x:.38,y:.88},{x:.72,y:.82},{x:.88,y:.55},{x:.75,y:.22}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]]},
{n:'Lynx',pts:[{x:.08,y:.12},{x:.22,y:.25},{x:.38,y:.22},{x:.55,y:.35},{x:.68,y:.52},{x:.78,y:.68},{x:.88,y:.82}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]},
{n:'Lyra',pts:[{x:.50,y:.08},{x:.22,y:.40},{x:.35,y:.78},{x:.65,y:.78},{x:.78,y:.40}],lns:[[0,1],[0,4],[1,2],[2,3],[3,4],[1,4]]},
{n:'Mensa',pts:[{x:.12,y:.38},{x:.50,y:.18},{x:.82,y:.45},{x:.78,y:.78},{x:.32,y:.82}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Microscopium',pts:[{x:.22,y:.22},{x:.78,y:.18},{x:.82,y:.78},{x:.18,y:.78}],lns:[[0,1],[1,2],[2,3],[3,0]]},
{n:'Monoceros',pts:[{x:.18,y:.28},{x:.50,y:.18},{x:.78,y:.40},{x:.62,y:.72},{x:.28,y:.75}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Musca',pts:[{x:.50,y:.12},{x:.18,y:.45},{x:.30,y:.82},{x:.72,y:.82},{x:.82,y:.45}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Norma',pts:[{x:.22,y:.22},{x:.78,y:.18},{x:.82,y:.78},{x:.22,y:.78}],lns:[[0,1],[1,2],[2,3]]},
{n:'Octans',pts:[{x:.50,y:.12},{x:.12,y:.78},{x:.82,y:.82}],lns:[[0,1],[1,2],[2,0]]},
{n:'Ophiuchus',pts:[{x:.50,y:.08},{x:.18,y:.25},{x:.12,y:.60},{x:.28,y:.88},{x:.72,y:.88},{x:.88,y:.58},{x:.82,y:.22}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]]},
{n:'Orion',pts:[{x:.50,y:.08},{x:.22,y:.28},{x:.78,y:.25},{x:.35,y:.52},{x:.50,y:.52},{x:.65,y:.52},{x:.22,y:.78},{x:.78,y:.75}],lns:[[0,1],[0,2],[1,3],[2,5],[3,4],[4,5],[1,6],[2,7]]},
{n:'Pavo',pts:[{x:.50,y:.08},{x:.22,y:.35},{x:.18,y:.72},{x:.50,y:.92},{x:.82,y:.70},{x:.78,y:.32}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Pegasus',pts:[{x:.12,y:.22},{x:.88,y:.22},{x:.88,y:.78},{x:.12,y:.78},{x:.12,y:.08},{x:.38,y:.05}],lns:[[0,1],[1,2],[2,3],[3,0],[0,4],[4,5]]},
{n:'Perseus',pts:[{x:.50,y:.08},{x:.28,y:.25},{x:.12,y:.45},{x:.22,y:.65},{x:.48,y:.78},{x:.72,y:.62},{x:.78,y:.35},{x:.65,y:.12}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]]},
{n:'Phoenix',pts:[{x:.50,y:.12},{x:.18,y:.40},{x:.12,y:.78},{x:.50,y:.92},{x:.82,y:.72},{x:.82,y:.35}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Pictor',pts:[{x:.18,y:.38},{x:.55,y:.18},{x:.82,y:.62}],lns:[[0,1],[1,2]]},
{n:'Pisces',pts:[{x:.50,y:.12},{x:.22,y:.28},{x:.08,y:.55},{x:.22,y:.82},{x:.50,y:.90},{x:.78,y:.75},{x:.88,y:.48},{x:.72,y:.22},{x:.50,y:.52}],lns:[[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,0],[4,8],[8,5]]},
{n:'Piscis Austrinus',pts:[{x:.50,y:.18},{x:.18,y:.50},{x:.28,y:.82},{x:.72,y:.82},{x:.82,y:.50}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Puppis',pts:[{x:.28,y:.12},{x:.72,y:.18},{x:.88,y:.55},{x:.65,y:.88},{x:.28,y:.82},{x:.12,y:.50}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Pyxis',pts:[{x:.50,y:.12},{x:.50,y:.50},{x:.50,y:.88}],lns:[[0,1],[1,2]]},
{n:'Reticulum',pts:[{x:.50,y:.08},{x:.88,y:.45},{x:.50,y:.92},{x:.12,y:.45}],lns:[[0,1],[1,2],[2,3],[3,0]]},
{n:'Sagitta',pts:[{x:.08,y:.52},{x:.45,y:.52},{x:.72,y:.28},{x:.92,y:.52},{x:.72,y:.72}],lns:[[0,1],[1,2],[1,3],[1,4]]},
{n:'Sagittarius',pts:[{x:.28,y:.12},{x:.55,y:.08},{x:.78,y:.22},{x:.82,y:.55},{x:.65,y:.78},{x:.38,y:.82},{x:.18,y:.62},{x:.12,y:.35},{x:.50,y:.45}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[8,1],[8,7],[8,3]]},
{n:'Scorpius',pts:[{x:.50,y:.08},{x:.30,y:.20},{x:.22,y:.38},{x:.32,y:.52},{x:.50,y:.58},{x:.60,y:.70},{x:.55,y:.82},{x:.65,y:.92},{x:.78,y:.80}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]},
{n:'Sculptor',pts:[{x:.22,y:.32},{x:.62,y:.18},{x:.82,y:.58},{x:.60,y:.82},{x:.22,y:.78}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Scutum',pts:[{x:.28,y:.22},{x:.72,y:.28},{x:.78,y:.72},{x:.28,y:.78}],lns:[[0,1],[1,2],[2,3],[3,0]]},
{n:'Serpens',pts:[{x:.12,y:.38},{x:.28,y:.18},{x:.50,y:.22},{x:.68,y:.38},{x:.62,y:.60},{x:.78,y:.78},{x:.88,y:.65}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]},
{n:'Sextans',pts:[{x:.22,y:.32},{x:.50,y:.18},{x:.78,y:.35},{x:.68,y:.72},{x:.28,y:.78}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Taurus',pts:[{x:.50,y:.50},{x:.28,y:.40},{x:.18,y:.58},{x:.32,y:.68},{x:.68,y:.32},{x:.82,y:.22},{x:.38,y:.18},{x:.50,y:.08},{x:.62,y:.12}],lns:[[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[0,6],[6,7],[7,8]]},
{n:'Telescopium',pts:[{x:.22,y:.32},{x:.50,y:.18},{x:.78,y:.35},{x:.82,y:.68},{x:.55,y:.82}],lns:[[0,1],[1,2],[2,3],[3,4]]},
{n:'Triangulum',pts:[{x:.50,y:.08},{x:.12,y:.82},{x:.88,y:.82}],lns:[[0,1],[1,2],[2,0]]},
{n:'Triangulum Australe',pts:[{x:.50,y:.08},{x:.08,y:.88},{x:.92,y:.88}],lns:[[0,1],[1,2],[2,0]]},
{n:'Tucana',pts:[{x:.50,y:.12},{x:.18,y:.40},{x:.18,y:.78},{x:.50,y:.92},{x:.82,y:.72},{x:.78,y:.32}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Ursa Major',pts:[{x:.08,y:.45},{x:.22,y:.38},{x:.38,y:.32},{x:.52,y:.32},{x:.72,y:.20},{x:.80,y:.55},{x:.58,y:.62},{x:.38,y:.55}],lns:[[0,1],[1,2],[2,3],[3,7],[7,6],[6,5],[5,4],[4,3],[7,2]]},
{n:'Ursa Minor',pts:[{x:.50,y:.08},{x:.65,y:.25},{x:.72,y:.45},{x:.55,y:.62},{x:.38,y:.55},{x:.28,y:.68},{x:.20,y:.88}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]]},
{n:'Vela',pts:[{x:.18,y:.28},{x:.50,y:.12},{x:.82,y:.28},{x:.88,y:.65},{x:.60,y:.88},{x:.22,y:.78}],lns:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]]},
{n:'Virgo',pts:[{x:.50,y:.08},{x:.22,y:.25},{x:.12,y:.55},{x:.32,y:.82},{x:.68,y:.82},{x:.82,y:.52},{x:.72,y:.22},{x:.50,y:.50}],lns:[[0,1],[1,2],[2,3],[3,7],[7,4],[4,5],[5,6],[6,0],[7,0]]},
{n:'Volans',pts:[{x:.50,y:.12},{x:.18,y:.42},{x:.28,y:.78},{x:.72,y:.78},{x:.82,y:.42}],lns:[[0,1],[1,2],[2,3],[3,4],[4,0]]},
{n:'Vulpecula',pts:[{x:.18,y:.42},{x:.50,y:.28},{x:.78,y:.50},{x:.62,y:.78}],lns:[[0,1],[1,2],[2,3]]}
];

  // ── Russian constellation name translations ────────────────────────────────
  var CONSTELLATION_RU = {
    'Andromeda':'Андромеда','Antlia':'Насос','Apus':'Райская Птица',
    'Aquarius':'Водолей','Aquila':'Орёл','Ara':'Жертвенник',
    'Aries':'Овен','Auriga':'Возничий','Boötes':'Волопас',
    'Caelum':'Резец','Camelopardalis':'Жираф','Cancer':'Рак',
    'Canes Venatici':'Гончие Псы','Canis Major':'Большой Пёс','Canis Minor':'Малый Пёс',
    'Capricornus':'Козерог','Carina':'Киль','Cassiopeia':'Кассиопея',
    'Centaurus':'Центавр','Cepheus':'Цефей','Cetus':'Кит',
    'Chamaeleon':'Хамелеон','Circinus':'Циркуль','Columba':'Голубь',
    'Coma Berenices':'Волосы Вероники','Corona Australis':'Южная Корона','Corona Borealis':'Северная Корона',
    'Corvus':'Ворон','Crater':'Чаша','Crux':'Южный Крест',
    'Cygnus':'Лебедь','Delphinus':'Дельфин','Dorado':'Золотая Рыба',
    'Draco':'Дракон','Equuleus':'Малый Конь','Eridanus':'Эридан',
    'Fornax':'Печь','Gemini':'Близнецы','Grus':'Журавль',
    'Hercules':'Геркулес','Horologium':'Часы','Hydra':'Гидра',
    'Hydrus':'Малая Гидра','Indus':'Индеец','Lacerta':'Ящерица',
    'Leo':'Лев','Leo Minor':'Малый Лев','Lepus':'Заяц',
    'Libra':'Весы','Lupus':'Волк','Lynx':'Рысь',
    'Lyra':'Лира','Mensa':'Столовая Гора','Microscopium':'Микроскоп',
    'Monoceros':'Единорог','Musca':'Муха','Norma':'Угольник',
    'Octans':'Октант','Ophiuchus':'Змееносец','Orion':'Орион',
    'Pavo':'Павлин','Pegasus':'Пегас','Perseus':'Персей',
    'Phoenix':'Феникс','Pictor':'Живописец','Pisces':'Рыбы',
    'Piscis Austrinus':'Южная Рыба','Puppis':'Корма','Pyxis':'Компас',
    'Reticulum':'Сетка','Sagitta':'Стрела','Sagittarius':'Стрелец',
    'Scorpius':'Скорпион','Sculptor':'Скульптор','Scutum':'Щит',
    'Serpens':'Змея','Sextans':'Секстант','Taurus':'Телец',
    'Telescopium':'Телескоп','Triangulum':'Треугольник','Triangulum Australe':'Южный Треугольник',
    'Tucana':'Тукан','Ursa Major':'Большая Медведица','Ursa Minor':'Малая Медведица',
    'Vela':'Паруса','Virgo':'Дева','Volans':'Летучая Рыба','Vulpecula':'Лисичка'
  };

  /** Return the localized constellation name (Russian if lang=ru, else original). */
  function _constName(n) {
    if (_lang === 'ru' && CONSTELLATION_RU[n]) return CONSTELLATION_RU[n];
    return n;
  }

  // ── Home screen background constellation animation ─────────────────────────
  var _homeBgRaf       = null;
  var _homeBgData      = null;
  var _homeBgConstName = '';
  var _homeBgTwinkle   = [];
  var _homeBgConstIdx  = 0;       // index in REAL_CONSTELLATIONS
  var _homeBgFade        = null;  // multi-phase transition: {phase:'out'|'gap'|'stars'|'lines'}
  var _homeBgIdleTwinkle = null;  // victory-style idle twinkle: {idx,startMs,duration,waitUntil}

  function _stopHomeBgAnim() {
    if (_homeBgRaf) { cancelAnimationFrame(_homeBgRaf); _homeBgRaf = null; }
  }

  /** Pick the next star to idle-twinkle (victory-screen style). */
  function _homePickTwinkle(now) {
    if (!_homeBgData || !_homeBgData.points.length) return;
    var idx      = Math.floor(Math.random() * _homeBgData.points.length);
    var duration = 900 + Math.random() * 500;
    _homeBgIdleTwinkle = { idx: idx, startMs: now, duration: duration,
                            waitUntil: now + duration + 1500 + Math.random() * 2500 };
  }

  /**
   * Draw one constellation scene onto ctx2.
   * alpha          — uniform opacity (fade-out phase).
   * starAlphas     — optional per-star opacity array (stars phase).
   * starFlashBoosts — optional per-star extra boost for end-of-fadein flash.
   * lineAlphas     — optional per-line opacity array (lines phase).
   *                  null = draw all lines at `alpha` with existing 3-pass style.
   */
  function _homeDrawConstScene(ctx2, data, twinkle, name, alpha, pw, ph, ts,
                                starAlphas, starFlashBoosts, lineAlphas, lineProgress, starScales, lineAnchors) {
    if (!data || !data.points || !data.points.length) return;
    var pts = data.points;
    var mnx = 1, mxx = 0, mny = 1, mxy = 0;
    pts.forEach(function(p) {
      mnx = Math.min(mnx, p.x); mxx = Math.max(mxx, p.x);
      mny = Math.min(mny, p.y); mxy = Math.max(mxy, p.y);
    });
    var span    = Math.max(mxx - mnx, mxy - mny, 0.01);
    var scalePx = (Math.min(pw, ph) * 0.54) / span;
    var cx0     = pw * 0.5, cy0 = ph * 0.44;
    var mpx     = function(pt) { return cx0 + (pt.x - (mnx + mxx) / 2) * scalePx; };
    var mpy     = function(pt) { return cy0 + (pt.y - (mny + mxy) / 2) * scalePx; };

    var lns     = data.lines    || [];
    var plgs    = data.polygons || [];
    var _th     = THEMES[activeTheme] || THEMES.stargazer;
    var lineClr = _th.lines    || 'rgba(248,247,245,0.88)';
    var fillClr = _th.captured || 'rgba(255,235,200,0.04)';

    var sa = function(i) { return starAlphas ? Math.min(1, starAlphas[i]) : alpha; };

    // polygon fills (uniform, fade-out phase only)
    if (!starAlphas && !lineAlphas) {
      plgs.forEach(function(poly) {
        if (!poly.path || poly.path.length < 3) return;
        ctx2.save(); ctx2.globalAlpha = alpha;
        ctx2.beginPath();
        poly.path.forEach(function(idx, i) {
          var pt = pts[idx];
          if (i === 0) ctx2.moveTo(mpx(pt), mpy(pt));
          else         ctx2.lineTo(mpx(pt), mpy(pt));
        });
        ctx2.closePath(); ctx2.fillStyle = fillClr; ctx2.fill();
        ctx2.restore();
      });
    }

    // ── lines ──────────────────────────────────────────────────────────────
    var lw1 = Math.max(3, pw * 0.018);
    var lw2 = Math.max(1.0, pw * 0.007);
    var lw3 = Math.max(0.4, pw * 0.0025);

    if (lineAlphas) {
      // lines phase: each line with optional progress + anchor direction
      lns.forEach(function(entry, li) {
        var key = entry[0];
        var ga = lineAlphas[li];
        if (ga < 0.005) return;
        var parts = key.split('-').map(Number);
        var a = parts[0], b = parts[1];
        if (a >= pts.length || b >= pts.length) return;
        var prog = (lineProgress && lineProgress[li] != null) ? lineProgress[li] : 1;
        if (prog < 0.005) return;
        // anchor=0: fixed at pts[a], tip moves toward pts[b]
        // anchor=1: fixed at pts[b], tip moves toward pts[a]
        var anch  = lineAnchors ? lineAnchors[li] : 0;
        var fixX  = anch === 0 ? mpx(pts[a]) : mpx(pts[b]);
        var fixY  = anch === 0 ? mpy(pts[a]) : mpy(pts[b]);
        var movX  = anch === 0 ? mpx(pts[b]) : mpx(pts[a]);
        var movY  = anch === 0 ? mpy(pts[b]) : mpy(pts[a]);
        var ex = fixX + (movX - fixX) * prog;
        var ey = fixY + (movY - fixY) * prog;
        ctx2.save();
        ctx2.globalAlpha = ga;
        ctx2.lineCap     = 'round';
        ctx2.shadowBlur  = 6 * ga;
        ctx2.shadowColor = 'rgba(248,247,245,0.8)';
        // outer glow
        ctx2.strokeStyle = 'rgba(248,247,245,0.07)'; ctx2.lineWidth = lw1;
        ctx2.beginPath(); ctx2.moveTo(fixX,fixY); ctx2.lineTo(ex,ey); ctx2.stroke();
        // mid glow
        ctx2.strokeStyle = 'rgba(248,247,245,0.18)'; ctx2.lineWidth = lw2;
        ctx2.beginPath(); ctx2.moveTo(fixX,fixY); ctx2.lineTo(ex,ey); ctx2.stroke();
        // bright core
        ctx2.strokeStyle = 'rgba(248,247,245,0.88)'; ctx2.lineWidth = lw3;
        ctx2.beginPath(); ctx2.moveTo(fixX,fixY); ctx2.lineTo(ex,ey); ctx2.stroke();
        ctx2.restore();
      });
    } else if (starAlphas) {
      // stars phase: skip lines entirely (they appear later)
    } else {
      // settled / fade-out: draw all lines at uniform alpha
      [[lw1, 0.05 * alpha], [lw2, 0.15 * alpha], [lw3, 0.75 * alpha]].forEach(function(entry) {
        var lw = entry[0], ga = entry[1];
        ctx2.beginPath();
        lns.forEach(function(entry2) {
          var key = entry2[0];
          var parts = key.split('-').map(Number);
          var a = parts[0], b = parts[1];
          if (a < pts.length && b < pts.length) {
            ctx2.moveTo(mpx(pts[a]), mpy(pts[a]));
            ctx2.lineTo(mpx(pts[b]), mpy(pts[b]));
          }
        });
        ctx2.strokeStyle = lineClr; ctx2.lineWidth = lw;
        ctx2.globalAlpha = ga; ctx2.stroke(); ctx2.globalAlpha = 1;
      });
    }

    // ── stars ──────────────────────────────────────────────────────────────
    var deg = new Array(pts.length).fill(0);
    lns.forEach(function(entry) {
      var key = entry[0];
      var parts = key.split('-').map(Number);
      var a = parts[0], b = parts[1];
      if (a < pts.length && b < pts.length) { deg[a]++; deg[b]++; }
    });
    var prevR = RADIUS;
    RADIUS = Math.max(2, Math.round(pw * 0.014));

    // idle twinkle boost (victory-screen style)
    var idleTw = _homeBgIdleTwinkle;

    pts.forEach(function(pt, i) {
      var a = sa(i);
      if (a < 0.005) return;
      var sc = starScales ? Math.max(0, starScales[i]) : 1;
      if (sc < 0.005) return;
      var tw   = twinkle[i];
      var base = tw ? 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ts * 0.001 * tw.speed + tw.phase)) : 0.4;

      // flash after star fully appeared
      var flashBoost = starFlashBoosts ? starFlashBoosts[i] : 0;

      // idle twinkle boost (one star at a time, victory screen style)
      var idleBoost = 0;
      if (idleTw && idleTw.idx === i) {
        var t   = Math.min((ts - idleTw.startMs) / idleTw.duration, 1);
        var env = t < 0.3 ? t / 0.3 : (1 - t) / 0.7;
        idleBoost = Math.sin(env * Math.PI * 0.5) * 0.9;
      }

      var sx = mpx(pt), sy = mpy(pt);
      ctx2.save();
      ctx2.globalAlpha = a;
      if (sc !== 1) {
        // scale around star centre so it grows/shrinks from its own point
        ctx2.translate(sx, sy);
        ctx2.scale(sc, sc);
        ctx2.translate(-sx, -sy);
      }
      drawStarPointTo(ctx2, sx, sy, Math.max(deg[i], 2), false, false, false,
                      (base + flashBoost + idleBoost) * 0.65);
      ctx2.restore();
    });
    RADIUS = prevR;

    // ── name label — appears after all stars settled ───────────────────────
    if (name) {
      var nameAlpha = starAlphas ? Math.min.apply(Math, Array.from({length: pts.length}, function(_, i) { return sa(i); }))
                                 : alpha;
      if (nameAlpha > 0.01) {
        var fs = Math.max(12, Math.round(pw * 0.038));
        ctx2.save();
        ctx2.globalAlpha   = 0.42 * nameAlpha;
        ctx2.textAlign     = 'center';
        ctx2.textBaseline  = 'top';
        ctx2.font          = '300 ' + fs + 'px -apple-system, "SF Pro Text", sans-serif';
        ctx2.fillStyle     = 'rgba(248,247,245,1)';
        ctx2.letterSpacing = '0.12em';
        ctx2.fillText(_constName(name).toUpperCase(), pw * 0.5, ph * 0.74);
        ctx2.restore();
      }
    }
  }

  /**
   * Switch to next (+1) or previous (-1) constellation.
   *
   * OUT: stars shrink & fade in groups of 1–2; their lines retract INTO them simultaneously.
   * GAP: 500 ms darkness.
   * IN:  stars grow from a point in groups of 1–2; their lines extend FROM them.
   */
  function _homeBgSwipeTo(dir) {
    if (_homeBgFade) return;
    _homeBgConstIdx = ((_homeBgConstIdx + dir + REAL_CONSTELLATIONS.length) % REAL_CONSTELLATIONS.length);
    var rc  = REAL_CONSTELLATIONS[_homeBgConstIdx];
    var n   = rc.pts.length;
    var nl  = rc.lns.length;
    var prevLnCount = _homeBgData?.lines?.length  || 0;
    var prevStCount = _homeBgData?.points?.length || 0;

    // ── Helper: Fisher-Yates shuffle ──────────────────────────────────────
    function _shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
      return arr;
    }

    // ── OUT: group prev-stars into 1–2 per group, stagger group starts ────
    var outStarData = new Array(prevStCount);
    if (prevStCount > 0) {
      var oShuf = _shuffle(Array.from({length: prevStCount}, function(_, i) { return i; }));
      var gStart = 0, idx = 0;
      while (idx < oShuf.length) {
        var sz = (idx + 1 < oShuf.length && Math.random() < 0.5) ? 2 : 1;
        for (var g = 0; g < sz; g++) {
          var si  = oShuf[idx + g];
          var jit = (Math.random() - 0.5) * 60;   // ±30 ms within-group jitter
          var dur = 2000 + Math.random() * 1000;   // 2000–3000 ms per star
          outStarData[si] = { delay: Math.max(0, gStart + jit), dur: dur };
        }
        gStart += 400 + Math.random() * 350;         // 400–750 ms between groups
        idx += sz;
      }
    }

    // ── OUT: per-line data — each line retracts INTO the star that fades first
    var outLineData = new Array(prevLnCount);
    var prevLines   = _homeBgData?.lines || [];
    for (var li = 0; li < prevLnCount; li++) {
      var parts = prevLines[li][0].split('-').map(Number);
      var a = parts[0], b = parts[1];
      var sdA     = outStarData[a] || { delay: 0, dur: 2500 };
      var sdB     = outStarData[b] || { delay: 0, dur: 2500 };
      var anchor  = sdA.delay <= sdB.delay ? 0 : 1; // 0 = fixed at a, 1 = fixed at b
      var sd      = anchor === 0 ? sdA : sdB;
      // line retracts in full sync with its absorbing star
      outLineData[li] = { anchor: anchor, lineDelay: sd.delay, lineDur: sd.dur };
    }

    // ── IN: group new-stars into 1–2 per group, stagger group starts ──────
    var inStarData = new Array(n);
    {
      var iShuf = _shuffle(Array.from({length: n}, function(_, i) { return i; }));
      var gStart2 = 0, idx2 = 0;
      while (idx2 < iShuf.length) {
        var sz2 = (idx2 + 1 < iShuf.length && Math.random() < 0.5) ? 2 : 1;
        for (var g2 = 0; g2 < sz2; g2++) {
          var si2      = iShuf[idx2 + g2];
          var jit2     = (Math.random() - 0.5) * 60;
          var dur2     = 2000 + Math.random() * 1000;
          var flashDur= 400  + Math.random() * 300;  // flash after fully visible
          inStarData[si2] = { delay: Math.max(0, gStart2 + jit2), dur: dur2, flashDur: flashDur };
        }
        gStart2 += 400 + Math.random() * 350;
        idx2 += sz2;
      }
    }

    // ── IN: per-line data — each line extends FROM the star that appears first
    var inLineData = new Array(nl);
    for (var li2 = 0; li2 < nl; li2++) {
      var entry = rc.lns[li2];
      var aIn = entry[0], bIn = entry[1];
      var sdAIn    = inStarData[aIn] || { delay: 0, dur: 2500 };
      var sdBIn    = inStarData[bIn] || { delay: 0, dur: 2500 };
      var anchorIn = sdAIn.delay <= sdBIn.delay ? 0 : 1;
      var sdIn     = anchorIn === 0 ? sdAIn : sdBIn;
      // line starts extending once the source star is ~35% visible
      var lineDelay = sdIn.delay + sdIn.dur * 0.35;
      var lineDur   = sdIn.dur   * 0.65;
      inLineData[li2]  = { anchor: anchorIn, lineDelay: lineDelay, lineDur: lineDur };
    }

    _homeBgFade = {
      phase:       'out',
      startTs:     performance.now(),
      // out (prev constellation stars + lines together)
      prevData:    _homeBgData,
      prevTwinkle: _homeBgTwinkle,
      prevName:    _homeBgConstName,
      outStarData: outStarData,
      outLineData: outLineData,
      // gap
      gapDur:      500,
      gapStart:    null,
      // in (new constellation stars + lines together)
      inStart:     null,
      inStarData:  inStarData,
      inLineData:  inLineData
    };

    // Load incoming constellation
    _homeBgConstName   = rc.n;
    _homeBgData        = { points: rc.pts, lines: rc.lns.map(function(entry) { var a = entry[0], b = entry[1]; return [a + '-' + b, 1]; }), polygons: [] };
    _homeBgTwinkle     = rc.pts.map(function() { return { phase: Math.random()*Math.PI*2, speed: 0.5+Math.random()*0.9 }; });
    _homeBgIdleTwinkle = null;
  }

  /** Attach swipe-left / swipe-right listeners on the home screen (once). */
  function _homeInitSwipe() {
    var scr = document.getElementById('home-screen');
    if (!scr || scr._swipeInit) return;
    scr._swipeInit = true;
    var tx0 = 0, ty0 = 0;
    scr.addEventListener('touchstart', function(e) {
      // ignore touches that start on interactive children
      if (e.target.closest('button,a,input,select,[role="button"]')) return;
      var t = e.touches[0]; tx0 = t.clientX; ty0 = t.clientY;
    }, { passive: true });
    scr.addEventListener('touchend', function(e) {
      if (e.target.closest('button,a,input,select,[role="button"]')) return;
      var t  = e.changedTouches[0];
      var dx = t.clientX - tx0;
      var dy = t.clientY - ty0;
      // horizontal swipe: dx > 45px and more horizontal than vertical
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        _homeBgSwipeTo(dx > 0 ? -1 : 1);
      }
    }, { passive: true });
  }

  function _startHomeBgAnim() {
    _stopHomeBgAnim();
    // Pick a random real constellation from the 88 IAU constellations
    _homeBgConstIdx = Math.floor(Math.random() * REAL_CONSTELLATIONS.length);
    var rc = REAL_CONSTELLATIONS[_homeBgConstIdx];
    _homeBgConstName = rc.n;
    _homeBgData = {
      points:   rc.pts,
      lines:    rc.lns.map(function(entry) { var a = entry[0], b = entry[1]; return [a + '-' + b, 1]; }),
      polygons: []
    };
    _homeBgTwinkle = rc.pts.map(function() {
      return {
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.9
      };
    });
    _homeBgFade = null;
    _homeInitSwipe();

    var cv = document.getElementById('home-bg-canvas');
    if (!cv) return;

    function loop(ts) {
      var scr = document.getElementById('home-screen');
      if (!scr || scr.style.display === 'none') { _homeBgRaf = null; return; }
      var pw = scr.offsetWidth || window.innerWidth;
      var ph = scr.offsetHeight || window.innerHeight;
      if (cv.width !== Math.round(pw * LC.dpr())) {
        LC.sizeCanvas(cv, pw, ph);
      }
      var ctx2 = cv.getContext('2d');
      var dpr  = LC.dpr();
      ctx2.clearRect(0, 0, cv.width, cv.height);
      ctx2.save();
      ctx2.scale(dpr, dpr);

      if (_homeBgFade) {
        var f = _homeBgFade;

        if (f.phase === 'out') {
          // ── OUT: stars shrink+fade AND lines retract into them, simultaneously
          var elapsed = ts - f.startTs;
          var nPrev   = f.prevData?.points?.length || 0;
          var nlPrev  = f.prevData?.lines?.length  || 0;
          var starAlphas  = new Array(nPrev);
          var starScales  = new Array(nPrev);
          var lineAlphas  = new Array(nlPrev);
          var lineProgs   = new Array(nlPrev);
          var lineAnchors = new Array(nlPrev);
          var allDone = true;
          for (var i = 0; i < nPrev; i++) {
            var sd = f.outStarData[i];
            var t      = Math.min(1, Math.max(0, (elapsed - sd.delay) / sd.dur));
            var smooth = t * t * (3 - 2 * t);
            starAlphas[i] = 1 - smooth;
            starScales[i] = 1 - smooth;
            if (t < 1) allDone = false;
          }
          for (var li = 0; li < nlPrev; li++) {
            var ld = f.outLineData[li];
            var t2      = Math.min(1, Math.max(0, (elapsed - ld.lineDelay) / ld.lineDur));
            var smooth2 = t2 * t2 * (3 - 2 * t2);
            lineAlphas[li]  = 1 - smooth2;
            lineProgs[li]   = 1 - smooth2; // shrinks toward anchor star
            lineAnchors[li] = ld.anchor;
            if (t2 < 1) allDone = false;
          }
          _homeDrawConstScene(ctx2, f.prevData, f.prevTwinkle,
                              f.prevName, 1, pw, ph, ts,
                              starAlphas, null, lineAlphas, lineProgs, starScales, lineAnchors);
          if (allDone) { f.phase = 'gap'; f.gapStart = ts; }

        } else if (f.phase === 'gap') {
          // ── GAP: darkness ──────────────────────────────────────────────────
          if (ts - f.gapStart >= f.gapDur) { f.phase = 'in'; f.inStart = ts; }

        } else if (f.phase === 'in') {
          // ── IN: stars grow from a point AND lines extend from them
          var elapsed2 = ts - f.inStart;
          var n       = _homeBgData.points.length;
          var nl      = _homeBgData.lines.length;
          var starAlphas2      = new Array(n);
          var starFlashBoosts = new Array(n);
          var starScales2      = new Array(n);
          var lineAlphas2      = new Array(nl);
          var lineProgs2       = new Array(nl);
          var lineAnchors2     = new Array(nl);
          var allDone2 = true;
          for (var i2 = 0; i2 < n; i2++) {
            var isd = f.inStarData[i2];
            var raw    = Math.min(1, Math.max(0, (elapsed2 - isd.delay) / isd.dur));
            var smooth3 = raw * raw * (3 - 2 * raw);
            starAlphas2[i2] = smooth3;
            starScales2[i2] = smooth3;
            var fp = Math.max(0, Math.min(1, (elapsed2 - (isd.delay + isd.dur)) / isd.flashDur));
            if (fp > 0) starScales2[i2] = 1; // fully grown once flash starts
            starFlashBoosts[i2] = Math.sin(fp * Math.PI) * 1.0;
            if (raw < 1 || fp < 1) allDone2 = false;
          }
          for (var li2 = 0; li2 < nl; li2++) {
            var ild = f.inLineData[li2];
            var t3      = Math.min(1, Math.max(0, (elapsed2 - ild.lineDelay) / ild.lineDur));
            var smooth4 = t3 * t3 * (3 - 2 * t3);
            lineAlphas2[li2]  = smooth4;
            lineProgs2[li2]   = smooth4; // extends from anchor star outward
            lineAnchors2[li2] = ild.anchor;
            if (t3 < 1) allDone2 = false;
          }
          _homeDrawConstScene(ctx2, _homeBgData, _homeBgTwinkle,
                              _homeBgConstName, 1, pw, ph, ts,
                              starAlphas2, starFlashBoosts, lineAlphas2, lineProgs2, starScales2, lineAnchors2);
          if (allDone2) { _homeBgFade = null; _homeBgIdleTwinkle = null; }
        }

      } else {
        // ── Idle: victory-style star twinkle ─────────────────────────────
        if (!_homeBgIdleTwinkle || ts >= _homeBgIdleTwinkle.waitUntil) {
          _homePickTwinkle(ts);
        }
        _homeDrawConstScene(ctx2, _homeBgData, _homeBgTwinkle,
                            _homeBgConstName, 1, pw, ph, ts, null, null, null, null);
      }

      ctx2.restore();
      _homeBgRaf = requestAnimationFrame(loop);
    }
    _homeBgRaf = requestAnimationFrame(loop);
  }

  /** Show the home screen, populate with current player data, hide #start. */
  function showHomeScreen() {
    var p    = loadProgress();
    var name = localStorage.getItem('playerName') || '—';
    document.getElementById('home-player-name').textContent = name;
    document.getElementById('home-rating-pts').textContent  = 'score: ' + p.rating + ' ✦';
    _startHomeBgAnim();
    document.getElementById('home-screen').style.display = 'flex';
    document.getElementById('start').style.display = 'none';
    if (typeof _resetZoom === 'function') _resetZoom();
  }

  // ── Home screen: length picker ────────────────────────────────────────────
  var _HOME_LENGTHS = [
    { count: 7,  label: 'короткая',
      pts: [[0.25,0.20],[0.72,0.15],[0.85,0.55],[0.62,0.82],[0.18,0.78],[0.10,0.42],[0.50,0.48]] },
    { count: 13, label: 'обычная',
      pts: [[0.22,0.18],[0.55,0.12],[0.80,0.20],[0.88,0.50],[0.72,0.78],[0.45,0.85],[0.18,0.72],
            [0.08,0.45],[0.30,0.32],[0.62,0.42],[0.42,0.55],[0.75,0.58],[0.15,0.20]] },
    { count: 21, label: 'длинная',
      pts: [[0.12,0.15],[0.35,0.10],[0.62,0.08],[0.82,0.18],[0.92,0.42],[0.88,0.65],[0.72,0.82],
            [0.50,0.90],[0.28,0.85],[0.10,0.70],[0.05,0.48],[0.08,0.28],[0.25,0.22],[0.48,0.18],
            [0.70,0.28],[0.85,0.50],[0.75,0.70],[0.55,0.80],[0.35,0.72],[0.20,0.55],[0.40,0.45]] }
  ];
  var _homeSelectedLength = parseInt(localStorage.getItem('homeLength') || '7');
  var _homeLengthOpen = false;

  function _drawLengthPreview(cv, pts) {
    var S = 76;
    var ctx = LC.setupCanvas(cv, S, S);
    ctx.clearRect(0, 0, S, S);
    var pad = 9;
    pts.forEach(function(entry) {
      var nx = entry[0], ny = entry[1];
      var x = pad + nx * (S - 2*pad);
      var y = pad + ny * (S - 2*pad);
      var r = 1.7;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r * 5.5);
      g.addColorStop(0,    'rgba(255,235,190,0.40)');
      g.addColorStop(0.35, 'rgba(255,235,190,0.10)');
      g.addColorStop(1,    'rgba(255,235,190,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 5.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,245,220,0.88)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    });
  }

  function _buildLengthCards() {
    var container = document.getElementById('home-length-options');
    if (container.dataset.built) return;
    container.dataset.built = '1';
    _HOME_LENGTHS.forEach(function(opt) {
      var card = document.createElement('div');
      card.className = 'home-length-card' + (opt.count === _homeSelectedLength ? ' active' : '');
      card.dataset.count = opt.count;
      var cv = document.createElement('canvas');
      _drawLengthPreview(cv, opt.pts);
      var lbl = document.createElement('div');
      lbl.className = 'home-lc-label';
      lbl.textContent = opt.label;
      card.appendChild(cv);
      card.appendChild(lbl);
      card.addEventListener('click', function() {
        _homeSelectedLength = opt.count;
        document.getElementById('home-length-label').textContent = opt.label;
        document.querySelectorAll('.home-length-card').forEach(function(c) {
          c.classList.toggle('active', parseInt(c.dataset.count) === _homeSelectedLength);
        });
        _toggleLengthPicker(false);
      });
      container.appendChild(card);
    });
  }

  function _toggleLengthPicker(force) {
    _homeLengthOpen = force !== undefined ? force : !_homeLengthOpen;
    var opts = document.getElementById('home-length-options');
    if (_homeLengthOpen) {
      _buildLengthCards();
      opts.style.display = 'flex';
    } else {
      opts.style.display = 'none';
    }
  }

  // ── Home screen buttons ───────────────────────────────────────────────────

  document.getElementById('home-settings-icon').addEventListener('click', openSettingsScreen);
  // Init active class from saved/default length
  document.querySelectorAll('.home-len-btn').forEach(function(b) {
    b.classList.toggle('active', parseInt(b.dataset.count) === _homeSelectedLength);
  });
  document.querySelectorAll('.home-len-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _homeSelectedLength = parseInt(btn.dataset.count);
      localStorage.setItem('homeLength', _homeSelectedLength);
      document.querySelectorAll('.home-len-btn').forEach(function(b) {
        b.classList.toggle('active', b === btn);
      });
    });
  });

  document.getElementById('home-play-btn').addEventListener('click', function() {
    COUNT = _homeSelectedLength;
    isAI = true;
    playerNames[0] = localStorage.getItem('playerName') || t('player_1');
    playerNames[1] = t('ai_name');
    stargazerLevel = rankToAiLevel();
    _stopHomeBgAnim();
    document.getElementById('home-screen').style.display = 'none';
    startGame();
  });

  // ── Home nav canvas icons ─────────────────────────────────────────────────
  (function _drawHomeIcons() {
    var S = 40;

    function _setupCanvas(id) {
      var cv = document.getElementById(id);
      if (!cv) return null;
      return LC.setupCanvas(cv, S, S);
    }

    // ── 1. Single game-style star (Мои созвездия) ──
    (function() {
      var c = _setupCanvas('home-icon-constellations');
      if (!c) return;
      var cx = S/2, cy = S/2;
      // Halo
      var hg = c.createRadialGradient(cx, cy, 0, cx, cy, 17);
      hg.addColorStop(0,    'rgba(255,200,120,0.38)');
      hg.addColorStop(0.28, 'rgba(255,200,120,0.10)');
      hg.addColorStop(1,    'rgba(255,200,120,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(cx, cy, 17, 0, Math.PI*2); c.fill();
      // 4 spike rays (✦ shape)
      c.save();
      [[0],[Math.PI/2],[Math.PI],[Math.PI*1.5]].forEach(function(entry) {
        var a = entry[0];
        var grad = c.createLinearGradient(cx, cy,
          cx + Math.cos(a)*14, cy + Math.sin(a)*14);
        grad.addColorStop(0, 'rgba(255,245,210,0.55)');
        grad.addColorStop(1, 'rgba(255,245,210,0)');
        c.strokeStyle = grad; c.lineWidth = 0.9;
        c.beginPath(); c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(a)*14, cy + Math.sin(a)*14); c.stroke();
      });
      c.restore();
      // Bright core
      var cg = c.createRadialGradient(cx, cy, 0, cx, cy, 4);
      cg.addColorStop(0,    'rgba(255,245,210,0.95)');
      cg.addColorStop(0.4,  'rgba(255,245,210,0.50)');
      cg.addColorStop(1,    'rgba(255,245,210,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(cx, cy, 4, 0, Math.PI*2); c.fill();
    })();

    // ── 2. Glowing 4-pointed star (Небо) ──
    (function() {
      var c = _setupCanvas('home-icon-sky');
      if (!c) return;
      var cx = S / 2, cy = S / 2;
      var spikeLen = 14, spikeW = 2.8, coreR = 3.5;

      // Layer 1: soft circular halo (shadowBlur)
      c.save();
      c.shadowBlur = 7; c.shadowColor = 'rgba(255,200,120,0.35)';
      var hg2 = c.createRadialGradient(cx, cy, 0, cx, cy, 16);
      hg2.addColorStop(0, 'rgba(255,200,120,0.38)');
      hg2.addColorStop(0.5, 'rgba(255,200,120,0.10)');
      hg2.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = hg2;
      c.beginPath(); c.arc(cx, cy, 16, 0, Math.PI * 2); c.fill();
      c.restore();

      // Layer 2: 4 spike rays (shadowBlur)
      c.save();
      c.shadowBlur = 4; c.shadowColor = 'rgba(255,200,120,0.55)';
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(function(angle) {
        var ex = Math.cos(angle), ey = Math.sin(angle);
        var nx = -ey, ny = ex;
        c.beginPath();
        c.moveTo(cx + nx * spikeW, cy + ny * spikeW);
        c.lineTo(cx + ex * spikeLen, cy + ey * spikeLen);
        c.lineTo(cx - nx * spikeW, cy - ny * spikeW);
        c.closePath();
        var sg = c.createLinearGradient(cx, cy, cx + ex * spikeLen, cy + ey * spikeLen);
        sg.addColorStop(0, 'rgba(255,220,150,0.50)');
        sg.addColorStop(0.3, 'rgba(255,200,120,0.25)');
        sg.addColorStop(0.7, 'rgba(255,200,120,0.06)');
        sg.addColorStop(1, 'rgba(255,200,120,0)');
        c.fillStyle = sg;
        c.fill();
      });
      c.restore();

      // Layer 3: bright core (shadowBlur)
      c.save();
      c.shadowBlur = 5; c.shadowColor = 'rgba(255,245,210,0.80)';
      var cg2 = c.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg2.addColorStop(0, 'rgba(255,245,210,0.95)');
      cg2.addColorStop(0.4, 'rgba(255,245,210,0.60)');
      cg2.addColorStop(1, 'rgba(255,245,210,0)');
      c.fillStyle = cg2;
      c.beginPath(); c.arc(cx, cy, coreR, 0, Math.PI * 2); c.fill();
      c.restore();
    })();

    // ── 3. 8-pointed star-gear (Настройки) — skipped if canvas removed ──
    (function() {
      var c = _setupCanvas('home-icon-settings');
      if (!c) return;
      var cx = S/2, cy = S/2;
      var outerR = 15, innerR = 9, holeR = 5.5;
      var pts8 = 8;
      // Draw 8-pointed star
      c.beginPath();
      for (var i = 0; i < pts8 * 2; i++) {
        var ang = (i * Math.PI / pts8) - Math.PI / 2;
        var r   = i % 2 === 0 ? outerR : innerR;
        var x   = cx + r * Math.cos(ang);
        var y   = cy + r * Math.sin(ang);
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.closePath();
      c.fillStyle = 'rgba(255,245,210,0.75)';
      c.fill();
      // Punch center hole with destination-out
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(cx, cy, holeR, 0, Math.PI*2); c.fill();
      c.globalCompositeOperation = 'source-over';
      // Subtle outer glow
      var hg3 = c.createRadialGradient(cx, cy, outerR - 2, cx, cy, outerR + 6);
      hg3.addColorStop(0, 'rgba(255,200,120,0.12)');
      hg3.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = hg3; c.beginPath(); c.arc(cx, cy, outerR + 6, 0, Math.PI*2); c.fill();
    })();
  })();

  // ── Profile row click handler ──────────────────────────────────────────────
  document.getElementById('home-player-name-row').addEventListener('click', function() {
    openProfileScreen();
  });

  // ── Export public functions to window ──────────────────────────────────────
  window.showHomeScreen     = showHomeScreen;
  window._startHomeBgAnim   = _startHomeBgAnim;
  window._stopHomeBgAnim    = _stopHomeBgAnim;
  window._constName         = _constName;
  window.REAL_CONSTELLATIONS = REAL_CONSTELLATIONS;
  window.CONSTELLATION_RU   = CONSTELLATION_RU;

})();
