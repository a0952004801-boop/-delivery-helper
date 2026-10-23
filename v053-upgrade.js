/* 外送助手 V0.5.3 升級檔 */
(function(){
'use strict';
const NEW_AREAS=['關廟區','麻豆區','七股區','佳里區','湖內區','路竹區','岡山區'];
NEW_AREAS.forEach(a=>{if(!AREAS.includes(a))AREAS.splice(AREAS.length-1,0,a);});
const oldRenderNumbers=renderNumbers;
function serviceDay(ms=Date.now()){
 const d=new Date(ms);d.setHours(d.getHours()-4);return localDate(d.getTime());
}
function dayWindow(date){
 const [y,m,d]=date.split('-').map(Number);
 return [new Date(y,m-1,d,4).getTime(),new Date(y,m-1,d+1,4).getTime()];
}
function allOrders(){
 return data.trips.flatMap(t=>t.orders||[]).filter(o=>Number.isFinite(+o.startedAt)&&Number.isFinite(+o.endedAt)&&+o.endedAt>+o.startedAt);
}
function durationStats(start,end){
 const intervals=allOrders().map(o=>[Math.max(start,+o.startedAt),Math.min(end,+o.endedAt)]).filter(([a,b])=>b>a).sort((x,y)=>x[0]-y[0]);
 let sum=0,unique=0,begin=null,finish=null;
 for(const [a,b] of intervals){
  sum+=b-a;
  if(begin===null){begin=a;finish=b;}
  else if(a<=finish){finish=Math.max(finish,b);}
  else{unique+=finish-begin;begin=a;finish=b;}
 }
 if(begin!==null)unique+=finish-begin;
 return {sum,unique};
}
function fmt(ms){
 const n=Math.round(ms/1000),h=Math.floor(n/3600),m=Math.floor((n%3600)/60),s=n%60;
 return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':');
}
function stat(label,id){
 const e=document.createElement('div');e.className='stat';
 const small=document.createElement('small');small.textContent=label;
 const b=document.createElement('b');b.id=id;b.textContent='00:00:00';
 e.append(small,b);return e;
}
function addStats(){
 const grid=document.getElementById('sTrips')?.closest('.grid');
 if(grid)grid.append(
  stat('今日逐單累計時數','v53TodaySum'),
  stat('今日實際配送總時數','v53TodayUnique'),
  stat('本期逐單累計時數','v53PeriodSum'),
  stat('本期實際配送總時數','v53PeriodUnique')
 );
 const period=document.getElementById('periodText')?.closest('.card');
 if(period){
  const c=document.createElement('div');c.className='card';
  c.innerHTML='<b>自訂日期工時統計（每日04:00切換）</b><div class="grid"><div><label>開始日期</label><input id="v53From" type="date"></div><div><label>結束日期（含當日）</label><input id="v53To" type="date"></div></div><button class="secondary" id="v53Calc">計算區間總時數</button><div id="v53Result" class="smallline">請選擇日期</div><button class="secondary" id="v53CSV">匯出每日／期別工時 CSV</button>';
  period.after(c);
  document.getElementById('v53Calc').onclick=()=>{
   const a=document.getElementById('v53From').value,b=document.getElementById('v53To').value;
   if(!a||!b||a>b){document.getElementById('v53Result').textContent='請輸入有效日期';return;}
   const z=durationStats(dayWindow(a)[0],dayWindow(b)[1]);
   document.getElementById('v53Result').textContent='逐單累計 '+fmt(z.sum)+' ｜ 實際配送 '+fmt(z.unique)+' ｜ 重疊 '+fmt(z.sum-z.unique);
  };
  document.getElementById('v53CSV').onclick=exportHoursCSV;
 }
}
function exportHoursCSV(){
 const rows=[['類型','統計日期或期別','逐單累計時數','實際配送去重時數']];
 const days=new Set(),periods=new Map();
 for(const o of allOrders()){
  let t=dayWindow(serviceDay(o.startedAt))[0];
  while(t<o.endedAt){
   days.add(serviceDay(t));
   const d=new Date(t);d.setDate(d.getDate()+1);t=d.getTime();
  }
  for(let p=periodFor(o.startedAt);p.start<o.endedAt;p=periodFor(p.end)){
   periods.set(p.key,p);
  }
 }
 for(const d of [...days].sort()){
  const [a,b]=dayWindow(d),z=durationStats(a,b);
  rows.push(['每日',d,fmt(z.sum),fmt(z.unique)]);
 }
 for(const p of [...periods.values()].sort((a,b)=>a.start-b.start)){
  const z=durationStats(p.start,p.end);
  rows.push(['期別',periodName(p),fmt(z.sum),fmt(z.unique)]);
 }
 const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;
 a.download='外送助手_v053_工時_'+serviceDay()+'.csv';
 a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
todayTrips=function(){
 return data.trips.filter(t=>serviceDay(t.startedAt)===serviceDay());
};
renderNumbers=function(){
 oldRenderNumbers();
 const [a,b]=dayWindow(serviceDay()),p=currentPeriod();
 const d=durationStats(a,b),q=durationStats(p.start,p.end);
 for(const [id,v] of [
  ['v53TodaySum',d.sum],['v53TodayUnique',d.unique],
  ['v53PeriodSum',q.sum],['v53PeriodUnique',q.unique]
 ]){
  const e=document.getElementById(id);if(e)e.textContent=fmt(v);
 }
};
addStats();
initAreaButtons();
renderAll();
})();
