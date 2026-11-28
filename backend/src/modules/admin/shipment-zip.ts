// Minimal uncompressed ZIP writer for bounded, server-generated ASCII filenames.
// No file paths, compression, ZIP64, or arbitrary uploads are supported.
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});
function crc32(data:Buffer){let c=0xffffffff;for(const byte of data)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function storedZip(files:{name:string;data:Buffer}[]){
 if(files.length<1||files.length>10)throw new Error('Invalid ZIP entry count');
 const locals:Buffer[]=[],central:Buffer[]=[];let offset=0,centralSize=0;
 for(const {name,data} of files){
  if(!/^[a-z0-9-]+\.pdf$/.test(name))throw new Error('Invalid ZIP filename');
  const fn=Buffer.from(name,'ascii'),crc=crc32(data),l=Buffer.alloc(30),d=Buffer.alloc(46);
  l.writeUInt32LE(0x04034b50,0);l.writeUInt16LE(20,4);l.writeUInt16LE(33,12);l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(data.length,22);l.writeUInt16LE(fn.length,26);
  d.writeUInt32LE(0x02014b50,0);d.writeUInt16LE(20,4);d.writeUInt16LE(20,6);d.writeUInt16LE(33,14);d.writeUInt32LE(crc,16);d.writeUInt32LE(data.length,20);d.writeUInt32LE(data.length,24);d.writeUInt16LE(fn.length,28);d.writeUInt32LE(offset,42);
  locals.push(l,fn,data);central.push(d,fn);offset+=l.length+fn.length+data.length;centralSize+=d.length+fn.length;
 }
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,...central,end]);
}
