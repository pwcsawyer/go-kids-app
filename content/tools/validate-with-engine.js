// 用 app 规则引擎复核关卡答案。先编译：cd app && npx tsc src/engine/index.ts --ignoreConfig --outDir /tmp/eng --module commonjs --target es2020 --skipLibCheck
// 再运行：node content/tools/validate-with-engine.js /tmp/eng/index.js
const {Game,Board,scoreChinese}=require(process.argv[2]||'/tmp/eng/index.js');const fs=require('fs');
const dir=require('path').join(__dirname,'..')+'/';let n=0,bad=0;
for(const f of fs.readdirSync(dir).filter(f=>/^day\d+\.json$/.test(f))){
 const L=JSON.parse(fs.readFileSync(dir+f));
 for(const s of L.segments) if(s.type==='practice') for(const l of s.levels){n++;
  const board=Board.fromStrings(l.board);
  try{
  if(l.kind==='count_liberties'){const g=new Game(l.boardSize,{board});if(g.getLiberties(l.target).length!==l.answer.count){bad++;console.log('libs',l.id)}}
  if(l.kind==='judge'&&['suicide','normal','capture'].includes(l.answer.reason)){const g=new Game(l.boardSize,{board,toPlay:'black'});if(g.isLegalMove(l.target).legal!==l.answer.value){bad++;console.log('legal',l.id)}}
  if(l.kind==='play_to_goal'&&l.answer.goal==='capture'){for(const p of l.answer.points){const g=new Game(l.boardSize,{board,toPlay:'black'});const r=g.play(p);if(!r.legal||!(r.captured&&r.captured.length)){bad++;console.log('cap',l.id)}}}
  if(l.kind==='score_compare'){const sc=scoreChinese(board,{komi:0});if(sc.black!==l.answer.score.black||sc.white!==l.answer.score.white){bad++;console.log('score',l.id,sc)}}
  if(l.kind==='judge'&&l.answer.reason==='ko'){const b0=Board.fromStrings(l.board);}
  }catch(e){bad++;console.log('err',l.id,e.message)}
 }}
console.log('checked',n,'bad',bad)
