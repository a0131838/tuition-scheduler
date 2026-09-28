/** A missing legacy timestamp never makes preserved signature or invoice evidence disposable. */
export function hasContractExecutionHistory(contract:{signedAt?:Date|null;signedPdfPath?:string|null;signatureImagePath?:string|null;invoiceId?:string|null;invoiceNo?:string|null;invoiceCreatedAt?:Date|null}){
 return Boolean(contract.signedAt||contract.signedPdfPath||contract.signatureImagePath||contract.invoiceId||contract.invoiceNo||contract.invoiceCreatedAt);
}
