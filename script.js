const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
// mobile nav
const menuBtn=document.querySelector('.menu-toggle');const nav=document.querySelector('.site-nav');
if(menuBtn&&nav){menuBtn.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(open));});}

// simple contact feedback
const form=document.getElementById('contactForm');const msg=document.getElementById('formMessage');
if(form){form.addEventListener('submit',(e)=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());setTimeout(()=>{msg.textContent=`Bedankt, ${data.name||'bezoeker'}! We nemen spoedig contact met u op.`;form.reset();},350);});}

// offerte modal
const offerteModal=document.getElementById('offerteModal');
const openBtns=document.querySelectorAll('[data-open-offerte]');
const closeEls=document.querySelectorAll('[data-close-offerte], .modal__close');

openBtns.forEach(b=>b.addEventListener('click', (e)=>{ e.preventDefault(); if(offerteModal){offerteModal.setAttribute('aria-hidden','false');}}));
closeEls.forEach(el=>el.addEventListener('click', ()=>{ if(offerteModal){offerteModal.setAttribute('aria-hidden','true');}}));
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && offerteModal){offerteModal.setAttribute('aria-hidden','true');}});

// offerte form feedback
const offerteForm=document.getElementById('offerteForm');const offerteMsg=document.getElementById('offerteMsg');
if(offerteForm){offerteForm.addEventListener('submit',(e)=>{e.preventDefault();const data=Object.fromEntries(new FormData(offerteForm).entries());setTimeout(()=>{offerteMsg.textContent='Bedankt! We sturen zo snel mogelijk een voorstel.';offerteForm.reset();},350);});}
