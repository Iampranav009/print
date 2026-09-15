"use client";
import {useEffect,useState} from 'react';
import {PDFDocument} from 'pdf-lib';
import {DocumentPreview} from '@/components/DocumentPreview';
export default function Check(){
 const [files,setFiles]=useState<{file:File,name:string,mime:string}[]>([]);
 const [orientation,setOrientation]=useState<'portrait'|'landscape'>('portrait');
 const [numberUp,setNumberUp]=useState(1);
 useEffect(()=>{void (async()=>{const pdf=await PDFDocument.create();for(let i=0;i<9;i++){const p=pdf.addPage([595,842]);p.drawText(`Sample page ${i+1}`,{x:100,y:700});}const file=new File([new Uint8Array(await pdf.save())],'Sample.pdf',{type:'application/pdf'});setFiles([{file,name:file.name,mime:file.type}]);})();},[]);
 return <main style={{width:390,margin:'30px auto',padding:20}}><button onClick={()=>setOrientation(o=>o==='portrait'?'landscape':'portrait')}>Orientation</button><button onClick={()=>setNumberUp(9)}>Nine pages</button>{files.length>0&&<DocumentPreview files={files} orientation={orientation} numberUp={numberUp} scaling="fit-to-page"/>}</main>
}
