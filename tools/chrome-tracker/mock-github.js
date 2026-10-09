/* Disposable fake API shared by demo/tests; no actual network or credential creation. */
(function(g){
  'use strict';
  const P=g.MyAtlasPublicProgress;
  function create({ids,now=()=>Date.now()}){
    let value=null,revision=0,scenario='normal',puts=0;
    const calls=[],sha=()=>revision.toString(16).padStart(40,'0');
    const reply=(status,data)=>({status,ok:status>=200&&status<300,headers:{get:()=>null},text:async()=>JSON.stringify(data)});
    async function fetch(url,options){
      if((!url.startsWith(P.ENDPOINT)&&url!==P.REPOSITORY)||options.credentials!=='omit'||options.redirect!=='error')throw Error('Unexpected mock request');
      const authenticated=Boolean(options.headers.Authorization);
      calls.push({method:options.method,authenticated,accept:options.headers.Accept});
      if(scenario==='offline'){scenario='normal';throw Error('DISPOSABLE offline');}
      if(scenario==='rejected'&&authenticated){scenario='normal';return reply(401,{});}
      if(scenario==='unavailable'){scenario='normal';return reply(503,{});}
      if(url===P.REPOSITORY)return reply(200,{private:false,full_name:'Planton361/myatlas',default_branch:'main'});
      if(options.method==='GET'){
        if(!value)return reply(404,{});
        if(!authenticated)return reply(200,value);
        return reply(200,{type:'file',path:'progress/leetcode/solved.json',encoding:'base64',size:JSON.stringify(value).length,sha:sha(),content:btoa(JSON.stringify(value))});
      }
      if(options.method!=='PUT'||!authenticated)throw Error('Unsupported mock write');
      const body=JSON.parse(options.body);
      if(scenario==='conflict'){
        scenario='normal';const other=[...ids].find(id=>id!=='lc:problem:p0001');
        value={schemaVersion:1,updatedAt:new Date(now()).toISOString(),solved:other?[{problemId:other,source:'manual-owner-attestation'}]:[]};revision++;return reply(409,{});
      }
      if((value&&body.sha!==sha())||(!value&&body.sha))return reply(409,{});
      value=P.validate(JSON.parse(atob(body.content)),ids,now());revision++;puts++;return reply(201,{content:{sha:sha()}});
    }
    return {fetch,calls,setScenario:s=>scenario=s,get value(){return value;},get puts(){return puts;}};
  }
  const api={create};g.MyAtlasMockGitHub=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
