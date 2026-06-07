const fetch = require('node-fetch');
exports.handler = async function(event) {
  const h = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
  if(event.httpMethod==="OPTIONS") return {statusCode:200,headers:h,body:""};
  const key = process.env.ANTHROPIC_API_KEY;
  if(!key) return {statusCode:500,headers:h,body:JSON.stringify({error:"No API key"})};
  try {
    const req = JSON.parse(event.body);
    req.model = "claude-haiku-4-5-20251001";
    req.max_tokens = 1500;
    const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify(req)});
    const data = await r.json();
    if(data.content&&data.content[0]&&data.content[0].text){
      let t=data.content[0].text.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
      const s=t.indexOf('{'),e=t.lastIndexOf('}');
      if(s>=0&&e>s){
        t=t.slice(s,e+1);
        t=t.replace(/"((?:[^"\\]|\\.)*)"/g,function(m,inner){return '"'+inner.replace(/[\u0080-\uFFFF]/g,function(c){return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4)})+'"';});
        try{JSON.parse(t);data.content[0].text=t;}catch(e){}
      }
    }
    return {statusCode:r.status,headers:h,body:JSON.stringify(data)};
  } catch(e) {
    return {statusCode:500,headers:h,body:JSON.stringify({error:e.message})};
  }
};
