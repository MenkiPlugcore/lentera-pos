import { TOTAL_LEVELS,ROUNDS_PER_LEVEL,difficultyForLevel,starsForCorrect } from './localLevels.js'
import StoreScene from './StoreScene.jsx'
import './levelSelect.css'

export default function LevelSelect({
  profiles,profile,nickname,onNameChange,onCreate,
  onChooseProfile,onDeleteProfile,onStartLevel,onResume,onBackHome,
}) {
  return <div className="local-select-page">
    <header className="local-select-header">
      <div>
        <p className="arcade-kicker">LENTERA POS · GAME KASIR</p>
        <h1>Petualangan Kasir</h1>
        <p>40 level · 5 pelanggan per level · tanpa timer</p>
      </div>
      <a href="/" className="arcade-back-link">← Beranda</a>
    </header>
    {!profile ? <div className="local-welcome">
      <div className="local-welcome-scene"><StoreScene empty/></div>
      <section className="local-welcome-content">
        <p className="local-overline">BUAT PROFIL LOKAL</p>
        <h2>Siapa yang bermain?</h2>
        <p>Nama dan kemajuan tersimpan hanya di browser perangkat ini. Tidak perlu login.</p>
        <form onSubmit={event=>{event.preventDefault();onCreate()}}>
          <label htmlFor="local-player-name">Nama panggilan</label>
          <input id="local-player-name" autoComplete="off" maxLength={32}
            value={nickname} onChange={e=>onNameChange(e.target.value)}
            placeholder="Contoh: Pemain A" required minLength={2}/>
          <button className="arcade-primary-button" type="submit" disabled={nickname.trim().length<2}>
            Buat Pemain
          </button>
        </form>
        {profiles.length>0 && <div className="local-existing">
          <h3>Lanjutkan pemain sebelumnya</h3>
          {profiles.map(p=><button key={p.id} type="button" className="local-existing-player"
            onClick={()=>onChooseProfile(p.id)}>
            <span><strong>{p.name}</strong><small>Level {p.unlockedLevel} terbuka</small></span>
            <span>Masuk →</span>
          </button>)}
        </div>}
        <p className="local-storage-note">Progres bisa hilang jika data browser dibersihkan. Gunakan perangkat dan browser yang sama.</p>
      </section>
    </div> : <section className="local-level-section">
      <div className="local-level-toolbar">
        <div>
          <span className="local-overline">PEMAIN AKTIF</span>
          <h2>{profile.name}</h2>
          <p>Level {profile.unlockedLevel} dari {TOTAL_LEVELS} terbuka</p>
        </div>
        <div className="local-level-toolbar-actions">
          <button type="button" onClick={onBackHome} className="local-switch-button">Ganti pemain</button>
          <button type="button" onClick={()=>onDeleteProfile(profile.id)} className="local-delete-button">Hapus profil</button>
        </div>
      </div>
      {profile.active && <button className="local-resume-banner" type="button" onClick={onResume}>
        <span><strong>▶ Lanjutkan Level {profile.active.level}</strong>
          <small>Pelanggan {profile.active.round}/{ROUNDS_PER_LEVEL}</small></span>
        <span>Lanjut →</span>
      </button>}
      <div className="local-level-summary">
        <div><strong>{Object.keys(profile.records).length}</strong><span>Level lulus</span></div>
        <div><strong>{Object.values(profile.records).reduce((sum,r)=>sum+r.stars,0)}</strong><span>Total bintang</span></div>
        <div><strong>{profile.unlockedLevel}</strong><span>Level tertinggi</span></div>
      </div>
      <div className="local-level-title">
        <h3>Pilih Level</h3>
        <p>Minimal 3 jawaban benar dari 5 pelanggan untuk membuka level berikutnya.</p>
      </div>
      <div className="local-level-grid">
        {Array.from({length:TOTAL_LEVELS},(_,i)=>{
          const level=i+1,record=profile.records[level],locked=level>profile.unlockedLevel
          const current=level===profile.unlockedLevel&&!record
          return <button type="button" key={level} disabled={locked}
            className={'local-level-cell'+(locked?' local-level-cell--locked':'')+
              (record?' local-level-cell--done':'')+(current?' local-level-cell--current':'')}
            onClick={()=>onStartLevel(level)}
            aria-label={'Level '+level+(locked?' terkunci':record?' selesai '+record.stars+' bintang':' terbuka')}>
            <span className="local-level-number">{locked?'🔒':record?'★':level}</span>
            <strong>Level {level}</strong>
            <small>{record?'★'.repeat(record.stars)+'☆'.repeat(3-record.stars):
              locked?'Terkunci':current?'Mainkan':'Ulangi'}</small>
            {!locked&&<span className="local-level-items">
              {difficultyForLevel(level)===1?'2':difficultyForLevel(level)<=3?'3':difficultyForLevel(level)===4?'4':'5'} barang
            </span>}
          </button>
        })}
      </div>
      <p className="local-storage-note">Akun lokal tidak memakai password dan tidak tersinkron ke perangkat lain. Setiap level boleh diulang untuk memperbaiki bintang.</p>
    </section>}
  </div>
}
