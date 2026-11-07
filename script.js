/* Sesli Kitap V2 — Vanilla JS, local PDF processing */
'use strict';
if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const $ = id => document.getElementById(id);
const state = {pdf:null,file:null,bookId:null,numPages:0,currentPage:0,pageTextCache:new Map(),sentences:[],currentSentenceIndex:0,isPlaying:false,rate:1,pitch:1,voice:null,transition:0,speechToken:0};
const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const el = {pdfInput:$('pdf-input'),statusText:$('status-text'),readerSection:$('reader-view'),pageIndicator:$('page-indicator'),prevPageBtn:$('prev-page-btn'),nextPageBtn:$('next-page-btn'),textDisplay:$('text-display'),prevSentenceBtn:$('prev-sentence-btn'),nextSentenceBtn:$('next-sentence-btn'),playPauseBtn:$('play-pause-btn'),rateSlider:$('rate-slider'),rateValue:$('rate-value'),pitchSlider:$('pitch-slider'),pitchValue:$('pitch-value'),voiceSelect:$('voice-select'),autoPageCheckbox:$('auto-page-checkbox'),playerStatus:$('player-status')};
let wakeLock=null,toastTimer=null;
const getSafe = key=>{try{return localStorage.getItem(key)}catch{return null}};
const setSafe = (key,value)=>{try{localStorage.setItem(key,String(value))}catch{}};
function toast(message){el.statusText.textContent=message;el.statusText.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.statusText.hidden=true,5000)}
function playerMessage(message){el.playerStatus.textContent=message}
function setView(view){if(view==='reader'&&!state.pdf)playerMessage('Dinlemek için önce bir PDF açabilirsiniz.');['home','library','reader'].forEach(v=>$(v+'-view').hidden=v!==view);document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);if(b.classList.contains('nav-link'))b.setAttribute('aria-current',active?'page':'false')});window.scrollTo({top:0,behavior:'instant'});if(view==='library')renderLibrary()}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
$('home-link').addEventListener('click',e=>{e.preventDefault();setView('home')});
['header-upload-btn','hero-upload-btn','library-upload-btn','empty-upload-btn','reader-upload-btn'].forEach(id=>$(id).addEventListener('click',()=>el.pdfInput.click()));
// Store original PDF bytes on this device, not on a server. Older V2 books
// may only have metadata; those need a one-time re-import.
const PDF_DB_NAME='sesli_kitap_local_v3';
function openPdfDB(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('indexeddb-unavailable'));return}
    const req=indexedDB.open(PDF_DB_NAME,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('pdfs'))req.result.createObjectStore('pdfs',{keyPath:'id'})};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('indexeddb-open-failed'));
    req.onblocked=()=>reject(new Error('indexeddb-blocked'));
  });
}
async function withPdfStore(mode,operation){
  const db=await openPdfDB();
  try{
    return await new Promise((resolve,reject)=>{
      let transaction;
      try{transaction=db.transaction('pdfs',mode)}catch(error){reject(error);return}
      const request=operation(transaction.objectStore('pdfs'));
      let result;
      request.onsuccess=()=>{result=request.result};
      transaction.oncomplete=()=>resolve(result);
      transaction.onerror=()=>reject(transaction.error||new Error('indexeddb-transaction-failed'));
      transaction.onabort=()=>reject(transaction.error||new Error('indexeddb-transaction-aborted'));
    });
  }finally{db.close()}
}
async function persistPdf(file,id){
  return withPdfStore('readwrite',store=>store.put({id,name:file.name,size:file.size,lastModified:file.lastModified,blob:file}));
}
async function savedPdf(id){return withPdfStore('readonly',store=>store.get(id))}
async function deleteStoredPdf(id){return withPdfStore('readwrite',store=>store.delete(id))}
async function openSavedBook(book){
  if(book.id===state.bookId&&state.pdf){setView('reader');return}
  toast('Kitabınız kütüphanenizden açılıyor...');
  try{
    const stored=await savedPdf(book.id);
    if(!stored?.blob){
      toast('Bu kitabın PDF dosyası eski sürümde saklanmamış. Dosyayı bir kez daha seçebilirsiniz.');
      el.pdfInput.click();return;
    }
    const file=new File([stored.blob],stored.name,{type:'application/pdf',lastModified:stored.lastModified});
    await handlePdfUpload(file,{fromSaved:true});
  }catch(error){
    console.error('Kaydedilmiş PDF açılamadı:',error);
    toast('Kaydedilen PDF açılamadı. Tarayıcı verileri temizlenmiş olabilir; dosyanızı yeniden ekleyebilirsiniz.');
  }
}
function resumeBook(){
  if(state.pdf){setView('reader');return}
  const book=getCurrentBook();
  if(book)void openSavedBook(book);else setView('library');
}
$('resume-btn').addEventListener('click',resumeBook);$('recent-book-btn').addEventListener('click',resumeBook);
function loadBooks(){try{const books=JSON.parse(getSafe('sk_v2_books')||'[]');return Array.isArray(books)?books:[]}catch{return []}}
function storeBooks(books){setSafe('sk_v2_books',JSON.stringify(books.slice(0,60)))}
function getCurrentBook(){return loadBooks()[0]||null}
function bookKey(file){return `${file.name}:${file.size}:${file.lastModified}`}
function saveProgress(){if(!state.bookId)return;const books=loadBooks();const index=books.findIndex(b=>b.id===state.bookId);if(index<0)return;books[index]={...books[index],page:state.currentPage,sentence:state.currentSentenceIndex,lastOpened:Date.now()};books.sort((a,b)=>b.lastOpened-a.lastOpened);storeBooks(books)}
async function deleteBook(book){
  if(!window.confirm(`“${book.name}” kitabını kütüphanenizden kaldırmak ister misiniz?\n\nKaydedilmiş PDF de bu cihazdan silinecektir. Bu işlem geri alınamaz.`))return;
  const removeButton=document.querySelector(`[data-delete-id="${CSS.escape(book.id)}"]`);
  if(removeButton)removeButton.disabled=true;
  try{
    await deleteStoredPdf(book.id);
    if(state.bookId===book.id){
      stopPlayback();++state.transition;
      const oldPdf=state.pdf;
      state.pdf=null;state.file=null;state.bookId=null;state.numPages=0;state.currentPage=0;state.sentences=[];state.currentSentenceIndex=0;state.pageTextCache.clear();
      if(oldPdf)await oldPdf.destroy().catch(()=>{});
      $('reader-book-title').textContent='Okuma Odası';
      el.pageIndicator.textContent='Sayfa - / -';
      el.textDisplay.textContent='Kitap kaldırıldı. Dilerseniz başka bir kitap seçebilirsiniz.';
      setView('library');
    }
    storeBooks(loadBooks().filter(item=>item.id!==book.id));
    renderLibrary();toast('Kitap ve kaydedilen PDF kaldırıldı.');
  }catch(error){
    console.error('Kitap silinemedi:',error);
    toast('Kitap silinemedi. Cihaz depolamasını kontrol ettikten sonra yeniden deneyebilirsiniz.');
    if(removeButton)removeButton.disabled=false;
  }
}
function renderLibrary(){
  const books=loadBooks();
  $('library-count').textContent=books.length?`${books.length} kitap`:'Henüz kitap eklenmedi';
  $('library-empty').hidden=books.length>0;
  const grid=$('library-items');grid.replaceChildren();
  books.forEach(book=>{
    const card=document.createElement('article');card.className='book-card';
    const art=document.createElement('div');art.className='book-art';art.setAttribute('aria-hidden','true');
    const title=document.createElement('h3');title.textContent=book.name;
    const meta=document.createElement('p');meta.textContent=book.page?`Kaldığınız sayfa: ${book.page}`:'Henüz okunmadı';
    const actions=document.createElement('div');actions.className='book-actions';
    const openButton=document.createElement('button');openButton.className='book-open';openButton.type='button';openButton.textContent='Kitabı aç';openButton.addEventListener('click',()=>void openSavedBook(book));
    const removeButton=document.createElement('button');removeButton.className='book-delete';removeButton.type='button';removeButton.dataset.deleteId=book.id;removeButton.textContent='Kaldır';removeButton.setAttribute('aria-label',`${book.name} kitabını kaldır`);removeButton.addEventListener('click',()=>void deleteBook(book));
    actions.append(openButton,removeButton);card.append(art,title,meta,actions);grid.append(card);
  });
  const recent=getCurrentBook();
  $('recent-book-caption').textContent=recent?`${recent.name} · Sayfa ${recent.page||1}`:'Henüz bir kitap eklenmemiş. Dilerseniz ilk kitabınızı ekleyebilirsiniz.';
  $('recent-book-btn').disabled=!recent;
  $('resume-btn').disabled=!recent&&!state.pdf;
} 
function loadSettings(){const rate=Number(getSafe('sk_rate')),pitch=Number(getSafe('sk_pitch'));if(Number.isFinite(rate)&&rate>=.5&&rate<=2)state.rate=rate;if(getSafe('sk_pitch')!==null&&Number.isFinite(pitch)&&pitch>=0&&pitch<=2)state.pitch=pitch;el.rateSlider.value=state.rate;el.pitchSlider.value=state.pitch;el.rateValue.textContent=state.rate.toFixed(1)+'x';el.pitchValue.textContent=state.pitch.toFixed(1)}
function populateVoiceList(){if(!canSpeak){el.voiceSelect.innerHTML='<option>Bu tarayıcı seslendirmeyi desteklemiyor</option>';return}const voices=speechSynthesis.getVoices();if(!voices.length)return;const sorted=[...voices].sort((a,b)=>Number(!a.lang.toLowerCase().startsWith('tr'))-Number(!b.lang.toLowerCase().startsWith('tr'))||a.name.localeCompare(b.name,'tr'));const selected=getSafe('sk_voice');el.voiceSelect.replaceChildren();sorted.forEach(v=>{const option=document.createElement('option');option.value=v.voiceURI;option.textContent=`${v.name} (${v.lang})`;el.voiceSelect.append(option)});state.voice=sorted.find(v=>v.voiceURI===selected)||sorted.find(v=>v.lang.toLowerCase().startsWith('tr'))||sorted[0];el.voiceSelect.value=state.voice.voiceURI}
async function acquireWakeLock(){try{if('wakeLock' in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request('screen')}catch(err){console.info('Wake lock alınamadı',err)}}
function releaseWakeLock(){if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}}
function invalidateSpeech(){state.speechToken++;if(canSpeak)speechSynthesis.cancel()}
function stopPlayback(){state.isPlaying=false;invalidateSpeech();releaseWakeLock();updatePlayButton();saveProgress()}
function updatePlayButton(){el.playPauseBtn.textContent=state.isPlaying?'Ⅱ Duraklat':'▶ Oku';el.playPauseBtn.setAttribute('aria-pressed',String(state.isPlaying))}
function splitSentences(text){const cleaned=text.replace(/\s+/g,' ').trim();if(!cleaned)return[];if('Segmenter' in Intl){try{return [...new Intl.Segmenter('tr',{granularity:'sentence'}).segment(cleaned)].map(v=>v.segment.trim()).filter(Boolean)}catch{}}return (cleaned.match(/[^.!?…]+[.!?…]*/g)||[cleaned]).map(s=>s.trim()).filter(Boolean)}
async function getPageText(num,pdf=state.pdf){if(state.pageTextCache.has(num))return state.pageTextCache.get(num);const page=await pdf.getPage(num);const content=await page.getTextContent();let text='';for(const item of content.items){if(!('str' in item))continue;const str=item.str||'';text+=str;if(item.hasEOL)text+='\n';else if(str&&!/\s$/.test(str))text+=' '}state.pageTextCache.set(num,text);return text}
function highlightSentence(idx){el.textDisplay.querySelectorAll('.sentence.active').forEach(n=>n.classList.remove('active'));const target=el.textDisplay.querySelector(`.sentence[data-idx="${idx}"]`);if(target){target.classList.add('active');target.scrollIntoView({block:'nearest',behavior:'smooth'})}}
function renderText(){el.textDisplay.replaceChildren();if(!state.sentences.length){const p=document.createElement('p');p.textContent='Bu sayfada seçilebilir metin bulunamadı. Taranmış PDF için OCR özelliği gereklidir.';el.textDisplay.append(p);return}const frag=document.createDocumentFragment();state.sentences.forEach((sentence,idx)=>{const span=document.createElement('span');span.className='sentence';span.dataset.idx=idx;span.textContent=sentence+' ';span.addEventListener('click',()=>{state.currentSentenceIndex=idx;highlightSentence(idx);saveProgress();if(state.isPlaying)speakCurrentSentence()});frag.append(span)});el.textDisplay.append(frag);highlightSentence(state.currentSentenceIndex)}
function updatePageIndicator(){el.pageIndicator.textContent=`Sayfa ${state.currentPage} / ${state.numPages}`;el.prevPageBtn.disabled=state.currentPage<=1;el.nextPageBtn.disabled=state.currentPage>=state.numPages}
async function goToPage(pageNum,{resumeSentence=0,continuePlaying=false}={}){if(!state.pdf||pageNum<1||pageNum>state.numPages)return;const request=++state.transition;invalidateSpeech();try{const text=await getPageText(pageNum);if(request!==state.transition)return;state.currentPage=pageNum;state.sentences=splitSentences(text);state.currentSentenceIndex=Math.min(Math.max(0,resumeSentence),Math.max(0,state.sentences.length-1));renderText();updatePageIndicator();saveProgress();if(continuePlaying&&state.isPlaying){if(state.sentences.length)speakCurrentSentence();else await onPageFinished()}else if(state.isPlaying){state.isPlaying=false;releaseWakeLock();updatePlayButton()}}catch(err){console.error(err);stopPlayback();toast('Bu PDF sayfasının metni okunamadı.');playerMessage('Sayfa okuma hatası.')}}
function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
function speakCurrentSentence(){if(!state.isPlaying||!canSpeak)return;invalidateSpeech();const token=state.speechToken;const sentence=state.sentences[state.currentSentenceIndex];if(!sentence){void onPageFinished();return}highlightSentence(state.currentSentenceIndex);saveProgress();const utterance=new SpeechSynthesisUtterance(sentence);utterance.lang=state.voice?.lang||'tr-TR';if(state.voice)utterance.voice=state.voice;utterance.rate=clamp(state.rate+(sentence.endsWith('?')?-.03:0),.5,2);utterance.pitch=clamp(state.pitch+(sentence.endsWith('?')?.10:0),0,2);utterance.onend=()=>{if(!state.isPlaying||token!==state.speechToken)return;state.currentSentenceIndex++;saveProgress();setTimeout(()=>{if(state.isPlaying&&token===state.speechToken)speakCurrentSentence()},220)};utterance.onerror=e=>{if(token!==state.speechToken||!state.isPlaying)return;if(e.error==='canceled'||e.error==='interrupted')return;console.error('Konuşma hatası:',e.error);stopPlayback();playerMessage('Seslendirme tamamlanamadı. Başka bir anlatıcı sesi seçerek yeniden deneyebilirsiniz.');toast('Seslendirme sorunu: '+(e.error||'bilinmeyen'))};speechSynthesis.speak(utterance);playerMessage(`Okunuyor · Sayfa ${state.currentPage} · Cümle ${state.currentSentenceIndex+1}/${state.sentences.length}`)}
async function onPageFinished(){if(!state.isPlaying)return;if(el.autoPageCheckbox.checked&&state.currentPage<state.numPages){await goToPage(state.currentPage+1,{continuePlaying:true})}else{stopPlayback();playerMessage('Bu sayfanın okuması tamamlandı.')}}
function startPlayback(){if(!state.pdf){toast('Öncelikle bir PDF ekleyebilirsiniz.');return}if(!canSpeak){toast('Bu tarayıcıda seslendirme kullanılamıyor.');return}if(!state.sentences.length){toast('Bu sayfada seslendirilebilecek bir metin bulunamadı.');return}state.isPlaying=true;updatePlayButton();void acquireWakeLock();speakCurrentSentence()}
function changeSentence(delta){if(!state.sentences.length)return;state.currentSentenceIndex=clamp(state.currentSentenceIndex+delta,0,state.sentences.length-1);highlightSentence(state.currentSentenceIndex);saveProgress();if(state.isPlaying)speakCurrentSentence()}
async function handlePdfUpload(file,{fromSaved=false}={}){
  if(!file)return;
  if(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'){toast('PDF biçiminde bir dosya seçebilirsiniz.');return}
  if(!window.pdfjsLib){toast('PDF okuyucu yüklenemedi. İnternet bağlantınızı kontrol edebilirsiniz.');return}
  stopPlayback();
  const openId=++state.transition;
  toast('Kitabınız açılıyor...');
  try{
    const buffer=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
    if(openId!==state.transition){await pdf.destroy();return}
    if(state.pdf)await state.pdf.destroy();
    state.pdf=pdf;state.file=file;state.bookId=bookKey(file);state.numPages=pdf.numPages;state.pageTextCache.clear();
    const books=loadBooks();
    const previous=books.find(b=>b.id===state.bookId);
    const keep=books.filter(b=>b.id!==state.bookId);
    keep.unshift({id:state.bookId,name:file.name.replace(/\.pdf$/i,''),page:previous?.page||1,sentence:previous?.sentence||0,lastOpened:Date.now()});
    storeBooks(keep);
    $('reader-book-title').textContent=file.name.replace(/\.pdf$/i,'');
    await goToPage(previous?.page||1,{resumeSentence:previous?.sentence||0});
    setView('reader');
    playerMessage('Eseriniz hazır. Dinlemek için Oku düğmesini kullanabilirsiniz.');
    if(!fromSaved){
      try{
        await persistPdf(file,state.bookId);
        toast('PDF kütüphanenize kaydedildi. Daha sonra yeniden seçmeden açabilirsiniz.');
      }catch(storageError){
        console.warn('PDF saklanamadı:',storageError);
        toast('PDF açıldı ancak cihazınıza kaydedilemedi. Depolama alanını ve gizli gezinme ayarlarını kontrol edebilirsiniz.');
      }
    }else toast('Kitap kaldığınız yerden açıldı.');
  }catch(err){console.error(err);toast('PDF açılamadı. Dosyanın bozuk veya şifreli olup olmadığını kontrol edebilirsiniz.')}
}
el.pdfInput.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)void handlePdfUpload(file);el.pdfInput.value=''});
el.playPauseBtn.addEventListener('click',()=>state.isPlaying?stopPlayback():startPlayback());el.prevSentenceBtn.addEventListener('click',()=>changeSentence(-1));el.nextSentenceBtn.addEventListener('click',()=>changeSentence(1));el.prevPageBtn.addEventListener('click',()=>{void goToPage(state.currentPage-1,{continuePlaying:state.isPlaying})});el.nextPageBtn.addEventListener('click',()=>{void goToPage(state.currentPage+1,{continuePlaying:state.isPlaying})});
el.rateSlider.addEventListener('input',()=>{state.rate=Number(el.rateSlider.value);el.rateValue.textContent=state.rate.toFixed(1)+'x';setSafe('sk_rate',state.rate);if(state.isPlaying)speakCurrentSentence()});el.pitchSlider.addEventListener('input',()=>{state.pitch=Number(el.pitchSlider.value);el.pitchValue.textContent=state.pitch.toFixed(1);setSafe('sk_pitch',state.pitch);if(state.isPlaying)speakCurrentSentence()});el.voiceSelect.addEventListener('change',()=>{state.voice=canSpeak?speechSynthesis.getVoices().find(v=>v.voiceURI===el.voiceSelect.value)||null:null;if(state.voice)setSafe('sk_voice',state.voice.voiceURI);if(state.isPlaying)speakCurrentSentence()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.isPlaying)void acquireWakeLock()});window.addEventListener('pagehide',()=>saveProgress());loadSettings();populateVoiceList();if(canSpeak&&'onvoiceschanged' in speechSynthesis)speechSynthesis.onvoiceschanged=populateVoiceList;renderLibrary();updatePlayButton();
