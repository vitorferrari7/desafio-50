import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { rankingDisponivel, supabase } from './lib/supabase';

const TOTAL_DIAS = 50;
const STORAGE_KEY = 'desafio50-registros';

const frases = [
  'Um passo de cada vez também leva longe.',
  'Consistência é o que transforma intenção em resultado.',
  'Hoje você escolheu cuidar da sua melhor versão.',
  'Pequenos esforços, grandes conquistas.',
  'Movimento é progresso. Continue.'
];

const formatarData = (data) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric'
}).format(new Date(`${data}T12:00:00`));

function App() {
  const [historico, setHistorico] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  });
  const [km, setKm] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [mensagem, setMensagem] = useState('');
  const [session, setSession] = useState(null);
  const [grupo, setGrupo] = useState(() => localStorage.getItem('desafio50-grupo') || '');
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: auth } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => auth.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !grupo) return;
    supabase.from('activities').select('user_id,distance_km,profiles(display_name)').eq('group_id', grupo).then(({ data }) => {
      const scores = (data || []).reduce((all, item) => {
        const score = all[item.user_id] || { nome: item.profiles?.display_name || 'Participante', dias: 0, km: 0 };
        score.dias += 1; score.km += Number(item.distance_km); all[item.user_id] = score; return all;
      }, {});
      setRanking(Object.values(scores).sort((a, b) => b.dias - a.dias || b.km - a.km));
    });
  }, [grupo, historico.length]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historico));
  }, [historico]);

  const totalKm = useMemo(
    () => historico.reduce((total, registro) => total + Number(registro.km), 0),
    [historico]
  );
  const progresso = Math.round((historico.length / TOTAL_DIAS) * 100);
  const proximoDia = Math.min(historico.length + 1, TOTAL_DIAS);

  const registrarCorrida = async (event) => {
    event.preventDefault();
    const distancia = Number(km);
    if (!distancia || distancia <= 0 || historico.length >= TOTAL_DIAS) return;

    const novoRegistro = {
      id: crypto.randomUUID(),
      dia: historico.length + 1,
      km: distancia,
      data,
    };
    setHistorico((atual) => [...atual, novoRegistro]);
    if (session && grupo) await supabase.from('activities').insert({ user_id: session.user.id, group_id: grupo, challenge_day: novoRegistro.dia, distance_km: distancia, activity_date: data });
    setKm('');
    setMensagem(frases[Math.floor(Math.random() * frases.length)]);
  };

  const removerRegistro = (id) => {
    setHistorico((atual) => atual
      .filter((registro) => registro.id !== id)
      .map((registro, index) => ({ ...registro, dia: index + 1 }))
    );
  };

  const limparDesafio = () => {
    if (window.confirm('Deseja apagar todos os registros do desafio?')) {
      setHistorico([]);
      setMensagem('Desafio reiniciado. Um novo começo te espera.');
    }
  };

  return (
    <main className="app-shell">
      <section className="dashboard">
        <header className="topbar">
          <a className="brand" href="#inicio" aria-label="Desafio 50 - início">
            <span className="brand-mark">50</span>
            <span>desafio<span>.</span></span>
          </a>
          <span className="storage-status"><i /> Seus dados estão salvos neste dispositivo</span>
        </header>

        <div className="hero" id="inicio">
          <div>
            <p className="eyebrow">SEU RITMO, SUA JORNADA</p>
            <h1>50 dias para<br /><em>ir mais longe.</em></h1>
            <p className="hero-copy">Construa uma rotina mais forte, registro por registro. Seu desafio começa no próximo passo.</p>
          </div>
          <div className="day-counter">
            <span>PRÓXIMO REGISTRO</span>
            <strong>{String(proximoDia).padStart(2, '0')}</strong>
            <small>de {TOTAL_DIAS} dias</small>
          </div>
        </div>

        <section className="stats-grid" aria-label="Resumo do desafio">
          <article className="stat-card highlight">
            <div className="stat-icon">↗</div>
            <div><span>PROGRESSO ATUAL</span><strong>{progresso}%</strong></div>
            <div className="progress-track"><i style={{ width: `${progresso}%` }} /></div>
            <small>{historico.length} de {TOTAL_DIAS} dias concluídos</small>
          </article>
          <article className="stat-card">
            <div className="stat-icon">⌁</div>
            <div><span>DISTÂNCIA TOTAL</span><strong>{totalKm.toFixed(1)} <small>km</small></strong></div>
          </article>
          <article className="stat-card">
            <div className="stat-icon">◷</div>
            <div><span>FALTAM</span><strong>{TOTAL_DIAS - historico.length} <small>dias</small></strong></div>
          </article>
        </section>

        <div className="content-grid">
          <section className="panel registration-panel">
            <div className="section-heading"><div><p className="eyebrow">MANTENHA O RITMO</p><h2>Registrar atividade</h2></div><span className="calendar-icon">□</span></div>
            <form onSubmit={registrarCorrida}>
              <label>Distância percorrida <div className="input-wrap"><input aria-label="Distância percorrida" type="number" min="0.1" step="0.1" placeholder="0,0" value={km} onChange={(e) => setKm(e.target.value)} /><span>KM</span></div></label>
              <label>Data da atividade <input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
              <button className="primary-button" type="submit" disabled={historico.length >= TOTAL_DIAS}><span>＋</span> Registrar atividade</button>
            </form>
            {mensagem && <p className="motivation">“{mensagem}”</p>}
          </section>

          <section className="panel calendar-panel">
            <div className="section-heading"><div><p className="eyebrow">ACOMPANHE SUA EVOLUÇÃO</p><h2>Calendário do desafio</h2></div><span className="calendar-legend"><i /> Concluído</span></div>
            <div className="calendar-grid" aria-label="Calendário de 50 dias">
              {Array.from({ length: TOTAL_DIAS }, (_, index) => {
                const registro = historico[index];
                return <div className={`calendar-day ${registro ? 'done' : ''} ${index + 1 === proximoDia ? 'current' : ''}`} key={index} title={registro ? `Dia ${registro.dia}: ${registro.km} km` : `Dia ${index + 1}`}><span>{String(index + 1).padStart(2, '0')}</span>{registro && <b>✓</b>}</div>;
              })}
            </div>
            <div className="calendar-footer"><span>Início</span><div className="mini-progress"><i style={{ width: `${progresso}%` }} /></div><span>Meta: 50 dias</span></div>
          </section>
        </div>

        <section className="history-section">
          <div className="section-heading"><div><p className="eyebrow">SUA TRAJETÓRIA</p><h2>Atividades recentes</h2></div>{historico.length > 0 && <button className="text-button" onClick={limparDesafio}>Reiniciar desafio</button>}</div>
          {historico.length === 0 ? <div className="empty-state"><span>◎</span><p>Seu histórico aparecerá aqui após o primeiro registro.</p></div> : <div className="history-list">{[...historico].reverse().slice(0, 6).map((registro) => <article className="history-item" key={registro.id}><div className="history-day">{String(registro.dia).padStart(2, '0')}<small>DIA</small></div><div><strong>{registro.km} km</strong><span>{formatarData(registro.data)}</span></div><button onClick={() => removerRegistro(registro.id)} aria-label={`Remover registro do dia ${registro.dia}`}>×</button></article>)}</div>}
        </section>
        <RankingPanel session={session} grupo={grupo} setGrupo={setGrupo} ranking={ranking} />
      </section>
    </main>
  );
}

function RankingPanel({ session, grupo, setGrupo, ranking }) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState('');
  const entrar = async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } }); setAviso(error ? error.message : 'Confira seu e-mail para acessar.'); };
  const entrarNoGrupo = async (e) => {
    e.preventDefault();
    await supabase.from('profiles').upsert({ id: session.user.id, display_name: nome || session.user.email.split('@')[0] });
    if (!codigo) {
      const { data, error } = await supabase.from('challenge_groups').insert({ name: `Desafio de ${nome || session.user.email.split('@')[0]}`, created_by: session.user.id }).select().single();
      if (error) return setAviso(error.message);
      await supabase.from('group_members').insert({ group_id: data.id, user_id: session.user.id });
      localStorage.setItem('desafio50-grupo', data.id); setGrupo(data.id); setAviso(`Grupo criado. Convite: ${data.invite_code}`); return;
    }
    const { data, error } = await supabase.from('challenge_groups').select('id').eq('invite_code', codigo.toUpperCase()).single();
    if (error) return setAviso('Código não encontrado. Peça um convite ao criador do grupo.');
    await supabase.from('group_members').upsert({ group_id: data.id, user_id: session.user.id }); localStorage.setItem('desafio50-grupo', data.id); setGrupo(data.id); setAviso('Você entrou no grupo!');
  };
  if (!rankingDisponivel) return <section className="community-panel"><p className="eyebrow">DESAFIO EM GRUPO</p><h2>Ranking entre amigos</h2><p>Adicione as chaves do Supabase em <code>.env</code> para ativar grupos privados e ranking compartilhado.</p></section>;
  if (!session) return <section className="community-panel"><p className="eyebrow">DESAFIO EM GRUPO</p><h2>Convide seus amigos</h2><p>Entre com seu e-mail para participar de um grupo privado.</p><form className="community-form" onSubmit={entrar}><input type="email" placeholder="seuemail@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} /><button className="primary-button">Receber link</button></form><p className="community-note">{aviso}</p></section>;
  if (!grupo) return <section className="community-panel"><p className="eyebrow">DESAFIO EM GRUPO</p><h2>Crie ou entre em um grupo</h2><form className="community-form" onSubmit={entrarNoGrupo}><input placeholder="Seu nome" required value={nome} onChange={(e) => setNome(e.target.value)} /><input placeholder="Código do convite (opcional)" value={codigo} onChange={(e) => setCodigo(e.target.value)} /><button className="primary-button">{codigo ? 'Entrar' : 'Criar grupo'}</button></form><p className="community-note">{aviso}</p></section>;
  return <section className="community-panel"><div className="section-heading"><div><p className="eyebrow">DESAFIO EM GRUPO</p><h2>Ranking da turma</h2></div><button className="text-button" onClick={() => supabase.auth.signOut()}>Sair</button></div><div className="ranking-list">{ranking.map((pessoa, index) => <div key={`${pessoa.nome}-${index}`}><b>#{index + 1}</b><strong>{pessoa.nome}</strong><span>{pessoa.dias} dias · {pessoa.km.toFixed(1)} km</span></div>)}</div></section>;
}

export default App;
