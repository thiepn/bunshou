/** M2 transport deliberately disabled. No endpoint, bearer, upload or cursor. */
export interface SyncPort { readonly version:1; readonly enabled:false; status():'disabled'; }
export const syncPort: SyncPort=Object.freeze({version:1,enabled:false,status:()=> 'disabled'});
