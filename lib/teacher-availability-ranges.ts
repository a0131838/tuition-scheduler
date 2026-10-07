export type AvailabilityRange = { startMin: number; endMin: number };

/** Merge adjacent confirmed slots, then subtract explicit unavailable intervals. */
export function effectiveDateAvailability(slots: AvailabilityRange[], blocks: AvailabilityRange[]) {
  const merged: AvailabilityRange[]=[];
  for(const slot of [...slots].filter(s=>s.endMin>s.startMin).sort((a,b)=>a.startMin-b.startMin)){
    const last=merged.at(-1);
    if(last && slot.startMin<=last.endMin)last.endMin=Math.max(last.endMin,slot.endMin);
    else merged.push({...slot});
  }
  let result=merged;
  for(const block of blocks)result=result.flatMap(slot=>{
    if(block.endMin<=slot.startMin || block.startMin>=slot.endMin)return [slot];
    const parts:AvailabilityRange[]=[];
    if(slot.startMin<block.startMin)parts.push({startMin:slot.startMin,endMin:block.startMin});
    if(block.endMin<slot.endMin)parts.push({startMin:block.endMin,endMin:slot.endMin});
    return parts;
  });
  return result;
}
