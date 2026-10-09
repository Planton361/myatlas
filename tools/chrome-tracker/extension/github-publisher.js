/* Fixed-repository transport, injectable only for local tests. Never follows redirects. */
(function(g){
  'use strict';
  const P=g.MyAtlasPublicProgress;
  class Failure extends Error{constructor(kind,message,retryAfter=0){super(message);this.kind=kind;this.retryAfter=retryAfter;}}
  const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
  function retryAfter(response,now){
    const h=response.headers,raw=h.get('retry-after');
    if(raw){const n=Number(raw);return Number.isFinite(n)?Math.max(60000,n*1000):Math.max(60000,Date.parse(raw)-now)||60000;}
    const reset=Number(h.get('x-ratelimit-reset'));return reset?Math.max(60000,reset*1000-now):60000;
  }
  function create({ids,fetch:request=g.fetch.bind(g),now=()=>Date.now(),timeout=15000,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
    async function call(method,token,body,metadata=false){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
      try{
        const response=await request(metadata?P.REPOSITORY:P.ENDPOINT+(method==='GET'?'?ref=main':''),{
          method,credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
          headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':P.API_VERSION,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
          ...(body?{body:JSON.stringify(body)}:{})
        });
        const text=await response.text();if(text.length>P.MAX_BYTES*2)throw new Failure('invalid','GitHub response exceeds the progress-only size limit.');
        return {status:response.status,ok:response.ok,headers:response.headers,text:async()=>text};
      }catch(error){if(error instanceof Failure)throw error;throw new Failure('temporary','GitHub temporarily unavailable; pending changes retained.');}
      finally{clearTimeout(timer);}
    }
    async function json(response){
      const text=await response.text();if(text.length>P.MAX_BYTES*2)throw new Failure('invalid','GitHub file exceeds the progress-only size limit.');
      try{return JSON.parse(text);}catch{throw new Failure('invalid','GitHub returned invalid JSON. Nothing was overwritten.');}
    }
    function failure(r){
      if(r.status===429||r.status>=500||(r.status===403&&(r.headers.get('retry-after')||r.headers.get('x-ratelimit-remaining')==='0')))
        return new Failure('temporary','GitHub rate limit or temporary failure; pending changes retained.',retryAfter(r,now()));
      if(r.status===401||r.status===403)return new Failure('auth','Token rejected or Contents write access denied. Re-enter a restricted token.');
      return new Failure('blocked','GitHub HTTP '+r.status+'. Check the public repository, main branch and write rules.');
    }
    async function read(token){
      const r=await call('GET',token);
      if(r.status===404)return {sha:null,value:{schemaVersion:1,updatedAt:new Date(now()).toISOString(),solved:[]}};
      if(!r.ok)throw failure(r);
      const file=await json(r);
      if(file.type!=='file'||file.path!=='progress/leetcode/solved.json'||file.encoding!=='base64'||!sha(file.sha)||
         !Number.isInteger(file.size)||file.size<0||file.size>P.MAX_BYTES||typeof file.content!=='string'||file.content.length>P.MAX_BYTES*1.5)
        throw new Failure('invalid','Remote solved.json is not a supported progress file. Nothing was overwritten.');
      try{
        const encoded=file.content.replace(/\s/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error();
        const text=atob(encoded);if(text.length>P.MAX_BYTES)throw Error();
        return {sha:file.sha,value:P.validate(JSON.parse(text),ids,now())};
      }catch{throw new Failure('invalid','Remote progress failed exact-ID/schema validation. Nothing was overwritten.');}
    }
    async function publish(token,ops){
      if(typeof token!=='string'||!/^github_pat_[A-Za-z0-9_]+$/.test(token))throw new Failure('auth','A fine-grained GitHub token is required.');
      const checked=P.operations(ops,ids);
      // Anonymous repository metadata must prove this is the intended public
      // repository and initialized main branch before any authenticated write.
      const repositoryResponse=await call('GET',null,null,true);
      if(!repositoryResponse.ok)throw failure(repositoryResponse);
      const repository=await json(repositoryResponse);
      if(repository.private!==false||repository.full_name?.toLowerCase()!=='planton361/myatlas'||repository.default_branch!=='main')
        throw new Failure('blocked','Initialize the public MyAtlas repository with main as its default branch.');
      let remote=await read(token);
      for(let conflict=0;conflict<3;conflict++){
        const merged=P.merge(remote.value,checked,ids,now());
        if(remote.sha&&!merged.changed)return {sha:remote.sha,value:remote.value,wrote:false};
        const text=JSON.stringify(merged.value,null,2)+'\n';if(text.length>P.MAX_BYTES)throw new Failure('invalid','Public progress is too large.');
        const r=await call('PUT',token,{message:'Update confirmed MyAtlas LeetCode progress',branch:'main',content:btoa(text),...(remote.sha?{sha:remote.sha}:{})});
        if(r.ok){const result=await json(r);if(!sha(result.content?.sha))throw new Failure('temporary','Write acknowledgement incomplete; retry will verify the remote file.');return {sha:result.content.sha,value:merged.value,wrote:true};}
        if(r.status===409||r.status===422){
          await pause(1000);
          const fresh=await read(token);
          if(r.status===422&&fresh.sha===remote.sha)throw failure(r);
          remote=fresh;continue;
        }
        throw failure(r);
      }
      throw new Failure('temporary','Concurrent file changes; pending operations retained for retry.',60000);
    }
    return {publish};
  }
  const api={create,Failure};g.MyAtlasGitHubPublisher=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
