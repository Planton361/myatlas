/* Use the exact reviewed Browser contract, including Web Crypto SHA-256. */
'use strict';
const fs=require('node:fs'),reader=require('../../src/supplements/hyperskill-index-v1/reader.js');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
(async()=>{
 if(input.mode==='pointer'){
  const p=reader.decode(input.pointerText);reader.pointer(p);process.stdout.write(JSON.stringify(p));
 }else{
  const checked=await reader.validate(input.pointerText,input.payloadText,require('node:crypto').webcrypto);
  process.stdout.write(JSON.stringify({pointer:checked.pointer,store_revision:checked.store_revision}));
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
