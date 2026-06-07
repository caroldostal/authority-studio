exports.handler = async function(event) {
  const h = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,OPTIONS","Content-Type":"application/json"};
  if(event.httpMethod==="OPTIONS") return {statusCode:200,headers:h,body:""};
  const feeds = [
    {name:"Exame",url:"https://exame.com/feed/",cat:"Brasil"},
    {name:"Valor Econômico",url:"https://valor.globo.com/rss/home",cat:"Brasil"},
    {name:"Fast Company",url:"https://www.fastcompany.com/latest/rss",cat:"Internacional"},
    {name:"HBR",url:"https://feeds.hbr.org/harvardbusiness",cat:"Liderança"},
    {name:"Wired",url:"https://www.wired.com/feed/rss",cat:"Tecnologia"},
    {name:"MIT Tech Review",url:"https://www.technologyreview.com/feed/",cat:"Tecnologia"},
  ];
  async function fetchFeed(feed){
    try{
      const r=await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=6&api_key=s9ub9ywyfsvhaq0qtg2pushezma270huezbybonr`);
      const data=await r.json();
      if(data.status==='ok'&&data.items&&data.items.length>0){
        return data.items.slice(0,5).map(item=>({title:(item.title||'').trim(),desc:(item.description||item.content||'').replace(/<[^>]*>/g,'').trim().slice(0,220),url:item.link||'',date:item.pubDate||new Date().toISOString(),source:feed.name,cat:feed.cat,img:item.thumbnail||(item.enclosure&&item.enclosure.link)||''}));
      }
    }catch(e){}
    return[];
  }
  try{
    const results=await Promise.allSettled(feeds.map(fetchFeed));
    const articles=results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value).filter(a=>a.title&&a.title.length>5).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,40);
    return {statusCode:200,headers:h,body:JSON.stringify({articles,total:articles.length})};
  }catch(e){
    return {statusCode:500,headers:h,body:JSON.stringify({error:e.message,articles:[]})};
  }
};
