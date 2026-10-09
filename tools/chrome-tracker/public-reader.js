/* Anonymous website reader. Deliberately has no credential or publisher interface. */
(function(g){
  'use strict';
  const P=g.MyAtlasPublicProgress;
  function create({ids,fetch:request=g.fetch.bind(g),now=()=>Date.now()}){
    let last=null;
    async function load(){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      try{
        const response=await request(P.ENDPOINT+'?ref=main',{
          method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
          headers:{Accept:'application/vnd.github.raw+json','X-GitHub-Api-Version':P.API_VERSION}
        });
        if(!response.ok)throw Error('HTTP '+response.status);
        const text=await response.text();if(text.length>P.MAX_BYTES)throw Error('Response too large');
        last=P.validate(JSON.parse(text),ids,now());return {status:'published',value:last,error:null};
      }catch{
        return {status:last?'stale':'unavailable',value:last,error:'Public progress unavailable. '+(last?'Showing the last validated snapshot.':'Solved total is unknown; no zero-progress claim.')};
      }finally{clearTimeout(timer);}
    }
    return {load};
  }
  const api={create};g.MyAtlasPublicReader=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
