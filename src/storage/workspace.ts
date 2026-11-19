import type { PersistedAppState } from '../types/curriculum';
import { createInitialAppState, validateAndParseBackupJson, STORAGE_KEY } from '../utils/storage';

export const DB_NAME = 'thiepn-bunshou-workspaces-v1';
export const GUEST = 'guest';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type Owner = string;
export type Envelope = { owner: Owner; revision: number; raw: string; previousRaw?: string; legacyRaw?: string; claimedFrom?: number };
type Receipt = { key: 'legacy'; raw: string | null };
export class WorkspaceError extends Error {
  constructor(public code: string, public raw?: string, public recoveryRaw?: string) { super(code); }
}
function ownerCheck(owner: Owner) { if (owner !== GUEST && !UUID.test(owner)) throw new WorkspaceError('INVALID_OWNER'); }
export function decode(raw: string): PersistedAppState {
  const r = validateAndParseBackupJson(raw);
  if (!r.valid || !r.state) throw new WorkspaceError('INVALID_BACKUP', raw);
  return r.state;
}
export function encode(state: PersistedAppState) { const raw = JSON.stringify(state); decode(raw); return raw; }
const initialRaw = () => encode(createInitialAppState());
function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new WorkspaceError('TRANSACTION_ABORTED')); tx.onerror = () => {}; });
}
export class WorkspaceStore {
  private transactions = new Set<IDBTransaction>();
  private closed = false;
  private constructor(private db: IDBDatabase) { db.onversionchange = () => this.close(); }
  static async open(factory: IDBFactory = indexedDB) {
    const req = factory.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('states', {keyPath:'owner'}); req.result.createObjectStore('meta', {keyPath:'key'}); };
    const db = await new Promise<IDBDatabase>((resolve,reject) => {
      let blocked = false;
      req.onblocked = () => { blocked = true; reject(new WorkspaceError('DATABASE_BLOCKED')); };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { if (blocked) req.result.close(); else resolve(req.result); };
    });
    return new WorkspaceStore(db);
  }
  close() { this.closed = true; for (const tx of this.transactions) { try { tx.abort(); } catch {} } this.db.close(); }
  private async run<T>(stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    if (this.closed) throw new WorkspaceError('WORKSPACE_CLOSED');
    const tx = this.db.transaction(stores, mode);
    this.transactions.add(tx);
    const completion = done(tx);
    void completion.catch(() => {});
    try { const result = await fn(tx); if (this.closed) throw new WorkspaceError('WORKSPACE_CLOSED'); await completion; return result; }
    catch (e) { try { tx.abort(); } catch {} await completion.catch(() => {}); throw e; }
    finally { this.transactions.delete(tx); }
  }
  /** Legacy bytes are never deleted or rewritten. A receipt makes retry idempotent. */
  async migrateLegacy(storage: Pick<Storage,'getItem'>) {
    const existing = await this.run(['meta'], 'readonly', async tx => request<Receipt | undefined>(tx.objectStore('meta').get('legacy')));
    if (existing) return;
    let raw: string | null;
    try { raw = storage.getItem(STORAGE_KEY); } catch { throw new WorkspaceError('LEGACY_STORAGE_UNAVAILABLE'); }
    let stateRaw: string | null = null;
    if (raw !== null) {
      try { stateRaw = encode(decode(raw)); }
      catch { let recovery: string | undefined; try { const v=storage.getItem(STORAGE_KEY+'_recovery_last_good'); if(v!==null){ decode(v); recovery=v; } } catch {} throw new WorkspaceError('LEGACY_RECOVERY_REQUIRED',raw,recovery); }
    }
    await this.run(['states','meta'], 'readwrite', async tx => {
      const meta = tx.objectStore('meta'), states = tx.objectStore('states');
      if (await request(meta.get('legacy'))) return;
      if (storage.getItem(STORAGE_KEY) !== raw) throw new WorkspaceError('LEGACY_CHANGED_RETRY');
      if (raw !== null) {
        if (await request(states.get(GUEST))) throw new WorkspaceError('LEGACY_GUEST_CONFLICT',raw);
        await request(states.add({owner:GUEST,revision:1,raw:stateRaw!,legacyRaw:raw} satisfies Envelope));
      }
      await request(meta.add({key:'legacy',raw} satisfies Receipt));
    });
  }
  async read(owner: Owner): Promise<Envelope> {
    ownerCheck(owner);
    return this.run(['states'], 'readonly', async tx => {
      const row = await request<Envelope|undefined>(tx.objectStore('states').get(owner));
      if (!row) return {owner,revision:0,raw:initialRaw()};
      if(row.owner!==owner || !Number.isSafeInteger(row.revision) || row.revision<1) throw new WorkspaceError('INVALID_ENVELOPE',row.raw,row.previousRaw);
      try { decode(row.raw); } catch { throw new WorkspaceError('RECOVERY_REQUIRED',row.raw,row.previousRaw); }
      return row;
    });
  }
  async commit(owner: Owner, revision: number, state: PersistedAppState): Promise<Envelope> {
    ownerCheck(owner); const raw = encode(state);
    return this.run(['states'],'readwrite',async tx => {
      const store = tx.objectStore('states');
      const current = await request<Envelope|undefined>(store.get(owner));
      if ((current?.revision ?? 0)!==revision || (current && current.owner!==owner)) throw new WorkspaceError('REVISION_CONFLICT');
      if(current) decode(current.raw);
      if(current?.raw===raw) return current;
      const next: Envelope={owner,revision:revision+1,raw,previousRaw:current?.raw,legacyRaw:current?.legacyRaw,claimedFrom:current?.claimedFrom};
      await request(store.put(next)); return next;
    });
  }
  /** One atomic transaction across owner-keyed rows, no cross-database partial move. */
  async claimGuest(owner: Owner, guestRevision: number, targetRevision: number, stillAuthorized: () => boolean) {
    ownerCheck(owner); if(owner===GUEST) throw new WorkspaceError('INVALID_OWNER');
    return this.run(['states'],'readwrite',async tx=>{
      const store=tx.objectStore('states');
      const guest=await request<Envelope|undefined>(store.get(GUEST));
      const target=await request<Envelope|undefined>(store.get(owner));
      if(!guest || guest.revision!==guestRevision || (target?.revision??0)!==targetRevision || target || guest.claimedFrom!==undefined || !stillAuthorized()) throw new WorkspaceError('CLAIM_CONFLICT');
      decode(guest.raw);
      const next: Envelope={owner,revision:1,raw:guest.raw,legacyRaw:guest.legacyRaw,claimedFrom:guestRevision};
      await request(store.add(next));
      await request(store.put({owner:GUEST,revision:guest.revision+1,raw:initialRaw(),previousRaw:guest.raw,legacyRaw:guest.legacyRaw,claimedFrom:guestRevision} satisfies Envelope));
      if(!stillAuthorized()) throw new WorkspaceError('CLAIM_CANCELLED');
      return next;
    });
  }
}
