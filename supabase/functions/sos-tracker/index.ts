const TRACKER_JS = `(function(){
'use strict';
if(window.__sos)return;
if(navigator.webdriver||/bot|crawl|spider|headless/i.test(navigator.userAgent))return;
var C={u:'%%COLLECTOR_URL%%',k:'%%KEY%%'};
var S={id:null,t:0},pv=null,cwv={},sd=0,et=0,es=null,q=[];
function gid(){return'xxxxxxxx'.replace(/x/g,function(){return(Math.random()*16|0).toString(16)})+Date.now().toString(36)}
function gs(k){try{return sessionStorage.getItem(k)}catch(e){return null}}
function ss(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
function sid(){
  var s=gs('_sos_s'),t=gs('_sos_t'),now=Date.now();
  if(s&&t&&now-parseInt(t)<18e5){ss('_sos_t',''+now);return s}
  var id=gid();ss('_sos_s',id);ss('_sos_t',''+now);return id
}
function utm(){
  var p=new URLSearchParams(location.search);
  var r={};['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(function(k){
    var v=p.get(k);if(v)r[k]=v
  });return r
}
function cids(){
  var p=new URLSearchParams(location.search);
  var r={};['gclid','fbclid','msclkid','li_fat_id'].forEach(function(k){
    var v=p.get(k);if(v){r[k]=v;ss('_sos_'+k,v)}
  });
  ['gclid','fbclid','msclkid','li_fat_id'].forEach(function(k){
    if(!r[k]){var v=gs('_sos_'+k);if(v)r[k]=v}
  });
  return r
}
function ref(){
  var r=document.referrer;
  if(!r||r.indexOf(location.hostname)!==-1)return{src:'direct',med:'none'};
  try{
    var h=new URL(r).hostname.toLowerCase();
    if(/google/.test(h))return{src:'google',med:'organic'};
    if(/bing/.test(h))return{src:'bing',med:'organic'};
    if(/duckduckgo/.test(h))return{src:'duckduckgo',med:'organic'};
    if(/chatgpt|openai/.test(h))return{src:'chatgpt',med:'ai'};
    if(/claude|anthropic/.test(h))return{src:'claude',med:'ai'};
    if(/perplexity/.test(h))return{src:'perplexity',med:'ai'};
    if(/facebook|fb\\.com/.test(h))return{src:'facebook',med:'social'};
    if(/twitter|t\\.co|x\\.com/.test(h))return{src:'twitter',med:'social'};
    if(/linkedin/.test(h))return{src:'linkedin',med:'social'};
    if(/instagram/.test(h))return{src:'instagram',med:'social'};
    if(/youtube/.test(h))return{src:'youtube',med:'social'};
    if(/tiktok/.test(h))return{src:'tiktok',med:'social'};
    if(/pinterest/.test(h))return{src:'pinterest',med:'social'};
    return{src:h.replace('www.',''),med:'referral'}
  }catch(e){return{src:'direct',med:'none'}}
}
function cwvO(){
  try{
    if(!window.PerformanceObserver)return;
    new PerformanceObserver(function(l){
      var e=l.getEntries();if(e.length)cwv.lcp=Math.round(e[e.length-1].startTime)
    }).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(function(l){
      var v=0;l.getEntries().forEach(function(e){v+=e.value});cwv.cls=Math.round(v*1000)/1000
    }).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(function(l){
      var e=l.getEntries();e.forEach(function(i){
        if(!cwv.inp||i.duration>cwv.inp)cwv.inp=Math.round(i.duration)
      })
    }).observe({type:'event',buffered:true,durationThreshold:16});
    var nav=performance.getEntriesByType('navigation')[0];
    if(nav){cwv.fcp=Math.round(nav.responseStart);cwv.ttfb=Math.round(nav.responseStart-nav.requestStart)}
    new PerformanceObserver(function(l){
      var e=l.getEntries();if(e.length)cwv.fcp=Math.round(e[0].startTime)
    }).observe({type:'paint',buffered:true});
  }catch(e){}
}
function onScroll(){
  var p=Math.round((window.scrollY+window.innerHeight)/Math.max(document.body.scrollHeight,1)*100);
  if(p>sd)sd=Math.min(p,100)
}
function flush(){
  if(!pv)return;
  var payload={k:C.k,v:[pv]};
  if(Object.keys(cwv).length)payload.v.push(Object.assign({t:'cwv'},cwv));
  if(sd>0||et>0)payload.v.push({t:'eng',scroll:sd,time:et});
  var data=JSON.stringify(payload);
  if(navigator.sendBeacon){navigator.sendBeacon(C.u,data)}
  else{try{fetch(C.u,{method:'POST',body:data,keepalive:true,credentials:'omit'})}catch(e){}}
  pv=null;cwv={};sd=0;et=0
}
function sendLead(src,extra){
  var ld={k:C.k,v:[Object.assign({t:'lead',src:src,ts:Date.now(),sid:S.id,url:location.href},cids(),extra||{})]};
  if(navigator.sendBeacon){navigator.sendBeacon(C.u,JSON.stringify(ld))}
  else{try{fetch(C.u,{method:'POST',body:JSON.stringify(ld),keepalive:true,credentials:'omit'})}catch(e){}}
}
S.id=sid();
var r=ref(),u=utm(),c=cids();
pv=Object.assign({t:'pv',ts:Date.now(),sid:S.id,url:location.href,path:location.pathname,
  title:document.title,ref:document.referrer,src:r.src,med:r.med,
  entry:!gs('_sos_seen'),ua:navigator.userAgent.substring(0,150)},u,c);
ss('_sos_seen','1');
cwvO();
window.addEventListener('scroll',onScroll,{passive:true});
es=Date.now();
document.addEventListener('visibilitychange',function(){
  if(document.hidden){if(es){et+=Math.round((Date.now()-es)/1000);es=null}flush()}
  else{es=Date.now()}
});
window.addEventListener('pagehide',flush);
document.addEventListener('click',function(e){
  var a=e.target;while(a&&a.tagName!=='A')a=a.parentElement;
  if(!a)return;
  var h=a.getAttribute('href')||'';
  if(h.indexOf('tel:')===0){
    sendLead('phone',{ph:h.replace('tel:','').replace(/[^0-9+]/g,'')})
  }
},true);
if(typeof dmAPI!=='undefined'&&dmAPI.runOnReady){
  try{dmAPI.runOnReady('sos-tracker',function(){
    dmAPI.subscribeEvent(dmAPI.EVENTS.FORM_SUBMISSION,function(){sendLead('form',{fm:'duda'})})
  })}catch(e){}
}
try{
  var fs=document.querySelectorAll('.dmformSuccess');
  if(fs.length){
    var mo=new MutationObserver(function(muts){
      muts.forEach(function(m){
        if(m.type==='attributes'&&m.target.offsetParent!==null){sendLead('form',{fm:'duda-widget'})}
      })
    });
    fs.forEach(function(el){mo.observe(el,{attributes:true,attributeFilter:['style','class']})})
  }
}catch(e){}
document.addEventListener('submit',function(e){
  if(e.target&&e.target.tagName==='FORM'){sendLead('form',{fm:'native'})}
},true);
window.__sos=true
})();`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=3600',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('k');

  if (!key) {
    return new Response('// missing workspace key', {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
    });
  }

  const collectorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analytics-collector`;
  const js = TRACKER_JS
    .replace('%%COLLECTOR_URL%%', collectorUrl)
    .replace('%%KEY%%', key);

  return new Response(js, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript; charset=utf-8',
    },
  });
});
