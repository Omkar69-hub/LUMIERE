import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storedZip} from '../src/modules/admin/shipment-zip.js';
test('bounded ZIP contains correctly indexed entries and CRC32',()=>{
 const files=[{name:'one.pdf',data:Buffer.from('123456789')},{name:'two.pdf',data:Buffer.from('%PDF-test')}];
 const zip=storedZip(files),end=zip.length-22;
 assert.equal(zip.readUInt32LE(end),0x06054b50);
 assert.equal(zip.readUInt16LE(end+10),2);
 const central=zip.readUInt32LE(end+16);
 assert.equal(zip.readUInt32LE(14),0xcbf43926);
 assert.equal(zip.readUInt32LE(central),0x02014b50);
 assert.equal(zip.readUInt32LE(central+16),0xcbf43926);
 let pos=central;
 for(const f of files){
  assert.equal(zip.readUInt32LE(pos),0x02014b50);
  const offset=zip.readUInt32LE(pos+42),nameLen=zip.readUInt16LE(pos+28);
  assert.equal(zip.subarray(pos+46,pos+46+nameLen).toString(),f.name);
  assert.equal(zip.readUInt32LE(offset),0x04034b50);
  const start=offset+30+zip.readUInt16LE(offset+26);
  assert.deepEqual(zip.subarray(start,start+f.data.length),f.data);
  pos+=46+nameLen;
 }
 assert.equal(pos,end);
 assert.throws(()=>storedZip([{name:'../unsafe.pdf',data:Buffer.alloc(0)}]),/filename/);
});
