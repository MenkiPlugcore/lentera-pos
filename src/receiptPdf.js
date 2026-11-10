// Struk kasir latihan 80 mm, dibuat di browser tanpa library/CDN.
// PDF hanya berisi snapshot transaksi simulasi; tidak menulis database.
import { formatRupiah } from './publicCashier.js'

const WIDTH=226.77 // 80 mm, dalam PDF points.
const LEFT=14
const RIGHT=WIDTH-LEFT
const encoder=new TextEncoder()

const ascii=value=>String(value??'')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/[^\x20-\x7E]/g,' ')
  .replace(/\s+/g,' ')
  .trim()

const safeLiteral=value=>ascii(value)
  .replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')

const money=value=>ascii(formatRupiah(value))

function wrapWords(input,maxLength=36) {
  const words=ascii(input).split(' ')
  const lines=[]
  let current=''
  for(const word of words) {
    if(word.length>maxLength) {
      if(current){lines.push(current);current=''}
      for(let offset=0;offset<word.length;offset+=maxLength)
        lines.push(word.slice(offset,offset+maxLength))
      continue
    }
    if(!current)current=word
    else if(current.length+1+word.length<=maxLength)current+=' '+word
    else {lines.push(current);current=word}
  }
  if(current)lines.push(current)
  return lines.length?lines:['-']
}

export function receiptPdfFilename(receipt) {
  const id=ascii(receipt?.id||'LATIHAN')
    .replace(/[^A-Za-z0-9_-]/g,'-')
    .slice(0,45)
  return 'LenteraPOS-Struk-'+(id||'LATIHAN')+'.pdf'
}

export function createReceiptPdf(receipt) {
  if(!receipt||receipt.simulation!==true||!Array.isArray(receipt.items))
    throw new Error('Struk latihan tidak valid.')
  const created=new Date(receipt.createdAt)
  if(!Number.isFinite(created.getTime()))throw new Error('Tanggal struk tidak valid.')

  const lines=[
    {text:'LENTERA POS',size:12,bold:true,align:'center'},
    {text:'STRUK LATIHAN',size:9,bold:true,align:'center'},
    {text:'BUKAN TRANSAKSI ASLI',size:7,align:'center'},
    {type:'rule'},
    {text:'No: '+receipt.id,size:8},
    {text:'Tanggal: '+created.toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}),size:8},
    {type:'rule'},
  ]
  for(const item of receipt.items) {
    for(const name of wrapWords(item.name))lines.push({text:name,size:8.6,bold:true})
    lines.push({text:item.qty+' x '+money(item.unitPrice),right:money(item.subtotal),size:8.1})
  }
  lines.push(
    {type:'rule'},
    {text:'TOTAL',right:money(receipt.totalAmount),size:9.4,bold:true},
    {text:'TUNAI',right:money(receipt.paidAmount),size:9},
    {text:'KEMBALIAN',right:money(receipt.changeAmount),size:9.4,bold:true},
    {type:'rule'},
    {text:'Stok latihan otomatis kembali.',size:7,align:'center'},
    {text:'Terima kasih sudah belajar!',size:7.5,align:'center'},
  )

  const LINE_HEIGHT=13
  const height=Math.max(190,40+lines.length*LINE_HEIGHT)
  const cmds=['0.55 w']
  for(let index=0;index<lines.length;index++) {
    const line=lines[index]
    const y=(height-25-index*LINE_HEIGHT).toFixed(2)
    if(line.type==='rule') {
      cmds.push(LEFT+' '+y+' m '+RIGHT.toFixed(2)+' '+y+' l S')
      continue
    }
    const font=line.bold?'F2':'F1'
    const size=line.size||8.5
    const widthFor=t=>ascii(t).length*size*.6 // Courier is monospaced.
    let x=LEFT
    if(line.align==='center')x=(WIDTH-widthFor(line.text))/2
    x=Math.max(LEFT,x)
    cmds.push('BT /'+font+' '+size+' Tf 1 0 0 1 '+x.toFixed(2)+' '+y+' Tm ('+
      safeLiteral(line.text)+') Tj ET')
    if(line.right) {
      const rightX=Math.max(LEFT,RIGHT-widthFor(line.right))
      cmds.push('BT /'+font+' '+size+' Tf 1 0 0 1 '+rightX.toFixed(2)+' '+y+
        ' Tm ('+safeLiteral(line.right)+') Tj ET')
    }
  }

  const stream=cmds.join('\n')+'\n'
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+WIDTH+' '+height+
      '] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>',
    '<< /Length '+encoder.encode(stream).length+' >>\nstream\n'+stream+'endstream',
  ]
  let doc='%PDF-1.4\n%LENTERA POS receipt\n'
  const offsets=[0]
  for(let index=0;index<objects.length;index++) {
    offsets.push(encoder.encode(doc).length)
    doc+=(index+1)+' 0 obj\n'+objects[index]+'\nendobj\n'
  }
  const xrefOffset=encoder.encode(doc).length
  doc+='xref\n0 '+(objects.length+1)+'\n'
  doc+='0000000000 65535 f \n'
  for(const offset of offsets.slice(1))
    doc+=String(offset).padStart(10,'0')+' 00000 n \n'
  doc+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\n'
  doc+='startxref\n'+xrefOffset+'\n%%EOF\n'
  return encoder.encode(doc)
}
