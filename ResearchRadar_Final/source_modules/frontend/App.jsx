import React, {useEffect, useMemo, useState} from 'react';
import {Activity, ArrowRight, ArrowUpRight, Search, FileText, BookOpen, Bookmark, SlidersHorizontal, Menu, X, LockKeyhole, Mail, Sparkles, ExternalLink, Network, Database, Layers3, CheckCircle2, ChevronDown, GraduationCap, Microscope, Lightbulb, Clock3, Quote, Globe2, Filter, PanelTop, CircleHelp, Upload, FolderOpen, FileUp, FileSearch, Trash2, Download, LoaderCircle, AlertCircle, Check, ChevronRight, ScanText, Library, RotateCcw} from 'lucide-react';

const papers = [
{id:1,title:'A Survey of Deep Learning Techniques for Plant Disease Detection',authors:'K. Sharma, R. Patel, M. Das',source:'IEEE Xplore',year:2025,match:96,topic:'Deep Learning · Agriculture',abstract:'This paper reviews deep learning architectures used to identify plant diseases from leaf images. It compares convolutional neural networks, datasets and evaluation methods.',doi:'10.1109/example.2025.001'},
{id:2,title:'Plant Leaf Disease Classification Using Convolutional Neural Networks',authors:'A. Kumar, S. Mehta',source:'ScienceDirect',year:2024,match:92,topic:'Image Classification · Agriculture',abstract:'A classification approach for detecting common plant leaf diseases using image preprocessing and convolutional neural networks.',doi:'10.1016/example.2024.014'},
{id:3,title:'An Explainable AI Framework for Early Crop Disease Identification',authors:'P. Nair, J. Thomas, L. Wang',source:'SpringerLink',year:2024,match:87,topic:'Explainable AI · Agriculture',abstract:'The work explores interpretable machine learning methods that help explain crop disease predictions and support early intervention.',doi:'10.1007/example.2024.031'},
{id:4,title:'A Comparative Study of Machine Learning Models for Leaf Disease Recognition',authors:'D. Roy, N. Iyer',source:'arXiv',year:2023,match:81,topic:'Machine Learning · Computer Vision',abstract:'A comparison of traditional machine learning and deep learning models for classifying leaf disease images under varying image conditions.',doi:'arXiv:2305.01234'},
{id:5,title:'Smart Agriculture: Image-Based Plant Health Monitoring',authors:'M. Lee, A. Joseph, T. Bose',source:'PubMed Central',year:2023,match:76,topic:'Smart Agriculture · Computer Vision',abstract:'A system-level study of image-based plant health monitoring and its role in precision agriculture workflows.',doi:'PMC:example-2023-52'}
];

function App(){
 const [page,setPage]=useState('home'),[query,setQuery]=useState(''),[searched,setSearched]=useState(false),[saved,setSaved]=useState([2]),[filter,setFilter]=useState('All sources'),[chosen,setChosen]=useState(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[menu,setMenu]=useState(false);
 const results=useMemo(()=>papers.filter(p=>(filter==='All sources'||p.source===filter)&&(!searched||!query||`${p.title} ${p.authors} ${p.topic} ${p.abstract}`.toLowerCase().includes(query.toLowerCase())||query.toLowerCase().includes('plant'))),[filter,searched,query]);
 const go=p=>{setPage(p);setMenu(false)};
 const signIn=e=>{e.preventDefault();if(!email||!password){setError('Enter your email and password to continue.');return}setError('');go('dashboard')};
 if(page==='home')return <Home onStart={()=>go('login')} onDemo={()=>go('dashboard')}/>;
 if(page==='login')return <Login onBack={()=>go('home')} onSubmit={signIn} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error}/>;
 if(page==='pdf-reader'||page==='library')return <PDFWorkspace page={page} go={go}/>;
 return <Dashboard page={page} go={go} query={query} setQuery={setQuery} searched={searched} setSearched={setSearched} results={results} saved={saved} setSaved={setSaved} filter={filter} setFilter={setFilter} chosen={chosen} setChosen={setChosen} menu={menu} setMenu={setMenu}/>;
}

function Brand({onClick}){return <button className="brand" onClick={onClick}><span className="brand-icon"><Activity size={21}/></span><span>research<span>radar</span><small>SIMILAR PAPER DISCOVERY</small></span></button>}
function Home({onStart,onDemo}){
 return <div className="home">
  <header className="topnav"><Brand onClick={onDemo}/><nav><a href="#how">How it works</a><a href="#sources">Sources</a><a href="#why">Why ResearchRadar</a></nav><div className="nav-actions"><button className="nav-login" onClick={onStart}>Log in</button><button className="primary-btn" onClick={onStart}>Start discovering <ArrowUpRight size={15}/></button></div></header>
  <main>
   <section className="hero">
    <div className="hero-text"><div className="eyebrow"><span/> RESEARCH STARTS WITH WHAT ALREADY EXISTS</div>
     <h1>Before you begin,<br/>know what's <em>been done.</em></h1>
     <p className="hero-lead">Discover research papers related to your project topic — collected from multiple academic sources and brought together in one place.</p>
     <div className="hero-buttons"><button className="primary-btn large" onClick={onStart}>Find related research <ArrowRight size={17}/></button><a href="#how" className="quiet-link">See how it works <span>↓</span></a></div>
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

function Login({onBack,onSubmit,email,setEmail,password,setPassword,error}){
 const [show,setShow]=useState(false);
 return <div className="login"><section className="login-art"><Brand onClick={onBack}/><div className="login-art-content"><div className="eyebrow pale">YOUR RESEARCH JOURNEY, IN ONE PLACE</div><h1>Every good idea<br/>builds on <em>what came before.</em></h1><p>Sign in to discover related studies, explore existing work and organise the papers that inspire your next step.</p><div className="login-art-tags"><span><Search size={14}/> Topic search</span><span><Network size={14}/> Similar papers</span><span><Bookmark size={14}/> Saved research</span></div></div><div className="login-art-bottom">ResearchRadar <span>Discover · Compare · Explore</span></div></section>
 <section className="login-panel"><button className="back-btn" onClick={onBack}>← Back to website</button><form className="login-card" onSubmit={onSubmit}><div className="login-mark"><LockKeyhole size={20}/></div><div className="eyebrow">WELCOME TO RESEARCHRADAR</div><h2>Sign in to continue</h2><p>Access your research discovery workspace.</p><label>Email address</label><div className="field"><Mail size={16}/><input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div><label>Password</label><div className="field"><LockKeyhole size={16}/><input type={show?'text':'password'} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div><div className="form-row"><label className="remember"><input type="checkbox"/> Remember me</label><button type="button" className="forgot" onClick={()=>alert('Password recovery can be connected with authentication later.')}>Forgot password?</button></div>{error&&<div className="error">{error}</div>}<button className="primary-btn submit-btn">Open my workspace <ArrowRight size={16}/></button><div className="or"><span/>OR<span/></div><button type="button" className="demo-btn" onClick={onSubmit}>Continue with demo account</button><div className="login-foot">New here? <button type="button" onClick={onSubmit}>Create an account</button></div><div className="secure"><CheckCircle2 size={13}/> Your research workspace, neatly organised.</div></form></section></div>
}

function Dashboard({page,go,query,setQuery,searched,setSearched,results,saved,setSaved,filter,setFilter,chosen,setChosen,menu,setMenu}){
 const [sort,setSort]=useState('Most relevant');
 const nav=[['Overview','overview',PanelTop],['Find similar papers','search',Search],['Saved papers','saved',Bookmark]];
 const shown=page==='saved'?results.filter(p=>saved.includes(p.id)):results;
 const runSearch=()=>{setSearched(true);go('search')};
 return <div className="dashboard"><aside className={`sidebar ${menu?'open':''}`}><Brand onClick={()=>go('home')}/><div className="side-caption">WORKSPACE</div>{nav.map(([name,key,Icon])=><button key={key} className={`side-link ${page===key?'active':''}`} onClick={()=>go(key)}><Icon size={17}/>{name}{key==='saved'&&<small>{saved.length}</small>}</button>)}<div className="side-caption rr-extra-caption">MY TOOLS</div><button className="side-link" onClick={()=>go('pdf-reader')}><FileSearch size={17}/>PDF Research Reader</button><button className="side-link" onClick={()=>go('library')}><Library size={17}/>My Research Library</button><div className="side-bottom"><div className="side-help"><CircleHelp size={17}/><b>Research tip</b><p>Try different keywords to discover papers that approach your topic from another angle.</p></div><button className="side-link" onClick={()=>go('home')}><ArrowUpRight size={16}/> Back to website</button><div className="profile"><div>RS</div><span><b>Research Student</b><small>My workspace</small></span><ChevronDown size={15}/></div></div></aside>
 {menu&&<div className="scrim" onClick={()=>setMenu(false)}/>}<main className="dash-main"><header className="dash-header"><button className="mobile-menu" onClick={()=>setMenu(true)}><Menu/></button><span>Workspace <i>/</i> {nav.find(x=>x[1]===page)?.[0]||'Overview'}</span><div className="header-right"><span><i/> Demo workspace</span><div className="profile-round">RS</div></div></header>
 <div className="dash-content"><div className="welcome"><div><div className="eyebrow">YOUR RESEARCH DISCOVERY SPACE</div><h1>{page==='saved'?'Your saved papers':page==='search'?'Find research related to your topic':'Start with your research topic'}<em>.</em></h1><p>{page==='saved'?'A collection of studies you want to revisit.': 'Discover existing studies before you take your project further.'}</p></div><div className="welcome-art"><Microscope size={28}/></div></div>
 {page==='overview'&&<div className="overview-note"><div className="overview-icon"><Sparkles/></div><div><b>Have a project idea in mind?</b><span>Search your topic to see what researchers have already explored.</span></div><button onClick={()=>go('search')}>Find similar papers <ArrowRight size={15}/></button></div>}
 <section className="search-box"><div className="search-heading"><div className="eyebrow">TOPIC-BASED PAPER DISCOVERY</div><h2>What are you researching?</h2><p>Enter your project title, topic or keywords to find related existing papers.</p></div><div className="big-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()} placeholder="e.g. AI-based plant disease detection"/><button onClick={runSearch}>Search papers <ArrowRight size={15}/></button></div><div className="suggestions"><span>POPULAR TOPICS</span>{['Machine learning','Cybersecurity','Medical image analysis','Renewable energy'].map(t=><button onClick={()=>{setQuery(t);setSearched(true);go('search')}} key={t}>{t}</button>)}</div></section>
 <div className="results-head"><div><div className="eyebrow">{page==='saved'?'YOUR READING LIST':'DISCOVERY RESULTS'}</div><h2>{page==='saved'?'Saved research':searched?'Papers related to your topic':'Example related papers'}</h2><p>{searched?`Showing sample matches for “${query||'your topic'}”`:'Example results to demonstrate how related papers will appear.'}</p></div><div className="result-controls"><div className="select-wrap"><Filter size={14}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All sources</option><option>IEEE Xplore</option><option>ScienceDirect</option><option>SpringerLink</option><option>arXiv</option><option>PubMed Central</option></select><ChevronDown size={13}/></div><div className="select-wrap"><select value={sort} onChange={e=>setSort(e.target.value)}><option>Most relevant</option><option>Newest first</option></select><ChevronDown size={13}/></div></div></div>
 <div className="source-chips"><span><Globe2 size={13}/> SOURCES</span><b>IEEE Xplore</b><b>ScienceDirect</b><b>SpringerLink</b><b>arXiv</b><b>PubMed</b></div>
 <div className="paper-list">{[...shown].sort((a,b)=>sort==='Newest first'?b.year-a.year:b.match-a.match).map(p=><article className="paper-card" key={p.id}><div className="paper-file"><FileText size={19}/></div><div className="paper-info"><div className="paper-meta"><span>{p.source}</span><i/>{p.year}<i/> {p.topic}</div><button className="paper-title" onClick={()=>setChosen(p)}>{p.title}</button><p className="authors">{p.authors}</p><p className="abstract">{p.abstract}</p><div className="paper-bottom"><span><BookOpen size={13}/> Abstract available</span><span><ExternalLink size={13}/> Source: {p.source}</span><button onClick={()=>setChosen(p)}>View details <ArrowUpRight size={13}/></button></div></div><div className="paper-side"><div className="match-score"><b>{p.match}%</b><small>topic match</small></div><button className={`save-btn ${saved.includes(p.id)?'is-saved':''}`} onClick={()=>setSaved(s=>s.includes(p.id)?s.filter(x=>x!==p.id):[...s,p.id])}><Bookmark size={16} fill={saved.includes(p.id)?'currentColor':'none'}/></button></div></article>)}{shown.length===0&&<div className="empty"><Search/><b>No saved papers here yet</b><span>Explore related papers and save the ones you want to revisit.</span><button onClick={()=>go('search')}>Explore papers</button></div>}</div>
 <footer className="dash-footer">ResearchRadar <span>Discover existing work. Make room for new ideas.</span></footer>
 </div></main>
 {chosen&&<div className="modal-backdrop" onClick={()=>setChosen(null)}><div className="paper-modal" onClick={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setChosen(null)}><X/></button><span className="modal-tag">{chosen.source} · {chosen.year}</span><h2>{chosen.title}</h2><p className="authors">{chosen.authors}</p><div className="modal-match">{chosen.match}% topic match</div><h3>Abstract</h3><p>{chosen.abstract}</p><div className="doi">Reference ID: {chosen.doi}</div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setSaved(s=>s.includes(chosen.id)?s.filter(x=>x!==chosen.id):[...s,chosen.id])}><Bookmark size={15}/>{saved.includes(chosen.id)?'Remove saved':'Save paper'}</button><button className="primary-btn" onClick={()=>alert('The live paper URL will be provided by the connected source.')}>Open source <ExternalLink size={15}/></button></div></div></div>}
 </div>
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
 const sentence=(s,max=650)=>s?`${s.slice(0,max).trim()}${s.length>max?'…':''}`:'Not clearly identified in the uploaded PDF.';
 return {about:sentence(abstract||body),problem:'Not reliably identified. Use the AI analysis service to interpret the research motivation from the full paper.',methodology:sentence(method),findings:sentence([results,conclusion].filter(Boolean).join(' '))};
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
 const response=await fetch('/api/analyze-paper',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:result.rawText,title:result.title,authors:result.authors})});
 if(!response.ok){const payload=await response.json().catch(()=>({}));throw new Error(payload.error||`AI analysis service returned ${response.status}`);}
 return response.json();
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
  try{let result=await extractPDF(f,setProgress);setProgress(75);try{const ai=await requestAISummary(result);result={...result,...ai,aiAnalyzed:true};setNotice(ai.isResearchPaper===false?'This document does not appear to be a research paper. The reader has not invented research findings.':'AI analysis completed using the uploaded PDF text. Please verify the detected metadata.');}catch(aiError){console.warn('AI analysis unavailable:',aiError);result={...result,aiAnalyzed:false,analysisError:aiError.message,summary:{about:'AI analysis is not configured. Add your AI provider settings to the server .env file to generate a reliable summary.',problem:'Not analyzed. No research problem will be guessed from extracted fragments.',methodology:'Not analyzed. Configure the AI service to identify the paper\'s actual methodology.',findings:'Not analyzed. No findings will be invented.'}};setNotice('PDF text extracted, but AI analysis is not configured or unavailable. Add the server API settings described in README to generate a reliable summary.');}setData(result);setEdited({title:result.title,authors:result.authors,abstract:result.abstract});}
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
      {busy&&<div className="rr-progress"><div><LoaderCircle size={16} className="rr-spin"/> {progress<40?'Reading and organizing PDF text…':progress<75?'Extracting document structure…':'Analyzing paper content with AI…'} <b>{progress}%</b></div><span><i style={{width:`${progress}%`}}/></span></div>}
     </section>
     {data&&<section className="rr-extracted">
      <div className="rr-section-heading"><div><div className="eyebrow">EXTRACTED PAPER DETAILS</div><h2>Review extracted information</h2><p>Some PDF layouts may require manual correction. You can edit the main fields before saving.</p></div><button className="primary-btn" onClick={savePaper}><Bookmark size={15}/>Save to library</button></div>
      <div className="rr-meta-grid">
       <label><span>Paper title</span><textarea rows="2" value={edited.title??data.title} onChange={e=>updateField('title',e.target.value)}/></label>
       <label><span>Authors</span><textarea rows="2" value={edited.authors??data.authors} onChange={e=>updateField('authors',e.target.value)}/></label>
       <label className="rr-wide"><span>Abstract</span><textarea rows="5" value={edited.abstract??data.abstract} onChange={e=>updateField('abstract',e.target.value)}/></label>
      </div>
      <div className="rr-info-row"><span><FileText size={14}/>{data.pageCount} pages</span><span><ScanText size={14}/>{data.ocrUsed?'OCR used':'Text extracted'}</span><span>{data.headings.length} section headings detected</span></div>
      <div className="rr-summary">
       <div className="eyebrow">SUMMARY OF THE UPLOADED PDF</div><h2>{data.isResearchPaper===false?'Document analysis':'Research paper summary'}</h2>
       <p className="rr-summary-note">{data.aiAnalyzed?'AI-generated from the uploaded PDF content. References and bibliography are excluded.':'AI analysis is not active. This is only a text-extraction fallback; do not treat it as a verified research summary.'}</p>
       <section><h3>1. About the Paper</h3><p>{data.summary.about}</p></section>
       <section><h3>2. Problem Statement</h3><p>{data.summary.problem}</p></section>
       <section><h3>3. Working Methodology</h3><p>{data.summary.methodology}</p></section>
       <section><h3>4. Key Findings</h3><p>{data.summary.findings}</p></section>
       <small><Check size={13}/> Source: uploaded PDF only · No web-scraped paper content is used.</small>
      </div>
      <div className="rr-detail-columns"><section><h3>Detected Headings</h3>{data.headings.length?<ol>{data.headings.map((h,i)=><li key={i}>{h}</li>)}</ol>:<p className="rr-muted">No clear headings detected.</p>}</section></div>
     </section>}
    </>:<>
     <section className="rr-library-toolbar"><div className="rr-search"><Search size={17}/><input placeholder="Search title, author or filename…" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="primary-btn" onClick={()=>go('pdf-reader')}><Upload size={15}/>Upload PDF</button></section>
     {loadingLibrary?<div className="rr-empty"><LoaderCircle className="rr-spin"/><b>Loading your library…</b></div>:filtered.length===0?<div className="rr-empty"><FolderOpen size={30}/><b>{papers.length?'No matching papers':'Your library is empty'}</b><span>{papers.length?'Try another search term.':'Upload a research PDF and save its extracted details here.'}</span><button className="primary-btn" onClick={()=>go('pdf-reader')}>Upload your first PDF <ArrowRight size={15}/></button></div>:
      <div className="rr-library-grid">{filtered.map(p=><article className="rr-library-card" key={p.id}><div className="rr-card-top"><div className="rr-pdf-icon"><FileText size={21}/></div><button className="rr-delete" title="Delete paper" onClick={()=>removePaper(p.id)}><Trash2 size={16}/></button></div><h3>{p.title}</h3><p className="rr-authors">{p.authors}</p><p className="rr-file-name">{p.name}</p><div className="rr-card-meta"><span>{p.pageCount} pages</span><span>{new Date(p.savedAt).toLocaleDateString()}</span></div><div className="rr-card-actions"><button onClick={()=>openSaved(p)}><Download size={14}/>Open PDF</button><button onClick={()=>setSelected(p)}>Details <ChevronRight size={14}/></button></div></article>)}</div>}
     {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="paper-modal rr-details-modal" onClick={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setSelected(null)}><X/></button><span className="modal-tag">SAVED RESEARCH PAPER</span><h2>{selected.title}</h2><p className="authors">{selected.authors}</p><h3>About the Paper</h3><p>{selected.summary?.about||selected.abstract}</p><h3>Problem Statement</h3><p>{selected.summary?.problem||'Not available in this saved version.'}</p><h3>Working Methodology</h3><p>{selected.summary?.methodology||'Not available in this saved version.'}</p><h3>Key Findings</h3><p>{selected.summary?.findings||'Not available in this saved version.'}</p><div className="modal-actions"><button className="secondary-btn" onClick={()=>openSaved(selected)}><Download size={15}/>Open PDF</button><button className="primary-btn" onClick={()=>removePaper(selected.id)}>Delete paper</button></div></div></div>}
    </>}
    <footer className="dash-footer">ResearchRadar <span>PDF extraction runs locally in your browser. Files stay in this browser's storage.</span></footer>
   </div>
  </main>
 </div>;
}
