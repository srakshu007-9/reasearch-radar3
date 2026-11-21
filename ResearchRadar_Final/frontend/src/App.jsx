import React, {useEffect, useMemo, useState} from 'react';
import {Activity, ArrowRight, ArrowUpRight, Search, FileText, BookOpen, Bookmark, SlidersHorizontal, Menu, X, LockKeyhole, Mail, Sparkles, ExternalLink, Network, Database, Layers3, CheckCircle2, ChevronDown, GraduationCap, Microscope, Lightbulb, Clock3, Quote, Globe2, Filter, PanelTop, CircleHelp, Upload, FolderOpen, FileUp, FileSearch, Trash2, Download, LoaderCircle, AlertCircle, Check, ChevronRight, ScanText, Library, RotateCcw} from 'lucide-react';

const API = '/api';
async function api(path, options={}) {
 const response = await fetch(`${API}${path}`, {credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
 const payload = await response.json().catch(()=>({error:`Server returned ${response.status}`}));
 if(!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
 return payload;
}
function App(){
 const [page,setPage]=useState('home'),[user,setUser]=useState(null),[authMode,setAuthMode]=useState('login');
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[papers,setPapers]=useState([]),[saved,setSaved]=useState([]),[chosen,setChosen]=useState(null);
 const [loading,setLoading]=useState(false),[notice,setNotice]=useState(''),[health,setHealth]=useState(null),[assistantText,setAssistantText]=useState(''),[assistantAnswer,setAssistantAnswer]=useState(''),[recommendations,setRecommendations]=useState([]),[recommendationReport,setRecommendationReport]=useState(null),[collection,setCollection]=useState(null),[paperFilters,setPaperFilters]=useState({source:'',paper_type:'',year_from:'',year_to:'',sort:'newest',page:1}),[filterOptions,setFilterOptions]=useState({sources:[],paper_types:[],year_range:{}}),[pagination,setPagination]=useState({page:1,total:0,total_pages:0});
 const go=p=>{setPage(p);setError('');setNotice('');};
 const loadPapers=async(q=query,filters=paperFilters)=>{setLoading(true);try{const params=new URLSearchParams({q:q||'',limit:'20',page:String(filters.page||1),sort:filters.sort||'newest'});Object.entries(filters).forEach(([k,v])=>{if(v && !['page','sort'].includes(k))params.set(k,v)});const r=await api(`/papers?${params.toString()}`);setPapers(r.data||[]);setPagination(r.pagination||{page:1,total:0,total_pages:0});}catch(e){setError(e.message);}finally{setLoading(false);}};
 const loadFilterOptions=async()=>{try{const r=await api('/papers/filters');setFilterOptions(r.data||{sources:[],paper_types:[],year_range:{}})}catch(e){console.warn('Could not load paper filters',e)}};
 const loadSaved=async()=>{try{const r=await api('/saved');setSaved((r.data||[]).map(x=>x.id));if(page==='saved')setPapers(r.data||[]);}catch(e){setError(e.message);}};
 useEffect(()=>{loadFilterOptions();api('/health').then(setHealth).catch(e=>setHealth({success:false,database:false,error:e.message}));api('/auth/me').then(r=>{if(r.user)setUser(r.user);}).catch(()=>{});},[]);
 useEffect(()=>{if(user){loadSaved();if(page==='overview'||page==='search')loadPapers(query);}},[user,page]);
 const authSubmit=async e=>{e.preventDefault();setLoading(true);setError('');try{const r=await api(authMode==='signup'?'/auth/signup':'/auth/login',{method:'POST',body:JSON.stringify(authMode==='signup'?{name,email,password}:{email,password})});setUser(r.user);setPage('overview');setPassword('');}catch(e){setError(e.message);}finally{setLoading(false);}};
 const logout=async()=>{try{await api('/auth/logout',{method:'POST',body:'{}'});}catch{}setUser(null);setPage('home');setSaved([]);};
 const search=async()=>{await loadPapers(query);setPage('search');};
 const toggleSave=async p=>{try{if(saved.includes(p.id)){await api('/saved',{method:'DELETE',body:JSON.stringify({paper_id:p.id})});setSaved(v=>v.filter(x=>x!==p.id));}else{await api('/saved',{method:'POST',body:JSON.stringify({paper_id:p.id})});setSaved(v=>[...v,p.id]);}}catch(e){setError(e.message);}};
 const askAssistant=async e=>{e.preventDefault();setLoading(true);setError('');try{const r=await api('/assistant/chat',{method:'POST',body:JSON.stringify({message:assistantText})});setAssistantAnswer(r.answer||'No answer returned.');}catch(e){setError(e.message);}finally{setLoading(false);}};
 const getRecommendations=async()=>{setLoading(true);setError('');try{const r=await api(`/recommendations?topic=${encodeURIComponent(query)}`);setRecommendations(r.data||[]);setRecommendationReport({synthesis:r.synthesis||'',directions:r.research_directions||[]});go('recommendations');}catch(e){setError(e.message);}finally{setLoading(false);}};
 const runCollection=async()=>{setLoading(true);setError('');setNotice('Collection is running. It may take several minutes.');try{const r=await api('/collection/run',{method:'POST',body:'{}'});setCollection(r.output||'Collection completed.');setNotice('Paper collection completed. Refreshing database results.');await loadPapers(query);}catch(e){setError(e.message);setNotice('Collection did not complete. Check the error details below.');}finally{setLoading(false);}};
 if(page==='home')return <Home onStart={()=>go('login')} onDemo={()=>user?go('overview'):go('login')}/>;
 if(page==='login')return <Login onBack={()=>go('home')} onSubmit={authSubmit} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error} name={name} setName={setName} authMode={authMode} setAuthMode={setAuthMode} loading={loading}/>;
 if(!user)return <Login onBack={()=>go('home')} onSubmit={authSubmit} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error||'Please log in to access your workspace.'} name={name} setName={setName} authMode={authMode} setAuthMode={setAuthMode} loading={loading}/>;
 if(page==='pdf-reader'||page==='library')return <PDFWorkspace page={page} go={go}/>;
 return <Workspace page={page} go={go} user={user} logout={logout} query={query} setQuery={setQuery} papers={papers} saved={saved} toggleSave={toggleSave} chosen={chosen} setChosen={setChosen} loading={loading} error={error} notice={notice} health={health} search={search} runCollection={runCollection} collection={collection} assistantText={assistantText} setAssistantText={setAssistantText} assistantAnswer={assistantAnswer} askAssistant={askAssistant} getRecommendations={getRecommendations} recommendations={recommendations} recommendationReport={recommendationReport} loadSaved={loadSaved} paperFilters={paperFilters} setPaperFilters={setPaperFilters} filterOptions={filterOptions} pagination={pagination} loadPapers={loadPapers}/>;
}
function Workspace({page,go,user,logout,query,setQuery,papers,saved,toggleSave,chosen,setChosen,loading,error,notice,health,search,runCollection,collection,assistantText,setAssistantText,assistantAnswer,askAssistant,getRecommendations,recommendations,recommendationReport,loadSaved,paperFilters,setPaperFilters,filterOptions,pagination,loadPapers}){
 const list=page==='saved'?papers.filter(p=>saved.includes(p.id)):page==='recommendations'?recommendations:papers;
 useEffect(()=>{if(page==='saved')loadSaved();},[page]);
 const title={overview:'Research workspace',search:'Find similar papers',saved:'Saved papers',assistant:'Research Assistant',recommendations:'Research recommendations',collection:'Paper collection',help:'Help Desk'}[page]||'Research workspace';
 return <div className="rr-app"><aside className="rr-sidebar"><Brand onClick={()=>go('overview')}/><p className="side-caption">WORKSPACE</p>{[['Overview','overview'],['Find similar papers','search'],['Saved papers','saved'],['Research recommendations','recommendations'],['Research Assistant','assistant'],['Paper collection','collection'],['Help Desk','help']].map(([n,k])=><button className={`side-link ${page===k?'active':''}`} key={k} onClick={()=>go(k)}>{n}</button>)}<p className="side-caption">MY TOOLS</p><button className="side-link" onClick={()=>go('pdf-reader')}>PDF Research Reader</button><button className="side-link" onClick={()=>go('library')}>My Research Library</button><div className="rr-user"><b>{user.name}</b><small>{user.email}</small><button onClick={logout}>Log out</button></div></aside><main className="rr-main"><header className="rr-top"><b>{title}</b><span className={health?.database?'rr-ok':'rr-warn'}>Database: {health?.database?'Connected':'Not connected'}</span></header><section className="rr-body"><h1>{title}</h1>{error&&<div className="rr-error">{error}</div>}{notice&&<div className="rr-notice">{notice}</div>}
 {page==='overview'&&<><p>Search your research topic across papers collected in your MySQL database.</p><SearchForm query={query} setQuery={setQuery} search={search}/><div className="rr-actions"><button onClick={()=>go('collection')}>Collect new papers</button><button onClick={()=>go('assistant')}>Ask AI Research Assistant</button></div><PaperList papers={papers.slice(0,8)} saved={saved} toggleSave={toggleSave} setChosen={setChosen} loading={loading}/></>}
 {page==='search'&&<CyberNoutExplore query={query} setQuery={setQuery} papers={papers} saved={saved} toggleSave={toggleSave} setChosen={setChosen} loading={loading} filters={paperFilters} setFilters={setPaperFilters} options={filterOptions} pagination={pagination} loadPapers={loadPapers} getRecommendations={getRecommendations}/>}
 {page==='saved'&&<PaperList papers={list} saved={saved} toggleSave={toggleSave} setChosen={setChosen} loading={loading}/>}
 {page==='recommendations'&&<><p>AI-ranked papers are selected only from matching records in your database.</p>{recommendationReport?.synthesis&&<article className="rr-answer"><h3>Research landscape synthesis</h3><p>{recommendationReport.synthesis}</p>{recommendationReport.directions?.length>0&&<><h3>Potential research directions</h3><ul>{recommendationReport.directions.map((d,i)=><li key={i}>{typeof d==='string'?d:JSON.stringify(d)}</li>)}</ul></>}</article>}<SearchForm query={query} setQuery={setQuery} search={search}/><button onClick={getRecommendations}>Refresh recommendations</button><PaperList papers={list} saved={saved} toggleSave={toggleSave} setChosen={setChosen} loading={loading}/></>}
 {page==='assistant'&&<><p>Ask questions about research topics and papers indexed in your database.</p><form onSubmit={askAssistant} className="rr-form"><textarea value={assistantText} onChange={e=>setAssistantText(e.target.value)} placeholder="Ask about a research topic, methods, gaps or related papers..." required/><button disabled={loading}>Ask ResearchRadar</button></form>{assistantAnswer&&<article className="rr-answer"><h3>ResearchRadar answer</h3><p>{assistantAnswer}</p></article>}</>}
 {page==='collection'&&<><p>Collect papers from arXiv, OpenAlex, Crossref and PubMed, then import them into MySQL.</p><button onClick={runCollection} disabled={loading}>{loading?'Collecting…':'Run paper collection'}</button>{collection&&<pre className="rr-output">{collection}</pre>}</>}
 {page==='help'&&<HelpDesk/>}
 {chosen&&<div className="rr-modal"><button onClick={()=>setChosen(null)}>Close</button><h2>{chosen.title}</h2><p>{(chosen.authors||[]).join(', ')||'Authors not listed'}</p><p>{chosen.publication_year||''}{chosen.journal?` · ${chosen.journal}`:''}{chosen.publisher?` · ${chosen.publisher}`:''}</p><p>{chosen.abstract||'No abstract available.'}</p><p>Source: {(chosen.sources||[]).join(', ')}{chosen.paper_type?` · ${chosen.paper_type}`:''}</p>{chosen.doi&&<p>DOI: {chosen.doi}</p>}{chosen.paper_url&&<a href={chosen.paper_url} target="_blank" rel="noreferrer">Open source paper</a>}</div>}
 </section></main></div>;
}
function HelpDesk(){
 const [category,setCategory]=useState('Technical issue'),[subject,setSubject]=useState(''),[message,setMessage]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[tickets,setTickets]=useState([]),[adminMode,setAdminMode]=useState(false);
 useEffect(()=>{api('/helpdesk/tickets').then(r=>{setTickets(r.data||[]);setAdminMode(true);}).catch(()=>{});},[]);
 const submit=async e=>{e.preventDefault();setBusy(true);setStatus('');try{const r=await api('/helpdesk/tickets',{method:'POST',body:JSON.stringify({category,subject,message})});setStatus(`Your issue was submitted successfully. Ticket #${r.ticket_id}. The project administrator can review it.`);setSubject('');setMessage('');}catch(err){setStatus(err.message);}finally{setBusy(false);}};
 return <div><h3>Contact the ResearchRadar team</h3><p>Report a problem, request help or share feedback. Your message will be stored as a support ticket for the project administrator.</p><form className="rr-form" onSubmit={submit}><label>Issue type<select value={category} onChange={e=>setCategory(e.target.value)}><option>Technical issue</option><option>Login or account problem</option><option>Paper search or collection</option><option>PDF Research Reader</option><option>AI recommendation or assistant</option><option>Feedback or suggestion</option><option>Other</option></select></label><label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)} required maxLength={180} placeholder="Briefly describe the issue"/></label><label>Message<textarea value={message} onChange={e=>setMessage(e.target.value)} required minLength={10} maxLength={5000} placeholder="Tell us what happened and what you expected…"/></label><button disabled={busy}>{busy?'Sending…':'Send to project team'}</button></form>{status&&<div className="rr-notice">{status}</div>}{adminMode&&<section className="rr-ticket-admin"><h3>Submitted user issues</h3>{tickets.length?tickets.map(t=><article key={t.id}><b>#{t.id} · {t.subject}</b><p>{t.message}</p><small>{t.sender_name} ({t.sender_email}) · {t.category} · {t.status} · {new Date(t.created_at).toLocaleString()}</small></article>):<p>No support tickets have been submitted yet.</p>}</section>}</div>;
}

function CyberNoutExplore({query,setQuery,papers,saved,toggleSave,setChosen,loading,filters,setFilters,options,pagination,loadPapers,getRecommendations}){
 const update=(key,value)=>setFilters(v=>({...v,[key]:value,page:1}));
 const submit=e=>{e.preventDefault();loadPapers(query,{...filters,page:1})};
 const reset=()=>{const clean={source:'',paper_type:'',year_from:'',year_to:'',sort:'newest',page:1};setFilters(clean);loadPapers(query,clean)};
 return <div className="rr-cyber-explore">
  <p>Search the indexed academic collection with the original CyberNout-style source, document type, year and sorting filters.</p>
  <form className="rr-cyber-search" onSubmit={submit}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search paper title, abstract, authors, keywords or DOI..."/><button type="submit" disabled={loading}>Search Papers</button></form>
  <div className="rr-cyber-layout"><aside className="rr-cyber-filters"><h3>Search Filters</h3><label>Academic Source<select value={filters.source} onChange={e=>update('source',e.target.value)}><option value="">All Sources</option>{(options.sources||[]).map(x=><option key={x} value={x}>{String(x).toUpperCase()}</option>)}</select></label><label>Document Type<select value={filters.paper_type} onChange={e=>update('paper_type',e.target.value)}><option value="">All Types</option>{(options.paper_types||[]).map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Publication Year<div className="rr-year-inputs"><input type="number" placeholder="From" value={filters.year_from} onChange={e=>update('year_from',e.target.value)}/><input type="number" placeholder="To" value={filters.year_to} onChange={e=>update('year_to',e.target.value)}/></div></label><label>Sort By<select value={filters.sort} onChange={e=>update('sort',e.target.value)}><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="most_cited">Most Cited</option></select></label><button onClick={()=>loadPapers(query,{...filters,page:1})}>Apply Filters</button><button className="rr-filter-reset" onClick={reset}>Reset Filters</button></aside>
  <div className="rr-cyber-results"><div className="rr-results-head"><b>{pagination.total||0} papers found</b><button onClick={getRecommendations} disabled={!query.trim()}>Recommendations for this topic</button></div>{loading?<p>Searching MySQL database...</p>:!papers.length?<p>No research papers found. Try changing your search or filters.</p>:papers.map(p=><article className="rr-cyber-paper" key={p.id}><div className="rr-cyber-badges">{(p.sources||[]).map(src=><span key={src}>{String(src).toUpperCase()}</span>)}{p.paper_type&&<span>{p.paper_type}</span>}</div><h3>{p.title}</h3><p className="rr-cyber-authors">{(p.authors||[]).slice(0,4).join(', ')||'Authors not specified'}</p>{p.abstract&&<p className="rr-cyber-abstract">{p.abstract}</p>}<div className="rr-cyber-meta">{p.publication_year&&<span>{p.publication_year}</span>}{p.journal&&<span>{p.journal}</span>}{p.doi&&<span>DOI: {p.doi}</span>}{p.citation_count>0&&<span>{Number(p.citation_count).toLocaleString()} citations</span>}</div><div className="rr-cyber-actions"><button onClick={()=>setChosen(p)}>View Details <ArrowUpRight size={13}/></button><button onClick={()=>toggleSave(p)}><Bookmark size={14}/>{saved.includes(p.id)?'Saved':'Save'}</button>{p.paper_url&&<a href={p.paper_url} target="_blank" rel="noreferrer">Open source <ExternalLink size={13}/></a>}{p.pdf_url&&<a href={p.pdf_url} target="_blank" rel="noreferrer" download>Download PDF <Download size={13}/></a>}</div></article>)}
  {!loading&&pagination.total_pages>1&&<div className="rr-cyber-pagination"><button disabled={filters.page<=1} onClick={()=>{const f={...filters,page:filters.page-1};setFilters(f);loadPapers(query,f)}}>Previous</button><span>Page {pagination.page} of {pagination.total_pages}</span><button disabled={filters.page>=pagination.total_pages} onClick={()=>{const f={...filters,page:filters.page+1};setFilters(f);loadPapers(query,f)}}>Next</button></div>}</div></div></div>
}

function SearchForm({query,setQuery,search}){return <form className="rr-search" onSubmit={e=>{e.preventDefault();search();}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter a topic, title or keywords"/><button>Search database</button></form>}
function PaperList({papers,saved,toggleSave,setChosen,loading}){if(loading)return <p>Loading…</p>;if(!papers.length)return <p>No papers found in the database yet. Run collection or try another search.</p>;return <div className="rr-paper-list">{papers.map(p=><article key={p.id} className="rr-paper"><div><h3>{p.title}</h3><p>{(p.authors||[]).join(', ')||'Authors not listed'}</p>{p.publication_year&&<p>{p.publication_year}{p.journal?` ${p.journal}`:''}{p.publisher?` · ${p.publisher}`:''}</p>}<p>{p.abstract||'No abstract available.'}</p>{p.recommendation_reason&&<div className="rr-answer"><b>Why this paper is recommended</b><p>{p.recommendation_reason}</p>{p.topic_alignment&&<p><b>Topic alignment:</b> {p.topic_alignment}</p>}{p.methodology_or_focus&&<p><b>Methodology / focus:</b> {p.methodology_or_focus}</p>}{p.useful_for&&<p><b>Useful for:</b> {p.useful_for}</p>}{p.recommendation_limitations&&<p><b>Limitations / missing details:</b> {p.recommendation_limitations}</p>}{p.reading_priority&&<p><b>Reading priority:</b> {p.reading_priority}{p.relevance_score!=null?` · ${p.relevance_score}% relevance`:''}</p>}</div>}<small>{(p.sources||[]).join(', ')}{p.paper_type?` · ${p.paper_type}`:''}</small>{p.doi&&<small>DOI: {p.doi}</small>}<div><button onClick={()=>setChosen(p)}>Details</button><button onClick={()=>toggleSave(p)}>{saved.includes(p.id)?'Unsave':'Save'}</button>{p.paper_url&&<a href={p.paper_url} target="_blank" rel="noreferrer">Open source</a>}{p.pdf_url&&<a href={p.pdf_url} target="_blank" rel="noreferrer" download>Download PDF</a>}</div></div></article>)}</div>}
function Brand({onClick}){return <button className="brand" onClick={onClick}><span className="brand-icon"><Activity size={21}/></span><span>research<span>radar</span><small>SIMILAR PAPER DISCOVERY</small></span></button>}
function Home({onStart,onDemo}){
 return <div className="home">
  <header className="topnav"><Brand onClick={onDemo}/><div className="nav-actions"><button className="nav-login" onClick={onStart}>Log in</button><button className="primary-btn" onClick={onStart}>Start discovering <ArrowUpRight size={15}/></button></div></header>
  <main>
   <section className="hero">
    <div className="hero-text">
     <h1>Before you begin,<br/>know what's <em>been done.</em></h1>
     <p className="hero-lead">Discover research papers related to your project topic — collected from multiple academic sources and brought together in one place.</p>
     <div className="hero-buttons"><button className="primary-btn large" onClick={onStart}>Find related research <ArrowRight size={17}/></button></div>
     <div className="hero-note"><span className="note-icon"><CheckCircle2 size={15}/></span><span>Explore existing work. Find research gaps. Start with confidence.</span></div>
    </div>
    <div className="hero-visual">
     <div className="visual-glow"></div><div className="visual-grid"></div>
     <div className="search-demo"><div className="demo-label"><span className="pulse"></span> TOPIC EXPLORER <span className="demo-live">LIVE PREVIEW</span></div><div className="demo-query"><Search size={17}/><span>Plant disease detection using AI</span><ArrowRight size={16}/></div>
      <div className="match-label">RELATED PAPERS FOUND <b>Across academic sources</b></div>
      <div className="mini-paper"><div className="paper-symbol"><FileText size={17}/></div><div><b>Deep Learning for Plant Disease Detection</b><small>IEEE Xplore · 2025</small></div><span className="match">96% match</span></div>
      <div className="mini-paper"><div className="paper-symbol blue"><FileText size={17}/></div><div><b>Plant Leaf Classification with CNNs</b><small>ScienceDirect · 2024</small></div><span className="match">92% match</span></div>
      <div className="mini-paper"><div className="paper-symbol violet"><FileText size={17}/></div><div><b>Explainable AI for Crop Health</b><small>SpringerLink · 2024</small></div><span className="match">87% match</span></div>
      <div className="demo-footer"><span><Globe2 size={13}/> Multiple research sources</span><span><Layers3 size={13}/> Similarity-ranked results</span></div>
     </div>
     <div className="float-note float-a"><span className="float-icon"><Network size={16}/></span><div><b>One topic</b><small>Multiple sources</small></div></div>
     <div className="float-note float-b"><span className="float-icon mint"><Sparkles size={16}/></span><div><b>Find connections</b><small>Explore existing ideas</small></div></div>
     <span className="decor-star star1">✳</span><span className="decor-star star2">✦</span>
    </div>
   </section>
   <section className="source-band" id="sources"><span>BRINGING RESEARCH CLOSER FROM</span><div><b>arXiv</b><b>Crossref</b><b>OpenAlex</b><b>PubMed</b><b>IEEE Xplore</b><b>SpringerLink</b></div></section>
   <section className="how-section" id="how"><div className="eyebrow centered">A SIMPLER WAY TO REVIEW EXISTING WORK</div><h2>From your topic to the<br/><em>research that relates.</em></h2><p className="section-intro">No need to visit academic websites one by one. Start with your idea and let ResearchRadar help you explore what's already out there.</p>
    <div className="steps"><Step n="01" icon={<Lightbulb/>} title="Enter your topic" desc="Type your project title, research problem or a few keywords."/><Step n="02" icon={<Globe2/>} title="Search across sources" desc="Find relevant paper records collected from different academic platforms."/><Step n="03" icon={<Network/>} title="Explore similar papers" desc="Review titles, authors, abstracts, publication details and source links."/><Step n="04" icon={<Bookmark/>} title="Save what matters" desc="Keep useful papers together for your literature review." /></div>
   </section>
   <section className="why-section" id="why"><div className="why-copy"><div className="eyebrow pale">MAKE YOUR NEXT STEP A SMARTER ONE</div><h2>Know the work.<br/><em>Find your direction.</em></h2><p>Whether you're choosing a project idea, preparing a literature review or checking if a similar study already exists, ResearchRadar gives you a clearer starting point.</p><button className="light-btn" onClick={onStart}>Explore ResearchRadar <ArrowUpRight size={16}/></button></div><div className="why-art"><div className="circle-lines"></div><div className="center-node"><Activity size={34}/><b>Your topic</b></div><div className="node node1"><FileText/><span>Related paper</span></div><div className="node node2"><FileText/><span>Existing study</span></div><div className="node node3"><FileText/><span>Research gap</span></div><div className="node node4"><FileText/><span>New direction</span></div></div></section>
  </main>
  <footer className="footer"><Brand onClick={onDemo}/><span>Discover existing research. Make room for new ideas.</span><span>© 2026 ResearchRadar</span></footer>
 </div>
}
function Step({n,icon,title,desc}){return <article className="step"><div className="step-top"><span>{n}</span><div>{icon}</div></div><h3>{title}</h3><p>{desc}</p></article>}

function Login({onBack,onSubmit,email,setEmail,password,setPassword,error,name,setName,authMode,setAuthMode,loading}){
 const [show,setShow]=useState(false);
 return <div className="login"><section className="login-art"><Brand onClick={onBack}/><div className="login-art-content"><div className="eyebrow pale">YOUR RESEARCH JOURNEY, IN ONE PLACE</div><h1>Every good idea<br/>builds on <em>what came before.</em></h1><p>Sign in to discover related studies, explore existing work and organise the papers that inspire your next step.</p></div></section><section className="login-panel"><button className="back-btn" onClick={onBack}>← Back to website</button><form className="login-card" onSubmit={onSubmit}><div className="eyebrow">WELCOME TO RESEARCHRADAR</div><h2>{authMode==='signup'?'Create your account':'Sign in to continue'}</h2>{authMode==='signup'&&<><label>Full name</label><div className="field"><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Your name"/></div></>}<label>Email address</label><div className="field"><Mail size={16}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></div><label>Password</label><div className="field"><LockKeyhole size={16}/><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters"/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div>{error&&<div className="error">{error}</div>}<button className="primary-btn submit-btn" disabled={loading}>{loading?'Please wait…':authMode==='signup'?'Create account':'Open my workspace'} <ArrowRight size={16}/></button><p>{authMode==='signup'?'Already registered?':'New to ResearchRadar?'} <button type="button" className="forgot" onClick={()=>setAuthMode(authMode==='signup'?'login':'signup')}>{authMode==='signup'?'Sign in':'Create an account'}</button></p></form></section></div>
}
export default App;

// ---------------- PDF RESEARCH READER + LOCAL RESEARCH LIBRARY ----------------
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const RR_DB = 'researchradar-pdf-library';
const RR_STORE = 'papers';
function openRRDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(RR_DB,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(RR_STORE))db.createObjectStore(RR_STORE,{keyPath:'id'});};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function rrSave(record){
 const db=await openRRDB();return new Promise((resolve,reject)=>{const tx=db.transaction(RR_STORE,'readwrite');tx.objectStore(RR_STORE).put(record);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});
}
async function rrAll(){
 const db=await openRRDB();return new Promise((resolve,reject)=>{const tx=db.transaction(RR_STORE,'readonly');const req=tx.objectStore(RR_STORE).getAll();req.onsuccess=()=>{db.close();resolve(req.result.sort((a,b)=>b.savedAt-a.savedAt));};req.onerror=()=>{db.close();reject(req.error);};});
}
async function rrDelete(id){
 const db=await openRRDB();return new Promise((resolve,reject)=>{const tx=db.transaction(RR_STORE,'readwrite');tx.objectStore(RR_STORE).delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});
}
function cleanPDFText(value=''){
 return value.replace(/\u00a0/g,' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}
function normalizeLine(line=''){
 return line.replace(/\s+/g,' ').replace(/[|•·]+/g,' ').trim();
}
function removeRepeatedPageNoise(lines){
 const counts=new Map();
 for(const line of lines){const k=normalizeLine(line).toLowerCase();if(k.length>3&&k.length<100)counts.set(k,(counts.get(k)||0)+1);}
 return lines.filter(line=>{const k=normalizeLine(line).toLowerCase();return !(counts.get(k)>=3&&(/^(\d{1,4}|page\s+\d+|.*(university|journal|conference|issn|www\.).*)$/i.test(k)||k.length<55));});
}
function stripReferences(text=''){
 const lines=cleanPDFText(text).split(/\r?\n/);
 const refRe=/^(?:\d+(?:\.\d+)*\.?\s*)?(references|bibliography|works cited|literature cited|reference list)\s*$/i;
 const index=lines.findIndex(line=>refRe.test(normalizeLine(line)));
 return lines.slice(0,index<0?lines.length:index).join('\n').trim();
}
function extractSection(text, names){
 const lines=cleanPDFText(text).split(/\r?\n/);let start=-1;
 const match=names.map(n=>new RegExp(`^(?:\\d+(?:\\.\\d+)*\\.?\\s*)?${n}\\s*[:.]?$`,'i'));
 for(let i=0;i<lines.length;i++){if(match.some(re=>re.test(normalizeLine(lines[i])))){start=i+1;break;}}
 if(start<0)return '';
 const stop=/^(?:\d+(?:\.\d+)*\.?\s*)?(abstract|introduction|related work|literature review|background|methodology|methods|proposed method|proposed approach|system design|results|results and discussion|evaluation|discussion|conclusion|conclusions|references|bibliography|acknowledg?ments|appendix(?:es)?)\s*[:.]?$/i;
 let end=lines.length;for(let i=start;i<lines.length;i++){if(stop.test(normalizeLine(lines[i]))){end=i;break;}}
 return lines.slice(start,end).join(' ').replace(/\s+/g,' ').trim();
}
function getAbstract(text){
 const m=text.match(/\babstract\b\s*[:\n]([\s\S]{80,3500}?)(?=\n\s*(?:keywords?|index terms|\d+(?:\.\d+)*\s+introduction|introduction)\b)/i);
 return m?.[1]?.replace(/\s+/g,' ').trim()||extractSection(text,['abstract']);
}
function guessMetadata(text, filename, pdfInfo={}, firstPage=''){
 const lines=cleanPDFText(firstPage||text).split(/\r?\n/).map(normalizeLine).filter(Boolean).slice(0,70);
 const metaTitle=(pdfInfo.Title||'').trim(),metaAuthor=(pdfInfo.Author||'').trim();
 const reject=/^(abstract|introduction|keywords?|index terms|contents|doi|preprint|arxiv|received|accepted|published|copyright|available online|all rights reserved|research article|original article)$/i;
 const candidates=lines.filter(x=>x.length>=14&&x.length<=220&&!reject.test(x)&&!/^https?:|^www\.|^\d+$/.test(x)&&!/@/.test(x)&&!/(university|department|institute|faculty|school of|corresponding author|vol\.|volume\s+\d|issue\s+\d)/i.test(x));
 // Prefer the earliest substantial heading instead of the longest sentence in the document.
 let title=metaTitle;
 if(!title){const firstCandidates=candidates.slice(0,12);title=firstCandidates.find(x=>x.length>=18&&x.length<=160&&!/[.!?]$/.test(x))||firstCandidates[0]||filename.replace(/\.pdf$/i,'');}
 let authors=metaAuthor;
 if(!authors){
  const titleIndex=lines.findIndex(x=>x===title);const region=lines.slice(Math.max(0,titleIndex),Math.max(0,titleIndex)+12);
  const authorLike=region.filter(x=>x!==title&&x.length>=4&&x.length<=180&&!reject.test(x)&&!/@|https?:|www\.|university|department|institute|faculty|abstract|keywords|copyright|received|accepted/i.test(x)&&!/(\b\d{4}\b|\bvol\b|\bdoi\b)/i.test(x));
  const nameLine=authorLike.find(x=>/[,;&*]|\band\b/.test(x)&&/[A-Z][a-z]/.test(x))||authorLike.find(x=>/^[A-Z][a-z]+(?:\s+[A-Z.]?\w+){1,5}(?:,.*)?$/.test(x));
  authors=nameLine||'Author names not confidently detected — please verify';
 }
 const headingNames=/^(abstract|introduction|related work|literature review|background|methodology|methods|proposed method|proposed approach|system design|experiments|results|results and discussion|evaluation|discussion|conclusion|conclusions|references|bibliography|acknowledg?ments)$/i;
 const headings=lines.filter(x=>x.length<100&&(headingNames.test(x)||/^(?:\d+(?:\.\d+)*\.?\s+|[IVX]+\.\s+)([A-Z][A-Za-z0-9 ,:()\-]{2,80})$/.test(x))).filter(x=>!/(tutorialspoint|guru99|nptel|www\.|http)/i.test(x)).slice(0,30);
 return {title,authors,headings};
}
function buildFallbackSummary(text){
 const body=stripReferences(text);
 const abstract=getAbstract(body)||extractSection(body,['introduction']);
 const method=extractSection(body,['methodology','proposed method','proposed approach','materials and methods','methods','system design','approach']);
 const results=extractSection(body,['results and discussion','experimental results','results','evaluation','discussion']);
 const conclusion=extractSection(body,['conclusion','conclusions','conclusion and future work']);
 const sentence=(s,max=650)=>s?`${s.slice(0,max).trim()}${s.length>max?'…':''}`:'';
 return {about:sentence(abstract||body),problem:sentence(extractSection(body,['problem statement','research problem','motivation'])),methodology:sentence(method),findings:sentence([results,conclusion].filter(Boolean).join(' '))};
}
async function extractPDF(file,onProgress){
 const bytes=await file.arrayBuffer();
 const doc=await pdfjsLib.getDocument({data:bytes}).promise;
 const meta=await doc.getMetadata();const pdfInfo=meta?.info||{};
 let fullText='',firstPageText='';
 for(let i=1;i<=doc.numPages;i++){
  const page=await doc.getPage(i);const content=await page.getTextContent();
  const items=content.items.filter(x=>x.str&&x.str.trim()).map(x=>({text:x.str.trim(),x:x.transform?.[4]||0,y:x.transform?.[5]||0,h:Math.abs(x.transform?.[3]||0)}));
  // Group text by baseline, then sort left-to-right. This avoids many scrambled PDF.js text runs.
  const rows=[];
  for(const item of items){let row=rows.find(r=>Math.abs(r.y-item.y)<=2.5);if(!row){row={y:item.y,items:[]};rows.push(row);}row.items.push(item);}
  rows.sort((a,b)=>b.y-a.y);
  const pageLines=rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(v=>v.text).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);
  const cleaned=removeRepeatedPageNoise(pageLines).join('\n');
  if(i===1)firstPageText=cleaned;
  fullText+=`\n\n${cleaned}`;
  onProgress?.(Math.round(i/doc.numPages*40));
 }
 let ocrUsed=false;
 if(fullText.replace(/\s/g,'').length<100){
  ocrUsed=true;const {createWorker}=await import('tesseract.js');const worker=await createWorker('eng');const maxPages=Math.min(doc.numPages,12);const ocrText=[];
  for(let i=1;i<=maxPages;i++){const page=await doc.getPage(i);const viewport=page.getViewport({scale:2});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const result=await worker.recognize(canvas);ocrText.push(result.data.text);onProgress?.(40+Math.round(i/maxPages*50));}
  await worker.terminate();fullText=ocrText.join('\n');firstPageText=ocrText[0]||'';
 }
 const metadata=guessMetadata(fullText,file.name,pdfInfo,firstPageText);
 const abstract=getAbstract(stripReferences(fullText));
 return {...metadata,abstract,rawText:stripReferences(fullText).slice(0,120000),summary:buildFallbackSummary(fullText),pageCount:doc.numPages,ocrUsed,textLength:fullText.length};
}
async function requestAISummary(result){
 const response=await fetch('/api/reader/analyze',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:result.rawText,filename:result.title+'.pdf'})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||payload.success===false)throw new Error(payload.error||`AI analysis service returned ${response.status}`);
 const a=payload.analysis||{};
 if(!a.research_summary&&!a.paper_overview)throw new Error('The AI service did not return a research summary. Please retry.');
 return {isResearchPaper:a.is_research_paper,summary:{full:a.research_summary||a.paper_overview,about:a.paper_overview||'Not stated in the provided paper text.',problem:a.problem_statement||'',methodology:a.methodology||'',findings:a.key_findings||''},analysis:a};
}
function PDFWorkspace({page,go}){
 const [file,setFile]=useState(null),[data,setData]=useState(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState(''),[papers,setPapers]=useState([]),[loadingLibrary,setLoadingLibrary]=useState(true),[search,setSearch]=useState(''),[selected,setSelected]=useState(null);
 const [edited,setEdited]=useState({});
 const loadLibrary=async()=>{try{setPapers(await rrAll());}catch(e){setError('Could not open local library. Please use a modern browser with IndexedDB enabled.');}finally{setLoadingLibrary(false);}};
 useEffect(()=>{loadLibrary();},[]);
 const updateField=(key,value)=>setEdited(v=>({...v,[key]:value}));
 const handleFile=async f=>{
  if(!f)return;setError('');setNotice('');setData(null);
  if(f.type!=='application/pdf'&&!f.name.toLowerCase().endsWith('.pdf')){setError('Please choose a PDF file.');return;}
  if(f.size>30*1024*1024){setError('Please choose a PDF smaller than 30 MB.');return;}
  setFile(f);setBusy(true);setProgress(0);
  try{let result=await extractPDF(f,setProgress);setProgress(75);try{const ai=await requestAISummary(result);result={...result,...ai,aiAnalyzed:true};setNotice('Paper sections are ready to review. Please verify the extracted details.');}catch(aiError){console.warn('Paper section analysis could not be completed:',aiError);result={...result,aiAnalyzed:false,summary:{full:result.summary.about,about:result.summary.about,problem:result.summary.problem,methodology:result.summary.methodology,findings:result.summary.findings}};}setData(result);setEdited({title:result.title,authors:result.authors,abstract:result.abstract});}
  catch(e){console.error(e);setError('Could not read this PDF. It may be encrypted, damaged, or unsupported.');}
  finally{setBusy(false);setProgress(100);}
 };
 const savePaper=async()=>{
  if(!file||!data)return;
  try{
   const record={id:`pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`,name:file.name,fileBlob:file, title:edited.title||data.title,authors:edited.authors||data.authors,abstract:edited.abstract||data.abstract,summary:data.summary,headings:data.headings,pageCount:data.pageCount,ocrUsed:data.ocrUsed,isResearchPaper:data.isResearchPaper,aiAnalyzed:data.aiAnalyzed,savedAt:Date.now()};
   await rrSave(record);await loadLibrary();setNotice('Saved to My Research Library on this browser.'); 
  }catch(e){setError('Could not save this PDF. Your browser storage may be full.');}
 };
 const openSaved=async item=>{
  setSelected(item);
  if(item.fileBlob){const url=URL.createObjectURL(item.fileBlob);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);}
 };
 const removePaper=async id=>{await rrDelete(id);setPapers(await rrAll());if(selected?.id===id)setSelected(null);};
 const filtered=papers.filter(p=>`${p.title} ${p.authors} ${p.name}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="dashboard rr-pdf-dashboard">
  <aside className="sidebar"><Brand onClick={()=>go('home')}/><div className="side-caption">WORKSPACE</div>
   <button className="side-link" onClick={()=>go('overview')}><PanelTop size={17}/>Overview</button>
   <button className="side-link" onClick={()=>go('search')}><Search size={17}/>Find similar papers</button>
   <button className="side-link" onClick={()=>go('saved')}><Bookmark size={17}/>Saved papers</button>
   <div className="side-caption rr-extra-caption">MY TOOLS</div>
   <button className={`side-link ${page==='pdf-reader'?'active':''}`} onClick={()=>go('pdf-reader')}><FileSearch size={17}/>PDF Research Reader</button>
   <button className={`side-link ${page==='library'?'active':''}`} onClick={()=>go('library')}><Library size={17}/>My Research Library<small>{papers.length}</small></button>
   <div className="side-bottom"><div className="side-help"><CircleHelp size={17}/><b>PDF reader tip</b><p>Text-based PDFs give the most accurate extraction. Always verify the extracted details.</p></div><button className="side-link" onClick={()=>go('home')}><ArrowUpRight size={16}/>Back to website</button><div className="profile"><div>RS</div><span><b>Research Student</b><small>My workspace</small></span></div></div>
  </aside>
  <main className="dash-main"><header className="dash-header"><span>Workspace <i>/</i> {page==='library'?'My Research Library':'PDF Research Reader'}</span><div className="header-right"><span><i/> Stored in this browser</span><div className="profile-round">RS</div></div></header>
   <div className="dash-content rr-content">
    <div className="welcome"><div><div className="eyebrow">RESEARCH PAPER TOOLS</div><h1>{page==='library'?'My Research Library':'PDF Research Reader'}<em>.</em></h1><p>{page==='library'?'Your uploaded papers and extracted research details.':'Upload a paper to extract its key academic information.'}</p></div><div className="welcome-art"><FileSearch size={28}/></div></div>
    {error&&<div className="rr-alert rr-error"><AlertCircle size={16}/>{error}</div>}
    {notice&&<div className="rr-alert rr-success"><Check size={16}/>{notice}</div>}
    {page==='pdf-reader'?<>
     <section className="rr-upload-card">
      <div className="rr-section-title"><div className="rr-icon"><Upload size={19}/></div><div><h2>Upload research paper</h2><p>Choose a PDF from your device. Maximum file size: 30 MB.</p></div></div>
      <label className="rr-dropzone" htmlFor="rr-pdf-input" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files?.[0]);}}><FileUp size={29}/><b>{file?file.name:'Drop your PDF here or browse files'}</b><span>PDF files only · Text-based and scanned PDFs</span><input id="rr-pdf-input" type="file" accept="application/pdf,.pdf" onChange={e=>handleFile(e.target.files?.[0])}/></label>
      {busy&&<div className="rr-progress"><div><LoaderCircle size={16} className="rr-spin"/> {progress<40?'Reading and organizing PDF text…':progress<75?'Extracting document structure…':'Organizing research paper sections…'} <b>{progress}%</b></div><span><i style={{width:`${progress}%`}}/></span></div>}
     </section>
     {data&&<section className="rr-extracted">
      <div className="rr-section-heading"><div><div className="eyebrow">EXTRACTED PAPER DETAILS</div><h2>Review extracted information</h2><p>Some PDF layouts may require manual correction. You can edit the main fields before saving.</p></div><button className="primary-btn" onClick={savePaper}><Bookmark size={15}/>Save to library</button></div>
      <div className="rr-meta-grid">
       <label><span>Paper title</span><textarea rows="2" value={edited.title??data.title} onChange={e=>updateField('title',e.target.value)}/></label>
       <label><span>Authors</span><textarea rows="2" value={edited.authors??data.authors} onChange={e=>updateField('authors',e.target.value)}/></label>
       <label className="rr-wide"><span>Abstract</span><textarea rows="5" value={edited.abstract??data.abstract} onChange={e=>updateField('abstract',e.target.value)}/></label>
      </div>
      <div className="rr-info-row"><span><FileText size={14}/>{data.pageCount} pages</span><span><ScanText size={14}/>{data.ocrUsed?'OCR used':'Text extracted'}</span><span>{data.headings.length} section headings detected</span></div>
      {data.summary?<div className="rr-summary">
       <div className="eyebrow">PAPER REVIEW</div><h2>Research paper overview</h2>
       <p className="rr-summary-note">Key details organized from the uploaded research paper.</p>
       {data.summary.full&&<section><h3>Research Paper Summary</h3><p>{data.summary.full}</p></section>}{data.summary.about&&<section><h3>About the Paper</h3><p>{data.summary.about}</p></section>}
       {data.summary.problem&&<section><h3>Problem Statement</h3><p>{data.summary.problem}</p></section>}{data.summary.methodology&&<section><h3>Working Methodology</h3><p>{data.summary.methodology}</p></section>}{data.summary.findings&&<section><h3>Key Findings</h3><p>{data.summary.findings}</p></section>}
       <small><Check size={13}/> Source: uploaded PDF only · No web-scraped paper content is used.</small>
      </div>:null}
      <div className="rr-detail-columns"><section><h3>Detected Headings</h3>{data.headings.length?<ol>{data.headings.map((h,i)=><li key={i}>{h}</li>)}</ol>:<p className="rr-muted">No clear headings detected.</p>}</section></div>
     </section>}
    </>:<>
     <section className="rr-library-toolbar"><div className="rr-search"><Search size={17}/><input placeholder="Search title, author or filename…" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="primary-btn" onClick={()=>go('pdf-reader')}><Upload size={15}/>Upload PDF</button></section>
     {loadingLibrary?<div className="rr-empty"><LoaderCircle className="rr-spin"/><b>Loading your library…</b></div>:filtered.length===0?<div className="rr-empty"><FolderOpen size={30}/><b>{papers.length?'No matching papers':'Your library is empty'}</b><span>{papers.length?'Try another search term.':'Upload a research PDF and save its extracted details here.'}</span><button className="primary-btn" onClick={()=>go('pdf-reader')}>Upload your first PDF <ArrowRight size={15}/></button></div>:
      <div className="rr-library-grid">{filtered.map(p=><article className="rr-library-card" key={p.id}><div className="rr-card-top"><div className="rr-pdf-icon"><FileText size={21}/></div><button className="rr-delete" title="Delete paper" onClick={()=>removePaper(p.id)}><Trash2 size={16}/></button></div><h3>{p.title}</h3><p className="rr-authors">{p.authors}</p><p className="rr-file-name">{p.name}</p><div className="rr-card-meta"><span>{p.pageCount} pages</span><span>{new Date(p.savedAt).toLocaleDateString()}</span></div><div className="rr-card-actions"><button onClick={()=>openSaved(p)}><Download size={14}/>Open PDF</button><button onClick={()=>setSelected(p)}>Details <ChevronRight size={14}/></button></div></article>)}</div>}
     {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="paper-modal rr-details-modal" onClick={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setSelected(null)}><X/></button><span className="modal-tag">SAVED RESEARCH PAPER</span><h2>{selected.title}</h2><p className="authors">{selected.authors}</p><h3>About the Paper</h3><p>{selected.summary?.about||selected.abstract}</p>{selected.summary?.problem&&<><h3>Problem Statement</h3><p>{selected.summary.problem}</p></>}{selected.summary?.methodology&&<><h3>Working Methodology</h3><p>{selected.summary.methodology}</p></>}{selected.summary?.findings&&<><h3>Key Findings</h3><p>{selected.summary.findings}</p></>}<div className="modal-actions"><button className="secondary-btn" onClick={()=>openSaved(selected)}><Download size={15}/>Open PDF</button><button className="primary-btn" onClick={()=>removePaper(selected.id)}>Delete paper</button></div></div></div>}
    </>}
    <footer className="dash-footer">ResearchRadar <span>PDF extraction runs locally in your browser. Files stay in this browser's storage.</span></footer>
   </div>
  </main>
 </div>;
}
