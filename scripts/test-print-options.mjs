import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {computePrice,parsePageRange} from '../apps/web/lib/pricing.ts';
import {preparePrintPdf} from '../apps/web/lib/print-layout.ts';
const options={copies:1,color:false,orientation:'portrait',paper:'A4',duplex:false,duplex_edge:'long',pageRange:null,numberUp:1,collate:true,quality:'normal',mediaType:'plain',reverse:false,scaling:'fit-to-page',finishings:[]};
const pricing={bw_page_paise:1000,color_page_paise:2000,a3_multiplier:2,duplex_factor:.75,min_charge_paise:0};
assert.equal(computePrice(pricing,options,2).price_paise,2000);
assert.equal(computePrice(pricing,{...options,duplex:true},2).price_paise,1500);
assert.equal(computePrice(pricing,{...options,duplex:true},3).price_paise,2500);
assert.equal(computePrice(pricing,{...options,duplex:true,copies:2},3).price_paise,5000);
assert.equal(computePrice(pricing,{...options,numberUp:2},2).price_paise,1000);
assert.equal(computePrice(pricing,{...options,numberUp:2,duplex:true},4).price_paise,1500);
assert.equal(parsePageRange('1-3,2',5),3);
assert.throws(()=>parsePageRange('1-8',5));
const doc=await PDFDocument.create(); for(let i=0;i<10;i++) {const p=doc.addPage([595,842]);p.drawText(`Page ${i+1}`);}
for(const numberUp of [1,2,4,6,9]) for(const orientation of ['portrait','landscape']) {
 const out=await PDFDocument.load(await preparePrintPdf(await doc.save(),{...options,numberUp,orientation}));
 assert.equal(out.getPageCount(),Math.ceil(10/numberUp));
 assert.equal(out.getPage(0).getWidth()>out.getPage(0).getHeight(),orientation==='landscape');
}
const selected=await PDFDocument.load(await preparePrintPdf(await doc.save(),{...options,pageRange:'1-3,2',numberUp:2}));
assert.equal(selected.getPageCount(),2);
console.log('Pricing and PDF layout regression checks passed.');
